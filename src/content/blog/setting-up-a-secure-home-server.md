---
title: "Setting Up a Secure Home Server with HAProxy & CrowdSec"
date: "2026-06-01"
description: "Learn how to deploy a secure local homelab, including HAProxy reverse proxy, Let's Encrypt SSL automation, Cloudflare Tunnels, and CrowdSec intrusion prevention."
---

## Introduction — Why Self-Host Without Exposing WAN Ports?

Self-hosting gives you full control over your data, your uptime, and your privacy. But the moment you open a port on your router, you hand the entire internet an invitation to probe your services. Brute-force SSH bots, HTTP scanners, and automated exploit kits will find you within minutes — not hours.

My homelab solves this with a simple principle: **zero open inbound ports on the WAN**. All external traffic enters through a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) — an outbound-only, encrypted connection from my server to Cloudflare's edge. Cloudflare authenticates and proxies incoming requests, which then flow through the tunnel to HAProxy inside my network. My router's NAT table is completely clean.

Combined with proper VLAN segmentation, Technitium DNS for internal name resolution, Authentik for SSO, and CrowdSec for behavioral intrusion prevention, this stack is both highly available and genuinely hardened against real-world threats.

This post is a full walkthrough of what I actually run in production. Real IPs, real configs, real commands.

---

## Architecture Overview

Here is the full picture before we dive into individual components:

```
Internet
   │
   ▼ (Cloudflare proxied DNS / Zero Trust)
Cloudflare Edge
   │ (outbound tunnel, mTLS)
   ▼
[ cf-tunnel LXC — 10.0.30.2 ]
   cloudflared daemon
   │
   ▼ (internal HTTP to HAProxy)
[ haproxy-edge LXC — 10.0.30.3 ]
   HAProxy 2.8 — SSL termination, routing
   │             │
   │             ▼
   │     [ docker-host VM — 10.0.30.5 ]
   │       Portainer EE → all app stacks
   │       Authentik, Immich, Jellyfin,
   │       ArrSuite, Homepage, Portfolio…
   │
   ▼
[ nas-storage — 10.0.30.6 ]   (Ugreen DH2300 / Debian 12)
  NFS: /volume1/Docker mounted at /mnt/nas on docker-host
  NFS: /volume1/Backups, /volume1/Proxmox VE
```

### Network Topology — MikroTik RB450Gx4

The entire homelab runs behind a **MikroTik RB450Gx4** (`router-edge`) with five VLANs providing strong isolation between trust zones:

| VLAN | Name | Subnet | Purpose |
|---|---|---|---|
| 10 | `USER` | `10.0.10.0/24` | Trusted PCs and workstations |
| 20 | `IOT` | `10.0.20.0/24` | Smart home devices, strictly isolated |
| 30 | `SERVER` | `10.0.30.0/24` | All homelab servers |
| 40 | `GUEST` | `10.0.40.0/24` | Guest devices, isolated |
| 99 | `MGMT` | `10.0.99.0/24` | Proxmox management, Tailscale VPN |

Inter-VLAN firewall rules block lateral movement by default. The `SERVER` VLAN (`10.0.30.0/24`) is where all the action happens and is never directly reachable from `IOT` or `GUEST`.

### Proxmox VE Node Inventory

All containers and VMs run on a single Proxmox VE host with these LXCs and VMs:

| CT/VM ID | Hostname | Type | IP | Role |
|---|---|---|---|---|
| 100 | `cf-tunnel` | LXC | `10.0.30.2` | Cloudflare Tunnel daemon |
| 101 | `haproxy-edge` | LXC | `10.0.30.3` | HAProxy reverse proxy + SSL |
| 102 | `dns-server` | LXC | `10.0.30.4` | Technitium DNS + ad-blocker |
| 103 | `vpn-node` | LXC | `10.0.99.3` | Tailscale mesh VPN (remote admin) |
| 104 | `docker-host` | VM | `10.0.30.5` | Docker Engine + Portainer EE LTS |

---

## Step 1: Proxmox VE Setup — VM and LXC Planning

### Base Installation

Download the latest Proxmox VE ISO from [proxmox.com/downloads](https://www.proxmox.com/en/downloads), flash to USB, and install. After first boot, swap out the enterprise repo for the no-subscription one:

```bash
# Remove enterprise repo
rm /etc/apt/sources.list.d/pve-enterprise.list

# Add no-subscription repo
echo "deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription" \
  > /etc/apt/sources.list.d/pve-install-repo.list

apt update && apt dist-upgrade -y
reboot
```

### Creating LXC Containers

Download a Debian 12 template first:

```bash
pveam update
pveam download local debian-12-standard_12.7-1_amd64.tar.zst
```

Create the HAProxy LXC (`haproxy-edge`):

```bash
pct create 101 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname haproxy-edge \
  --cores 2 \
  --memory 512 \
  --rootfs local-lvm:8 \
  --net0 name=eth0,bridge=vmbr0,tag=30,ip=10.0.30.3/24,gw=10.0.30.1 \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1 \
  --start 1
```

Note the `tag=30` — this places the LXC on VLAN 30 (`SERVER`). Repeat similarly for `cf-tunnel` (`tag=30`, IP `10.0.30.2`) and `dns-server` (`tag=30`, IP `10.0.30.4`). The `vpn-node` LXC goes on VLAN 99 (`MGMT`).

For `docker-host`, create a full VM (VMs handle Docker's network namespaces much better than LXCs):

```bash
# From Proxmox UI: create VM with Debian 12 ISO
# Settings: 4 vCPU, 8 GB RAM, 50 GB virtio-scsi disk
# Network: vmbr0, VLAN tag 30
```

### Resource Allocation Summary

| Node | vCPU | RAM | Disk |
|---|---|---|---|
| `haproxy-edge` | 2 | 512 MB | 8 GB |
| `cf-tunnel` | 1 | 256 MB | 4 GB |
| `dns-server` | 1 | 256 MB | 4 GB |
| `vpn-node` | 1 | 128 MB | 4 GB |
| `docker-host` (VM) | 4 | 8 GB | 50 GB |

---

## Step 2: HAProxy Configuration — SSL Termination and Routing

### Install HAProxy 2.8 LTS

```bash
# On haproxy-edge
apt update && apt install -y curl gnupg

curl -fsSL https://haproxy.debian.net/bernat.debian.org.gpg | \
  gpg --dearmor -o /usr/share/keyrings/haproxy.debian.net.gpg

echo "deb [signed-by=/usr/share/keyrings/haproxy.debian.net.gpg] \
  http://haproxy.debian.net bookworm-backports-2.8 main" \
  > /etc/apt/sources.list.d/haproxy.list

apt update && apt install -y haproxy=2.8.\*
haproxy -v   # confirm version
```

### SSL Certificate Automation — Let's Encrypt DNS-01 via Cloudflare

Because there are no open inbound ports, HTTP-01 challenge is not an option. The DNS-01 challenge via the Cloudflare API works perfectly and even supports wildcard certificates.

```bash
apt install -y certbot python3-certbot-dns-cloudflare

# Narrow-scoped API token: Zone → DNS → Edit, for alkamfrz.id only
mkdir -p /etc/letsencrypt/cf
cat > /etc/letsencrypt/cf/credentials.ini <<EOF
dns_cloudflare_api_token = YOUR_CF_DNS_EDIT_TOKEN
EOF
chmod 600 /etc/letsencrypt/cf/credentials.ini

# Issue wildcard certificate
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cf/credentials.ini \
  -d "*.alkamfrz.id" \
  -d "alkamfrz.id" \
  --non-interactive \
  --agree-tos \
  -m admin@alkamfrz.id
```

HAProxy requires the cert and key in a single `.pem` file. The deploy hook (`haproxy-reload-hook.sh`) handles this automatically on renewal:

```bash
# /etc/letsencrypt/renewal-hooks/deploy/haproxy-reload-hook.sh
#!/bin/bash
set -euo pipefail

DOMAIN="alkamfrz.id"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
PEM_DIR="/etc/ssl/haproxy"
PEM_PATH="${PEM_DIR}/${DOMAIN}.pem"

mkdir -p "${PEM_DIR}"
cat "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/privkey.pem" > "${PEM_PATH}"
chmod 600 "${PEM_PATH}"

# Validate and reload
haproxy -c -f /etc/haproxy/haproxy.cfg && systemctl reload haproxy
echo "[$(date)] HAProxy reloaded with renewed cert for ${DOMAIN}"
```

```bash
chmod +x /etc/letsencrypt/renewal-hooks/deploy/haproxy-reload-hook.sh
# Run it once to generate the initial PEM
bash /etc/letsencrypt/renewal-hooks/deploy/haproxy-reload-hook.sh
```

The same script also SCPs a `.pfx` version to Technitium so its admin UI also gets a valid cert — that part is handled by `technitium-dns-cert-manager.sh` which runs after each renewal.

### `/etc/haproxy/haproxy.cfg`

```haproxy
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # TLS hardening — TLS 1.2 minimum, strong cipher suites
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets
    tune.ssl.default-dh-param 2048

    # CrowdSec Lua bouncer
    lua-prepend-path /usr/lib/crowdsec/lua/haproxy/?.lua
    lua-load /usr/lib/crowdsec/lua/haproxy/crowdsec.lua

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  forwardfor
    option  http-server-close
    timeout connect  5s
    timeout client  30s
    timeout server  30s
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http

# ─── Prometheus metrics endpoint ──────────────────────────────────────────────
frontend prometheus
    bind *:8405
    http-request use-service prometheus-exporter if { path /metrics }
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:changeme

# ─── Frontend: HTTP → HTTPS redirect ─────────────────────────────────────────
frontend fe_http
    bind *:80
    redirect scheme https code 301 if !{ ssl_fc }

# ─── Frontend: HTTPS main ─────────────────────────────────────────────────────
frontend fe_https
    bind *:443 ssl crt /etc/ssl/haproxy/ alpn h2,http/1.1

    # CrowdSec bouncer — check before anything else
    http-request lua.crowdsec_allow
    http-request deny deny_status 403 if { var(txn.crowdsec.action) -m str "ban" }

    # Security headers
    http-response set-header X-Frame-Options SAMEORIGIN
    http-response set-header X-Content-Type-Options nosniff
    http-response set-header Referrer-Policy strict-origin-when-cross-origin
    http-response set-header Permissions-Policy "geolocation=(), microphone=(), camera=()"
    http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains"

    # ── ACLs ────────────────────────────────────────────────────────────────
    acl host_root         hdr(host) -i alkamfrz.id
    acl host_home         hdr(host) -i home.alkamfrz.id
    acl host_authentik    hdr(host) -i authentik.alkamfrz.id
    acl host_portainer    hdr(host) -i portainer.alkamfrz.id
    acl host_immich       hdr(host) -i immich.alkamfrz.id
    acl host_jellyfin     hdr(host) -i media.alkamfrz.id
    acl host_seerr        hdr(host) -i request.alkamfrz.id
    acl host_pve          hdr(host) -i pve-node.alkamfrz.id

    # ── Routing ─────────────────────────────────────────────────────────────
    use_backend be_portfolio   if host_root
    use_backend be_homepage    if host_home
    use_backend be_authentik   if host_authentik
    use_backend be_portainer   if host_portainer
    use_backend be_immich      if host_immich
    use_backend be_jellyfin    if host_jellyfin
    use_backend be_seerr       if host_seerr
    use_backend be_pve         if host_pve

    default_backend be_default

# ─── Backends ─────────────────────────────────────────────────────────────────
backend be_portfolio
    option httpchk GET /
    server docker-host 10.0.30.5:8085 check inter 10s

backend be_homepage
    option httpchk GET /
    server docker-host 10.0.30.5:8082 check inter 10s

backend be_authentik
    # Authentik uses Uvicorn (ASGI) — use TCP health check, not HTTP
    option tcp-check
    server docker-host 10.0.30.5:9000 check inter 10s

backend be_portainer
    option httpchk GET /api/status
    server docker-host 10.0.30.5:9443 check inter 10s ssl verify none

backend be_immich
    # Long timeout for video uploads
    timeout server 300s
    option httpchk GET /api/server-info/ping
    server docker-host 10.0.30.5:2283 check inter 15s

backend be_jellyfin
    option httpchk GET /health
    server docker-host 10.0.30.5:8096 check inter 15s

backend be_seerr
    option httpchk GET /api/v1/status
    server docker-host 10.0.30.5:5055 check inter 10s

backend be_pve
    # Proxmox uses its own self-signed cert internally
    option tcp-check
    server pve-host 10.0.99.2:8006 check inter 30s ssl verify none

backend be_default
    errorfile 503 /etc/haproxy/errors/503.http
```

Enable and reload:

```bash
haproxy -c -f /etc/haproxy/haproxy.cfg   # always validate first
systemctl enable --now haproxy
```

---

## Step 3: Cloudflare Tunnel Setup — Outbound-Only Ingress

### Why Cloudflare Tunnel?

`cloudflared` opens a persistent, outbound-only TLS connection from `cf-tunnel` to Cloudflare's edge. Cloudflare terminates the public HTTPS session, applies any Zero Trust policies you configure, then forwards traffic through the tunnel to HAProxy at `10.0.30.3`. Your MikroTik router never needs a single port-forward rule.

### Install `cloudflared` on `cf-tunnel`

```bash
# On cf-tunnel (10.0.30.2)
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | gpg --dearmor > /usr/share/keyrings/cloudflare-main.gpg

echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \
  https://pkg.cloudflare.com/cloudflared bookworm main" \
  > /etc/apt/sources.list.d/cloudflared.list

apt update && apt install -y cloudflared
cloudflared --version
```

### Authenticate and Create the Tunnel

```bash
cloudflared tunnel login          # opens browser — authorize your zone
cloudflared tunnel create cf-tunnel # creates ~/.cloudflared/<UUID>.json
```

Note the UUID printed. Create the tunnel config:

```bash
mkdir -p /etc/cloudflared

cat > /etc/cloudflared/config.yml <<EOF
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: /root/.cloudflared/<YOUR-TUNNEL-UUID>.json

ingress:
  # All traffic hits HAProxy for routing decisions
  - hostname: "*.alkamfrz.id"
    service: https://10.0.30.3:443
    originRequest:
      noTLSVerify: true   # HAProxy cert is internal; Cloudflare handles public TLS

  - hostname: "alkamfrz.id"
    service: https://10.0.30.3:443
    originRequest:
      noTLSVerify: true

  # Catch-all (required by cloudflared)
  - service: http_status:404
EOF
```

### Create DNS CNAME Records

```bash
cloudflared tunnel route dns cf-tunnel "*.alkamfrz.id"
cloudflared tunnel route dns cf-tunnel "alkamfrz.id"
```

This creates `CNAME` records pointing to `<UUID>.cfargotunnel.com` — Cloudflare handles the rest.

### Run as systemd Service

```bash
cloudflared service install
systemctl enable --now cloudflared
journalctl -u cloudflared -f   # watch for "Connection established" messages
```

---

## Step 4: Technitium DNS — Internal Domain Resolution

### The Problem with Public DNS Alone

The public `*.alkamfrz.id` DNS records point to Cloudflare's anycast IPs (via CNAME to the tunnel). When a client on my LAN (`10.0.10.x`) requests `immich.alkamfrz.id`, I want it to resolve to `10.0.30.3` (HAProxy) directly — not go out to Cloudflare and back. This reduces latency, keeps media traffic off the WAN, and avoids Cloudflare's bandwidth limits for self-hosted media.

**Technitium DNS** (`dns-server` at `10.0.30.4`) runs as an authoritative resolver for `alkamfrz.id` internally, plus doubles as an ad-blocking DNS-over-HTTPS resolver for the whole LAN.

### Install Technitium

```bash
# On dns-server LXC (Debian 12)
apt update && apt install -y curl libicu72

# Technitium provides a one-line installer
curl -fsSL https://download.technitium.com/dns/install.sh | bash
```

Access the web UI at `http://10.0.30.4:5380`.

### Create the Internal Zone

1. **Zones** → **Add Zone** → Name: `alkamfrz.id`, Type: **Primary Zone**
2. Add these records:

| Name | Type | Value |
|---|---|---|
| `@` | A | `10.0.30.3` |
| `*` | A | `10.0.30.3` |
| `pve-node` | A | `10.0.99.2` |

The wildcard `*` record sends all subdomain lookups to HAProxy, which then routes based on the `Host` header. This is the clean separation that makes adding new services trivial — just add an HAProxy backend, no DNS change needed.

### Configure MikroTik DHCP to Use Technitium

On the MikroTik (`router-edge`), update the DHCP server for each VLAN that should use internal DNS:

```routeros
# MikroTik RouterOS — set DNS server for SERVER VLAN DHCP
/ip dhcp-server network
set [find address="10.0.30.0/24"] dns-server=10.0.30.4

# USER VLAN
set [find address="10.0.10.0/24"] dns-server=10.0.30.4
```

### Enable SSL on Technitium Admin UI

After each Let's Encrypt renewal on `haproxy-edge`, the `technitium-dns-cert-manager.sh` script exports a `.pfx` and SCPs it to `dns-server`:

```bash
#!/bin/bash
# technitium-dns-cert-manager.sh — runs from haproxy-edge after cert renewal

DOMAIN="alkamfrz.id"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
PFX_PATH="/tmp/${DOMAIN}.pfx"
TECH_HOST="10.0.30.4"
TECH_KEY="/root/.ssh/id_ed25519_homelab"

# Export to PFX (Technitium format)
openssl pkcs12 -export \
  -in "${CERT_DIR}/fullchain.pem" \
  -inkey "${CERT_DIR}/privkey.pem" \
  -out "${PFX_PATH}" \
  -passout pass:""

# SCP to Technitium and set via API
scp -i "${TECH_KEY}" "${PFX_PATH}" "root@${TECH_HOST}:/etc/dns/cert.pfx"
ssh -i "${TECH_KEY}" "root@${TECH_HOST}" \
  "curl -s -X POST http://localhost:5380/api/settings/set \
   -d 'token=TECH_API_TOKEN&enableDnsOverHttps=true&tlsCertificatePath=/etc/dns/cert.pfx'"

rm -f "${PFX_PATH}"
echo "[$(date)] Technitium cert updated."
```

---

## Step 5: Docker Compose Stacks — Modular Service Management

### Structure on `docker-host`

**Portainer EE LTS** runs on `docker-host` (`10.0.30.5`) as the management layer. All other services are deployed as Compose stacks, organized by function:

```
/opt/stacks/
├── core/         # Authentik (SSO), Portainer agent
├── monitoring/   # Prometheus, Grafana, node-exporter, Uptime Kuma
├── media/        # Jellyfin, Immich, Seerr, ArrSuite, qBittorrent
├── productivity/ # Homepage, Vaultwarden
└── system/       # CrowdSec, Watchtower
```

### Shared Docker Network

```bash
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  homelab
```

All Compose files reference this external network so services can communicate directly by container name.

### NFS Volume Helper

Since almost all persistent data lives on `nas-storage` (`10.0.30.6`), I define a reusable NFS volume pattern. The NFS share `10.0.30.6:/volume1/Docker` is mounted at `/mnt/nas` on `docker-host` via `/etc/fstab`:

```
10.0.30.6:/volume1/Docker  /mnt/nas  nfs4  defaults,_netdev,auto,nfsvers=4  0 0
```

Verify:

```bash
mount -a
df -h /mnt/nas   # should show the NAS share
```

### Example: Authentik SSO Stack

Authentik acts as the central Identity Provider (IdP) for the homelab. Services like Portainer, Grafana, and Immich can delegate authentication to it via OIDC or LDAP.

```yaml
# /opt/stacks/core/docker-compose.yml
version: "3.9"

networks:
  homelab:
    external: true

volumes:
  authentik_db:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/nas/authentik/db
  authentik_media:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/nas/authentik/media
  authentik_certs:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/nas/authentik/certs

services:
  authentik_db:
    image: postgres:16-alpine
    container_name: authentik_db
    restart: unless-stopped
    networks:
      - homelab
    environment:
      POSTGRES_USER: authentik
      POSTGRES_PASSWORD: "${AUTHENTIK_DB_PASSWORD}"
      POSTGRES_DB: authentik
    volumes:
      - authentik_db:/var/lib/postgresql/data

  authentik_valkey:
    image: valkey/valkey:8-alpine
    container_name: authentik_valkey
    restart: unless-stopped
    networks:
      - homelab
    command: valkey-server --save 60 1 --loglevel warning

  authentik_server:
    image: ghcr.io/goauthentik/server:latest
    container_name: authentik_server
    restart: unless-stopped
    networks:
      - homelab
    command: server
    environment:
      AUTHENTIK_REDIS__HOST: authentik_valkey
      AUTHENTIK_POSTGRESQL__HOST: authentik_db
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: "${AUTHENTIK_DB_PASSWORD}"
      AUTHENTIK_SECRET_KEY: "${AUTHENTIK_SECRET_KEY}"
    volumes:
      - authentik_media:/media
      - authentik_certs:/certs
    ports:
      - "9000:9000"
    depends_on:
      - authentik_db
      - authentik_valkey

  authentik_worker:
    image: ghcr.io/goauthentik/server:latest
    container_name: authentik_worker
    restart: unless-stopped
    networks:
      - homelab
    command: worker
    user: root
    environment:
      AUTHENTIK_REDIS__HOST: authentik_valkey
      AUTHENTIK_POSTGRESQL__HOST: authentik_db
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: "${AUTHENTIK_DB_PASSWORD}"
      AUTHENTIK_SECRET_KEY: "${AUTHENTIK_SECRET_KEY}"
    volumes:
      - authentik_media:/media
      - authentik_certs:/certs
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - authentik_db
      - authentik_valkey
```

### Example: Media Stack (Arr Suite)

```yaml
# /opt/stacks/media/docker-compose.yml (excerpt)
version: "3.9"

networks:
  homelab:
    external: true

services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: jellyfin
    restart: unless-stopped
    networks:
      - homelab
    environment:
      JELLYFIN_DATA_DIR: /data
    volumes:
      - /mnt/nas/jellyfin/config:/config
      - /mnt/nas/media/movies:/media/movies:ro
      - /mnt/nas/media/series:/media/series:ro
    ports:
      - "8096:8096"

  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: radarr
    restart: unless-stopped
    networks:
      - homelab
    environment:
      PUID: 1000
      PGID: 1000
      TZ: Asia/Jakarta
    volumes:
      - /mnt/nas/radarr/config:/config
      - /mnt/nas/media/movies:/movies
      - /mnt/nas/downloads:/downloads
    ports:
      - "7878:7878"

  prowlarr:
    image: lscr.io/linuxserver/prowlarr:latest
    container_name: prowlarr
    restart: unless-stopped
    networks:
      - homelab
    environment:
      PUID: 1000
      PGID: 1000
      TZ: Asia/Jakarta
    volumes:
      - /mnt/nas/prowlarr/config:/config
    ports:
      - "9696:9696"

  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    container_name: qbittorrent
    restart: unless-stopped
    networks:
      - homelab
    environment:
      PUID: 1000
      PGID: 1000
      TZ: Asia/Jakarta
      WEBUI_PORT: 8089
    volumes:
      - /mnt/nas/qbittorrent/config:/config
      - /mnt/nas/downloads:/downloads
    ports:
      - "8089:8089"
```

### Domain-to-Port Reference

| Domain | Service | Port |
|---|---|---|
| `alkamfrz.id` | Portfolio (this site) | `8085` |
| `authentik.alkamfrz.id` | Authentik SSO | `9000` |
| `immich.alkamfrz.id` | Immich Photos | `2283` |
| `home.alkamfrz.id` | Homepage Dashboard | `8082` |
| `media.alkamfrz.id` | Jellyfin | `8096` |
| `request.alkamfrz.id` | Seerr | `5055` |
| `pve-node.alkamfrz.id` | Proxmox VE UI | `8006` |

---

## Step 6: NFS Storage with Ugreen NAS DH2300

### `nas-storage` Hardware and OS

`nas-storage` (`10.0.30.6`) is an **Ugreen NAS DH2300** running **Debian GNU/Linux 12 (Bookworm)** — not a NAS-specific OS like TrueNAS. Running plain Debian gives full control over the software stack without any vendor lock-in.

NFS shares configured on `nas-storage`:

| Share Path | Purpose |
|---|---|
| `/volume1/Docker` | All Docker service data (mounted at `/mnt/nas` on `docker-host`) |
| `/volume1/Backups` | Backup targets (Proxmox Backup Server, Restic) |
| `/volume1/Proxmox VE` | Proxmox VM/LXC backup storage |

### Configure NFS on `nas-storage`

```bash
# On nas-storage (10.0.30.6)
apt install -y nfs-kernel-server

# Create the NFS export
mkdir -p /volume1/Docker

# /etc/exports
/volume1/Docker  10.0.30.5(rw,sync,no_subtree_check,no_root_squash)
/volume1/Backups 10.0.30.0/24(rw,sync,no_subtree_check,no_root_squash)

# Apply exports
exportfs -arv
systemctl enable --now nfs-kernel-server
```

### Mount on `docker-host`

```bash
# On docker-host
apt install -y nfs-common

# Add to /etc/fstab for persistent mounting
echo "10.0.30.6:/volume1/Docker  /mnt/nas  nfs4  defaults,_netdev,auto,nfsvers=4  0 0" \
  >> /etc/fstab

mount -a
df -h /mnt/nas   # confirm mount
```

Create service directories:

```bash
mkdir -p /mnt/nas/{authentik,jellyfin,radarr,prowlarr,qbittorrent,immich,grafana,prometheus}
mkdir -p /mnt/nas/media/{movies,series}
mkdir -p /mnt/nas/downloads
```

### Backup Strategy

I run **Proxmox Backup Server** as a VM pointing to `/volume1/Backups` on nas-storage. Each LXC and VM gets a daily backup job with 7-day retention. For Docker service data on `/volume1/Docker`, a nightly Restic job deduplicates and compresses to an S3-compatible bucket.

---

## Step 7: CrowdSec Integration — Behavioral Intrusion Prevention

CrowdSec is a collaborative, open-source IPS that goes beyond simple fail2ban IP counting. It understands HTTP semantics — detecting credential stuffing, path scanning, exploit probing — and shares threat intelligence across its entire user community. Attackers banned on other users' servers are automatically blocked on yours.

### Architecture: Syslog UDP to CrowdSec Container

Rather than installing CrowdSec directly on `haproxy-edge`, I run it as a Docker container on `docker-host`. HAProxy on `haproxy-edge` ships its logs to CrowdSec via **UDP syslog on port 5514**:

```
haproxy-edge:10.0.30.3 ──(UDP syslog:5514)──► CrowdSec container:10.0.30.5
                                               │ (decisions via LAPI)
                                               ▼
                                         HAProxy Lua bouncer
                                         (runs on haproxy-edge, queries LAPI)
```

### Configure HAProxy Syslog to Send to CrowdSec

In `haproxy.cfg` global section, add a second syslog target:

```haproxy
global
    log /dev/log local0
    # Ship access logs to CrowdSec container over UDP syslog
    log 10.0.30.5:5514 local1 info
    ...
```

This means HAProxy duplicates its access log: one copy to the local socket (for rsyslog/file), one copy to CrowdSec's syslog listener.

### CrowdSec Docker Compose

```yaml
# /opt/stacks/system/docker-compose.yml (CrowdSec excerpt)
services:
  crowdsec:
    image: crowdsecurity/crowdsec:latest
    container_name: crowdsec
    restart: unless-stopped
    networks:
      - homelab
    environment:
      GID: "1000"
      COLLECTIONS: "crowdsecurity/haproxy crowdsecurity/linux"
    ports:
      - "8080:8080"      # LAPI (Local API — bouncer queries here)
      - "5514:5514/udp"  # Syslog ingestion from HAProxy
    volumes:
      - /mnt/nas/CrowdSec/config:/etc/crowdsec
      - /data/arr-db/crowdsec_data:/var/lib/crowdsec/data
```

Configure the acquisition (`/mnt/nas/CrowdSec/config/acquis.yaml`):

```yaml
source: syslog
listen_addr: 0.0.0.0
listen_port: 5514
labels:
  type: haproxy
---
filenames:
  - /var/log/auth.log
labels:
  type: syslog
```

### Install the HAProxy Lua Bouncer on `haproxy-edge`

```bash
# On haproxy-edge
apt install -y crowdsec-haproxy-bouncer
```

Configure `/etc/crowdsec/bouncers/crowdsec-haproxy-bouncer.conf`:

```ini
# Point to CrowdSec LAPI on docker-host
API_URL = http://10.0.30.5:8080
API_KEY = <generate with: docker exec crowdsec cscli bouncers add haproxy-bouncer>
CACHE_EXPIRATION = 1
CACHE_SIZE = 5000
```

Generate the API key:

```bash
docker exec crowdsec cscli bouncers add haproxy-bouncer
# Copy the printed key into the config above
```

The HAProxy `global` and `fe_https` sections we already configured handle the rest:

```haproxy
# global:
lua-prepend-path /usr/lib/crowdsec/lua/haproxy/?.lua
lua-load /usr/lib/crowdsec/lua/haproxy/crowdsec.lua

# fe_https:
http-request lua.crowdsec_allow
http-request deny deny_status 403 if { var(txn.crowdsec.action) -m str "ban" }
```

### Verify CrowdSec is Working

```bash
docker exec crowdsec cscli decisions list    # current bans
docker exec crowdsec cscli alerts list       # triggered alerts
docker exec crowdsec cscli metrics           # parser/scenario stats

# Test a manual ban
docker exec crowdsec cscli decisions add --ip 1.2.3.4 --duration 1h --reason "test"
docker exec crowdsec cscli decisions list
# Requests from 1.2.3.4 to HAProxy should now return 403
```

Keep scenarios up to date:

```bash
docker exec crowdsec cscli hub update
docker exec crowdsec cscli hub upgrade
```

Enroll in the community blocklist at [app.crowdsec.net](https://app.crowdsec.net) for access to the shared threat intelligence feed — this alone blocks thousands of known-bad IPs before they ever generate a single log line.

---

## Step 8: Automated Deployment with PowerShell — `deploy-configs.ps1`

Managing config files across five LXC/VM nodes manually is error-prone and slow. My Windows workstation holds the canonical configs in a Git repository. The `deploy-configs.ps1` script uses `scp` and `ssh` to push changes and trigger service reloads in one command.

### The Script

```powershell
# deploy-configs.ps1
param(
    [switch]$DryRun,
    [ValidateSet("all", "haproxy", "crowdsec", "docker", "dns")]
    [string]$Target = "all"
)

$SSH_KEY    = "$env:USERPROFILE\.ssh\id_ed25519_homelab"
$HAPROXY    = "10.0.30.3"
$DOCKER     = "10.0.30.5"
$DNS        = "10.0.30.4"

# ── Helper: run SSH command ───────────────────────────────────────────────────
function Invoke-SSH {
    param(
        [string]$HostIP,
        [string]$Command,
        [string]$User = "root"
    )
    $sshArgs = @(
        "-i", $SSH_KEY,
        "-o", "StrictHostKeyChecking=no",
        "-o", "BatchMode=yes",
        "$User@$HostIP",
        $Command
    )
    if ($DryRun) {
        Write-Host "  [DRY-RUN] SSH $User@${HostIP}: $Command" -ForegroundColor Cyan
    } else {
        $result = & ssh @sshArgs
        if ($LASTEXITCODE -ne 0) { throw "SSH failed on $HostIP : $Command" }
        $result
    }
}

# ── Helper: SCP file to remote ────────────────────────────────────────────────
function Send-File {
    param(
        [string]$LocalPath,
        [string]$RemoteHost,
        [string]$RemotePath,
        [string]$User = "root"
    )
    $dest = "${User}@${RemoteHost}:${RemotePath}"
    $scpArgs = @("-i", $SSH_KEY, "-o", "StrictHostKeyChecking=no", $LocalPath, $dest)
    if ($DryRun) {
        Write-Host "  [DRY-RUN] SCP $LocalPath → $dest" -ForegroundColor Cyan
    } else {
        & scp @scpArgs
        if ($LASTEXITCODE -ne 0) { throw "SCP failed: $LocalPath → $dest" }
    }
}

# ── Deploy: HAProxy ───────────────────────────────────────────────────────────
function Deploy-HAProxy {
    Write-Host "`n==> Deploying HAProxy config to $HAPROXY ..." -ForegroundColor Green

    Send-File ".\configs\haproxy\haproxy.cfg"    $HAPROXY "/etc/haproxy/haproxy.cfg"
    Send-File ".\configs\haproxy\errors\503.http" $HAPROXY "/etc/haproxy/errors/503.http"

    # Validate config on the remote node before reloading
    Invoke-SSH $HAPROXY "haproxy -c -f /etc/haproxy/haproxy.cfg"
    Invoke-SSH $HAPROXY "systemctl reload haproxy"

    Write-Host "    HAProxy reloaded successfully." -ForegroundColor DarkGreen
}

# ── Deploy: CrowdSec acquis.yaml ──────────────────────────────────────────────
function Deploy-CrowdSec {
    Write-Host "`n==> Deploying CrowdSec config ..." -ForegroundColor Green

    # acquis.yaml lives in the NFS-backed config path on docker-host
    Send-File ".\configs\crowdsec\acquis.yaml" $DOCKER "/mnt/nas/CrowdSec/config/acquis.yaml"
    Invoke-SSH $DOCKER "docker restart crowdsec"

    Write-Host "    CrowdSec restarted." -ForegroundColor DarkGreen
}

# ── Deploy: Docker Compose stacks ────────────────────────────────────────────
function Deploy-DockerStacks {
    Write-Host "`n==> Deploying Docker Compose stacks to $DOCKER ..." -ForegroundColor Green

    $stacks = @("core", "monitoring", "media", "productivity", "system")

    foreach ($stack in $stacks) {
        $localDir  = ".\stacks\$stack"
        $remoteDir = "/opt/stacks/$stack"

        if (-not (Test-Path "$localDir\docker-compose.yml")) {
            Write-Warning "  Skipping $stack — no docker-compose.yml found."
            continue
        }

        Invoke-SSH $DOCKER "mkdir -p $remoteDir"
        Send-File "$localDir\docker-compose.yml" $DOCKER "$remoteDir/docker-compose.yml"

        if (Test-Path "$localDir\.env") {
            Send-File "$localDir\.env" $DOCKER "$remoteDir/.env"
        }

        Invoke-SSH $DOCKER "cd $remoteDir && docker compose pull --quiet && docker compose up -d --remove-orphans"
        Write-Host "    Stack '$stack' deployed." -ForegroundColor DarkGreen
    }
}

# ── Deploy: Technitium DNS zone records ───────────────────────────────────────
function Deploy-DNS {
    Write-Host "`n==> Adding new HAProxy service via haproxy-config-manager.sh ..." -ForegroundColor Green
    # Example: add a new service to HAProxy dynamically
    # Usage: .\deploy-configs.ps1 -Target dns
    # (extend this function with params as needed)
    $serviceName = Read-Host "Service name (e.g. grafana)"
    $backendIP   = Read-Host "Backend IP (e.g. 10.0.30.5)"
    $backendPort = Read-Host "Backend port (e.g. 3000)"

    Invoke-SSH $HAPROXY "bash /opt/scripts/haproxy-config-manager.sh add-service $serviceName $backendIP $backendPort SERVER"
    Write-Host "    Service '$serviceName' added to HAProxy." -ForegroundColor DarkGreen
}

# ── Main ──────────────────────────────────────────────────────────────────────
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║    Homelab Deploy — deploy-configs   ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host "Target : $Target  |  DryRun : $DryRun`n"

switch ($Target) {
    "haproxy"  { Deploy-HAProxy }
    "crowdsec" { Deploy-CrowdSec }
    "docker"   { Deploy-DockerStacks }
    "dns"      { Deploy-DNS }
    "all"      {
        Deploy-HAProxy
        Deploy-CrowdSec
        Deploy-DockerStacks
    }
}

Write-Host "`n✓ All done." -ForegroundColor Green
```

### Usage Examples

```powershell
# Full deploy, dry-run first (no changes)
.\deploy-configs.ps1 -DryRun

# Full deploy
.\deploy-configs.ps1

# Deploy only HAProxy config and reload
.\deploy-configs.ps1 -Target haproxy

# Deploy Docker stacks only
.\deploy-configs.ps1 -Target docker

# Interactive: add a new service to HAProxy
.\deploy-configs.ps1 -Target dns
```

### Adding a New Service (End-to-End Flow)

1. Write a new `docker-compose.yml` entry for the service on `docker-host`
2. Add a backend + ACL entry in `haproxy.cfg` locally
3. Run `.\deploy-configs.ps1 -Target haproxy` — validates and reloads HAProxy
4. Run `.\deploy-configs.ps1 -Target docker` — pulls and starts the new container
5. The wildcard DNS (`*.alkamfrz.id → 10.0.30.3`) takes care of name resolution automatically

New service is live in under two minutes.

---

## Lessons Learned & Tips

After running this stack daily, here are the hard-won lessons worth sharing:

### Always Validate HAProxy Config Before Reload

`haproxy -c -f /etc/haproxy/haproxy.cfg` — run this every single time, on the remote node after SCP, before `systemctl reload`. One syntax error causes HAProxy to fail on reload and drops all traffic. The deploy script enforces this automatically.

### Use `nfsvers=4` Explicitly in fstab

NFSv3 and NFSv4 have different locking semantics. Docker volumes and bind mounts with NFSv3 occasionally misbehave when containers restart concurrently. Explicitly pinning `nfsvers=4` in `/etc/fstab` eliminates an entire class of hard-to-debug, transient failures.

### Size CrowdSec's Cache Generously

The Lua bouncer's in-memory cache (`CACHE_SIZE`) should reflect your traffic patterns. If the cache is too small, it makes frequent LAPI calls — adding latency to every request. For a busy proxy handling dozens of services, set `CACHE_SIZE = 5000` or higher.

### Separate Cloudflare API Tokens by Function

Create narrow-scoped tokens:
- **Cert renewal token**: `Zone → DNS → Edit` permission on `alkamfrz.id` only
- **Tunnel token**: generated by `cloudflared tunnel login`, stored in the tunnel credentials JSON

Never use the Global API Key for automation.

### Monitor HAProxy with Prometheus

The `prometheus` frontend we added to `haproxy.cfg` exposes native Prometheus metrics. Add it to your Prometheus scrape config:

```yaml
# /mnt/nas/prometheus/prometheus.yml
scrape_configs:
  - job_name: haproxy
    static_configs:
      - targets: ["10.0.30.3:8405"]
  - job_name: node_docker
    static_configs:
      - targets: ["10.0.30.5:9100"]
```

This gives you real-time graphs of request rates, backend health, response times, and connection counts — all in Grafana.

### Tailscale as an Emergency Backdoor

`vpn-node` (`10.0.99.3`) on the MGMT VLAN means I always have a way into the homelab from my phone or laptop if Cloudflare Tunnel goes down, HAProxy crashes, or I lock myself out. It is worth setting up even if you never plan to use it.

### LXC Unprivileged Mode Is Worth the Extra Steps

All LXCs run in unprivileged mode with shifted UID mappings. Even if a process somehow escapes the container, it maps to a non-privileged UID on the Proxmox host. The main gotcha is bind mounts that need explicit `chown` inside the container — a small price for a meaningful security boundary.

---

## Conclusion

This stack gives me a homelab that is genuinely production-grade in its security posture while remaining manageable by one person:

| Property | How It's Achieved |
|---|---|
| No open WAN ports | Cloudflare Tunnel outbound from `cf-tunnel` |
| SSL everywhere | Let's Encrypt wildcard via Certbot DNS-01 |
| Zero-trust routing | HAProxy + Host-based ACLs |
| Behavioral IPS | CrowdSec receiving HAProxy logs over UDP syslog |
| SSO across all services | Authentik as the central IdP |
| Data persistence | Ugreen NAS DH2300 via NFS4 |
| Internal name resolution | Technitium DNS with wildcard A record |
| VLAN isolation | MikroTik RB450Gx4 with 5 VLANs |
| Remote admin | Tailscale mesh VPN on MGMT VLAN |
| Automated deployment | `deploy-configs.ps1` — one command to push and reload |

The key insight is that **security and convenience compound together** when you build the foundation correctly. Cloudflare Tunnel eliminates the most common attack surface (open ports). CrowdSec handles threats that do reach the proxy. HAProxy ties everything together cleanly. And the PowerShell deploy script means I can iterate on configs from my workstation without ever manually SSH-ing into multiple nodes.

If you're starting your own homelab: get the networking and security layers right first. The Cloudflare Tunnel + HAProxy + CrowdSec trifecta takes a few hours to set up but will protect you from countless threats without you ever having to think about it again.

Happy homelabbing.
