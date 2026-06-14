---
title: "Self-Hosting with Docker Compose: My Complete Homelab Stack"
date: "2026-06-10"
description: "A practical guide to running your own self-hosted services using Docker Compose, with real-world config examples from my homelab running Jellyfin, Homepage, Watchtower, and more on a Proxmox VM."
---

## Why I Started Self-Hosting

A few years back I got tired of the cloud subscription treadmill — streaming fees, uptime-monitoring SaaS costs, and the nagging feeling that someone else's server held data that was fundamentally *mine*. So I built a homelab.

Today my stack runs on a **Proxmox VE hypervisor**, with a dedicated **Ubuntu Linux VM** (`docker-tng`, VM 104) on a Server VLAN at `10.1.30.5`. Bulk storage comes from a **Ugreen NAS DH2300** (`NAS-TNG`, running Debian 12) at `10.1.30.6`, serving a single NFS share mounted across the Docker host. Everything is containerized with **Docker Compose**, managed via **Portainer EE**, and protected by **CrowdSec** and a **Cloudflare Tunnel** — so not a single WAN port is open on my router.

This post is the guide I wish I had when I started. It's opinionated, it uses my real configs, and it covers the unglamorous parts — storage tiers, networking, secrets, backups, and what breaks at 2 AM.

---

## 1. Prerequisites

Before you touch a single YAML file, make sure you have:

| Requirement | Notes |
|---|---|
| A Linux server / VM | I use Ubuntu 24.04 inside Proxmox VE. Debian 12 works just as well. |
| Docker Engine ≥ 24 | Install via the official script, not `apt`. |
| Docker Compose v2 | Ships as a Docker plugin (`docker compose`, not `docker-compose`). |
| A static LAN IP | Assign a DHCP reservation or configure it statically. I use `10.1.30.5`. |
| NAS or secondary storage | My Ugreen NAS-TNG at `10.1.30.6` serves NFS. Any NAS with NFS works. |
| Basic shell comfort | You'll be editing YAML and tailing logs. |

### Install Docker on Ubuntu

```bash
# Remove distro packages first
sudo apt remove docker docker.io containerd runc -y

# Install via the official convenience script
curl -fsSL https://get.docker.com | sudo sh

# Add your user to the docker group (log out and back in after)
sudo usermod -aG docker $USER

# Verify
docker version
docker compose version
```

---

## 2. Docker Compose Fundamentals

If you're new to Compose, here's the mental model in one paragraph:

A **service** is a container definition — image, ports, environment, volumes. A **volume** is persistent storage that survives container restarts. A **network** lets containers talk to each other by name without exposing ports to the host. A `docker-compose.yml` file ties all of these together declaratively.

```yaml
# Minimal anatomy of a docker-compose.yml
services:
  myapp:
    image: nginx:alpine          # The container image
    container_name: myapp        # Human-readable name
    restart: unless-stopped      # Auto-restart policy
    ports:
      - "8080:80"                # host_port:container_port
    volumes:
      - ./data:/var/www/html     # bind mount (host path:container path)
      - app_cache:/cache         # named volume
    environment:
      - APP_ENV=production
    networks:
      - proxy-net

volumes:
  app_cache:                     # Docker manages this volume

networks:
  proxy-net:
    external: true
```

Key things to internalize:

- `restart: unless-stopped` — containers come back after a reboot but stay stopped if you manually `docker compose stop`.
- Named volumes are managed by Docker under `/var/lib/docker/volumes/`. Bind mounts are plain host directories you control directly.
- Services on the same Compose network resolve each other by **service name** (e.g., `http://jellyfin:8096`), not by IP.

---

## 3. Designing a Modular Stack Architecture

Putting everything in one giant `docker-compose.yml` is a maintenance nightmare. My solution: **one directory per stack**, each with its own Compose file, under `/root/stacks/`.

```
/root/stacks/
├── Portainer/
│   └── docker-compose.yml
├── Jellyfin/
│   └── docker-compose.yml
├── ArrSuite/
│   └── docker-compose.yml
├── Immich/
│   └── docker-compose.yml
├── Authentik/
│   └── docker-compose.yml
├── Homepage/
│   └── docker-compose.yml
├── CrowdSec/
│   └── docker-compose.yml
└── Watchtower/
    └── docker-compose.yml
```

Each stack also gets its config/database data stored in one of two places, depending on its I/O characteristics:

- **`/data/arr-db/[service]_config/`** — local SSD on the Docker host. Used for database-heavy apps (Radarr, Prowlarr, Jellyfin metadata, etc.) where NFS locking can cause corruption.
- **`/mnt/nas/[Service]/`** — NFS mount from the Ugreen NAS. Used for large media files, photos, and anything that benefits from NAS-side storage.

### The NFS Mount

On the NAS-TNG (`10.1.30.6`), the Docker volume dataset is exported via NFS: `/volume1/Docker`. On the Docker host, it's mounted at `/mnt/nas`:

```bash
# /etc/fstab on docker-tng
10.1.30.6:/volume1/Docker  /mnt/nas  nfs  defaults,_netdev,nofail  0  0
```

The `_netdev` flag tells systemd to wait for network before mounting — critical so containers don't fail to start after a reboot because the NAS isn't up yet.

### The Shared Proxy Network

A pre-created external network lets all stacks talk to the reverse proxy and to each other:

```bash
docker network create proxy-net
```

Every service that needs to be proxied or talk cross-stack joins it:

```yaml
networks:
  proxy-net:
    external: true
```

---

## 4. Managing Stacks with Portainer EE

I run **Portainer Enterprise Edition LTS** as my primary Docker management interface. It sits at `https://10.1.30.5:9443` and gives me a visual overview of every container, log stream, volume, and network.

**`/root/stacks/Portainer/docker-compose.yml`**

```yaml
services:
  portainer:
    image: portainer/portainer-ee:lts
    container_name: portainer
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /data/arr-db/portainer_data:/data
    ports:
      - "9443:9443"
    networks:
      - proxy-net

networks:
  proxy-net:
    external: true
```

```bash
cd /root/stacks/Portainer
docker compose up -d
```

Once Portainer is running, you can deploy all other stacks directly from its UI — paste the Compose YAML, set environment variables, and click Deploy. For admin-workstation-driven deployments, a PowerShell script (`deploy-configs.ps1`) SCP's the compose files to the server and SSHes in to run `docker compose up -d`.

> **Note on the Docker socket**: The `:ro` flag at the filesystem level doesn't prevent Portainer from managing containers — it can still send commands via the socket. Keep Portainer on your LAN; don't expose port 9443 to the internet.

---

## 5. Self-Hosting Jellyfin

Jellyfin is my media server. It's 100% free, open-source, and streams movies, TV, and music to any device on the network.

I pin the image version — no silent breaking changes from `latest`:

**`/root/stacks/Jellyfin/docker-compose.yml`**

```yaml
services:
  jellyfin:
    image: jellyfin/jellyfin:10.11.11
    container_name: jellyfin
    restart: unless-stopped
    environment:
      - TZ=Asia/Jakarta
    volumes:
      # Config and metadata on local SSD (avoids NFS locking issues)
      - /data/arr-db/jellyfin_config:/config
      # Media library on NFS share
      - /mnt/nas/Jellyfin/media:/media
    devices:
      # Pass through Intel iGPU for VAAPI hardware transcoding
      - /dev/dri/renderD128:/dev/dri/renderD128
    group_add:
      - "render"
      - "video"
    ports:
      - "8096:8096"
    networks:
      - proxy-net

networks:
  proxy-net:
    external: true
```

### Enabling VAAPI Hardware Transcoding

First, verify the GPU device exists in the VM:

```bash
ls /dev/dri/
# Expected output: card0  renderD128
```

Then in Jellyfin: **Dashboard → Playback → Transcoding → Hardware acceleration: `Video Acceleration API (VAAPI)`** → Save.

Hardware transcoding dramatically reduces CPU usage during 4K playback — my `docker stats` shows Jellyfin at 8–15% CPU transcoding a 4K HEVC file, versus 300%+ in software mode.

### Request Management with Seerr

Seerr sits alongside Jellyfin and lets users request movies/TV shows. Requests flow through Radarr → qBittorrent automatically.

```yaml
# Part of the Jellyfin stack
  seerr:
    image: ghcr.io/seerr-team/seerr:v3.3.0
    container_name: seerr
    restart: unless-stopped
    environment:
      - TZ=Asia/Jakarta
    volumes:
      - /data/arr-db/seerr_config:/app/config
    ports:
      - "5055:5055"
    networks:
      - proxy-net
```

---

## 6. The Arr Suite: Automated Media Management

Radarr, Prowlarr, Bazarr, and qBittorrent form the automated pipeline that fetches and organizes media.

```
Request (Seerr) → Radarr → Prowlarr (indexer) → qBittorrent (download) → Radarr (import) → Jellyfin
                                                                 ↓
                                                           Bazarr (subtitles)
```

All config databases live on local SSD to avoid NFS locking issues. Only qBittorrent's download directory is on the NAS.

**`/root/stacks/ArrSuite/docker-compose.yml`**

```yaml
services:
  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: radarr
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Jakarta
    volumes:
      - /data/arr-db/radarr_config:/config
      - /mnt/nas/Jellyfin/media/movies:/movies
      - /mnt/nas/ArrSuite/qbittorrent/downloads:/downloads
    ports:
      - "7878:7878"
    networks:
      - proxy-net

  prowlarr:
    image: lscr.io/linuxserver/prowlarr:latest
    container_name: prowlarr
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Jakarta
    volumes:
      - /data/arr-db/prowlarr_config:/config
    ports:
      - "9696:9696"
    networks:
      - proxy-net

  bazarr:
    image: lscr.io/linuxserver/bazarr:latest
    container_name: bazarr
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Jakarta
    volumes:
      - /data/arr-db/bazarr_config:/config
      - /mnt/nas/Jellyfin/media:/media
    ports:
      - "6767:6767"
    networks:
      - proxy-net

  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    container_name: qbittorrent
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Jakarta
      - WEBUI_PORT=8089
    volumes:
      - /mnt/nas/ArrSuite/qbittorrent:/config
    ports:
      - "8089:8089"
      - "6881:6881"
      - "6881:6881/udp"
    networks:
      - proxy-net

networks:
  proxy-net:
    external: true
```

---

## 7. Homepage Dashboard

Instead of a separate uptime monitor, I use **Homepage** — a beautiful, self-hosted dashboard that aggregates service status, container stats, and bookmarks in one place.

**`/root/stacks/Homepage/docker-compose.yml`**

```yaml
services:
  homepage:
    image: ghcr.io/gethomepage/homepage:v1.13.2
    container_name: homepage
    restart: unless-stopped
    volumes:
      - /mnt/nas/Homepage/config:/app/config
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "8082:3000"
    networks:
      - proxy-net

networks:
  proxy-net:
    external: true
```

Homepage reads your `services.yaml` and `widgets.yaml` from `/mnt/nas/Homepage/config/`. Here's a snippet of how Jellyfin and Portainer are defined:

```yaml
# /mnt/nas/Homepage/config/services.yaml
- Media:
    - Jellyfin:
        href: http://10.1.30.5:8096
        icon: jellyfin.svg
        widget:
          type: jellyfin
          url: http://jellyfin:8096
          key: {{HOMEPAGE_VAR_JELLYFIN_API_KEY}}

- Management:
    - Portainer:
        href: https://10.1.30.5:9443
        icon: portainer.svg
        widget:
          type: portainer
          url: https://portainer:9443
          env: 1
          key: {{HOMEPAGE_VAR_PORTAINER_API_KEY}}
```

Because Homepage is on `proxy-net` and mounts the Docker socket, it can display live CPU/RAM stats for every running container — without anything needing to be publicly exposed.

---

## 8. Immich: Self-Hosted Photo Library

Immich is my Google Photos replacement — it handles automatic mobile backup, facial recognition, and map view.

**`/root/stacks/Immich/docker-compose.yml`** (simplified — the full upstream Compose file is long)

```yaml
services:
  immich-server:
    image: ghcr.io/immich-app/immich-server:release
    container_name: immich-server
    restart: unless-stopped
    volumes:
      - /mnt/nas/Immich/library:/usr/src/app/upload
    env_file:
      - .env
    ports:
      - "2283:2283"
    depends_on:
      - redis
      - database
    networks:
      - proxy-net
      - immich-internal

  redis:
    image: redis:7-alpine
    container_name: immich-redis
    restart: unless-stopped
    networks:
      - immich-internal

  database:
    image: tensorchord/pgvecto-rs:pg14-v0.2.0
    container_name: immich-postgres
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - /data/arr-db/immich_postgres:/var/lib/postgresql/data
    networks:
      - immich-internal

networks:
  proxy-net:
    external: true
  immich-internal:
    driver: bridge
    internal: true
```

The internal `immich-internal` network means Postgres and Redis are completely unreachable from outside the stack — only `immich-server` can talk to them.

---

## 9. Managing Persistent Data: Two Storage Tiers

The most important architectural decision in my homelab is the **two-tier storage split**:

### Tier 1 — Local SSD (`/data/arr-db/`)

Used for apps with SQLite or PostgreSQL databases, or any service that writes frequently:

- Portainer state
- Jellyfin metadata and artwork
- Radarr/Prowlarr/Bazarr databases
- Immich PostgreSQL data

NFS is not safe for SQLite databases. NFS locking is incomplete, and concurrent writes from multiple containers (or even a single container) can silently corrupt a `.db` file. Local SSD eliminates this risk entirely.

### Tier 2 — NFS Share (`/mnt/nas/`)

Used for large files and anything that benefits from NAS-side capacity:

```
/mnt/nas/
├── Jellyfin/media/        # Movies, TV shows, music
├── Immich/library/        # Photo uploads
├── ArrSuite/qbittorrent/  # Download staging
├── Homepage/config/       # Homepage YAML configs
└── CrowdSec/config/       # CrowdSec hub config
```

### NFS Mount in Detail

```bash
# /etc/fstab on docker-tng
10.1.30.6:/volume1/Docker  /mnt/nas  nfs  defaults,_netdev,nofail  0  0
```

Key mount options:
- `_netdev` — wait for network before mounting (essential for a VM that boots without guaranteed NAS availability)
- `nofail` — don't block boot if the NAS is unreachable

Verify the mount:

```bash
sudo mount -a
df -h /mnt/nas
# Filesystem             Size  Used Avail Use%
# 10.1.30.6:/volume1/Docker  4.4T  1.2T  3.2T  27%  /mnt/nas
```

---

## 10. Networking: The Proxy Network Pattern

### External `proxy-net`

Every stack that needs to be reached by other services or the reverse proxy joins the shared `proxy-net`:

```bash
# Create once
docker network create proxy-net
```

```yaml
networks:
  proxy-net:
    external: true
```

### Internal Networks for Database Isolation

Stacks with databases (Immich, Authentik) use an additional internal network that the DB containers join, but the internet-facing container joins *both*:

```yaml
networks:
  proxy-net:
    external: true          # App server is reachable
  immich-internal:
    driver: bridge
    internal: true          # Postgres/Redis are isolated
```

This way, a compromised `immich-server` still can't be used as a pivot to reach Postgres from outside the stack.

### DNS Resolution

Docker's embedded DNS lets containers resolve each other by name on shared networks:

```bash
# From the Homepage container, reach Jellyfin by service name
docker exec homepage wget -qO- http://jellyfin:8096/health
```

No `/etc/hosts` editing, no static IPs. Just service names.

### Public Access: Cloudflare Tunnel

I don't open any ports on my router's WAN interface. Instead, public services (my portfolio, Jellyfin) are exposed via a **Cloudflare Tunnel** running as a Docker container. The tunnel connects outbound to Cloudflare's edge and routes traffic back into my LAN — zero inbound firewall rules required.

```yaml
# Part of the networking stack
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    networks:
      - proxy-net
```

---

## 11. Security Hardening

### No Open WAN Ports

The single most impactful security decision: **no open ports on the router**. All public traffic flows through Cloudflare Tunnel → HAProxy (LAN reverse proxy) → container. Attackers can't even reach my IP directly.

### CrowdSec for Intrusion Detection

CrowdSec analyzes nginx and application logs for malicious patterns and shares IP reputation data across the community. My stack:

**`/root/stacks/CrowdSec/docker-compose.yml`**

```yaml
services:
  crowdsec:
    image: crowdsecurity/crowdsec:v1.7.8
    container_name: crowdsec
    restart: unless-stopped
    environment:
      - GID=1000
      - COLLECTIONS=crowdsecurity/nginx crowdsecurity/linux crowdsecurity/jellyfin
    volumes:
      - /mnt/nas/CrowdSec/config:/etc/crowdsec
      - /var/log:/var/log:ro
    ports:
      - "8080:8080"
      - "5514:5514/udp"
    networks:
      - proxy-net
```

### `no-new-privileges` and `security_opt`

Add this to every service that doesn't need privilege escalation:

```yaml
security_opt:
  - no-new-privileges:true
```

### Environment Secrets — Never Hardcode

All secrets live in `.env` files local to each stack directory, never in the YAML itself:

```bash
# /root/stacks/Immich/.env
DB_PASSWORD=a-long-random-password
REDIS_HOSTNAME=immich-redis
DB_HOSTNAME=immich-postgres
DB_USERNAME=immich
DB_DATABASE_NAME=immich
```

```yaml
services:
  immich-server:
    env_file:
      - .env
```

Keep `.env` files out of git. I store them in a Bitwarden Secure Note, encrypted.

### Authentik for SSO

For services I want to lock down further, I front them with **Authentik** — a self-hosted identity provider that adds Google-OAuth-style login screens.

```yaml
# /root/stacks/Authentik/docker-compose.yml (abbreviated)
services:
  authentik-server:
    image: ghcr.io/goauthentik/server:2026.5.2
    container_name: authentik-server
    command: server
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "9000:9000"
    depends_on:
      - authentik-redis
      - authentik-postgres
    networks:
      - proxy-net
      - authentik-internal
```

---

## 12. Update Strategy with Watchtower

I run **Watchtower** in monitor-only mode most of the time — it notifies me when new images are available but doesn't auto-update. I then review the changelog and decide whether to pull.

**`/root/stacks/Watchtower/docker-compose.yml`**

```yaml
services:
  watchtower:
    image: containrrr/watchtower:1.7.1
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_SCHEDULE=0 0 3 * * *   # Check at 3 AM daily
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_REMOVE_VOLUMES=false
      - WATCHTOWER_NOTIFICATIONS=slack
      - WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL=${SLACK_WEBHOOK_URL}
      - WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER=docker-tng
```

### Manual Update Workflow

For pinned-tag images (like `jellyfin:10.11.11`), I update manually:

```bash
# 1. Edit the image tag in docker-compose.yml to the new version
nano /root/stacks/Jellyfin/docker-compose.yml

# 2. Pull the new image
docker compose -f /root/stacks/Jellyfin/docker-compose.yml pull

# 3. Recreate the container
docker compose -f /root/stacks/Jellyfin/docker-compose.yml up -d

# 4. Verify it's running
docker compose -f /root/stacks/Jellyfin/docker-compose.yml ps

# 5. Clean up old images
docker image prune -f
```

This gives me a full audit trail: the git diff on `docker-compose.yml` shows exactly what changed and when.

---

## 13. Backup Strategy

Containers are ephemeral. Data is not. Here's what I back up and how.

### What to Back Up

| Data | Location | Backup Method |
|---|---|---|
| App databases / configs | `/data/arr-db/` on local SSD | `rsync` → NAS nightly |
| Large media | `/mnt/nas/Jellyfin/media/` | NAS-side snapshots (Ugreen built-in) |
| Compose stack files | `/root/stacks/` | Git + private GitHub repo |
| `.env` secrets | local only | Bitwarden Secure Note |

### Nightly Backup Script

```bash
#!/usr/bin/env bash
# /opt/scripts/backup-appdata.sh

SRC="/data/arr-db"
DEST="/mnt/nas/Backups/app-data"
DATE=$(date +%Y-%m-%d)
LOG="/var/log/homelab-backup.log"

echo "=== Backup started: $(date) ===" >> "$LOG"

# Sync local SSD config data to NAS
rsync -av --delete \
  "$SRC/" \
  "$DEST/$DATE/" \
  >> "$LOG" 2>&1

# Keep only the last 14 daily backups
find "$DEST" -maxdepth 1 -type d -name "20*" | sort | head -n -14 | xargs rm -rf

echo "=== Backup complete: $(date) ===" >> "$LOG"
```

```bash
chmod +x /opt/scripts/backup-appdata.sh

# Schedule with cron (2 AM daily)
(crontab -l; echo "0 2 * * * /opt/scripts/backup-appdata.sh") | crontab -
```

### Backing Up Compose Files with Git

```bash
cd /root/stacks
git init
echo "**/.env" > .gitignore
git add .
git commit -m "homelab stack configs"
git remote add origin git@github.com:yourusername/homelab-stacks.git
git push -u origin main
```

Every time I change a Compose file, I `git commit` it. This doubles as a change log and a complete recovery blueprint.

### Restoring a Service

```bash
# 1. Create the target directory if it doesn't exist
mkdir -p /data/arr-db/jellyfin_config

# 2. Restore from NAS backup
rsync -av /mnt/nas/Backups/app-data/2026-06-10/jellyfin_config/ \
  /data/arr-db/jellyfin_config/

# 3. Start the stack
docker compose -f /root/stacks/Jellyfin/docker-compose.yml up -d
```

---

## 14. Common Issues and Troubleshooting

### Container Won't Start

```bash
# Check exit code and logs
docker compose -f /root/stacks/Jellyfin/docker-compose.yml logs -f

# Inspect state
docker inspect jellyfin | jq '.[0].State'
```

Common causes: wrong path in a bind mount (directory doesn't exist yet), port conflict on the host, missing environment variable.

### Port Already in Use

```bash
# Find what's using port 8096
sudo ss -tlnp | grep 8096
# or
sudo lsof -i :8096
```

### Container Can't Reach Another Container

```bash
# Are both containers on the same network?
docker network inspect proxy-net

# Can one ping the other?
docker exec homepage ping jellyfin -c 3
```

### NFS Mount Not Available After Reboot

```bash
# Check fstab has _netdev
grep nfs /etc/fstab
# 10.1.30.6:/volume1/Docker  /mnt/nas  nfs  defaults,_netdev,nofail  0  0

# Ensure rpcbind is enabled
sudo systemctl enable --now rpcbind

# Force remount
sudo mount -a && df -h /mnt/nas
```

### Jellyfin Can't Access `/dev/dri/renderD128`

```bash
# Check the render group GID on the host
getent group render
# render:x:104:

# Make sure group_add in docker-compose.yml includes it
group_add:
  - "render"
  - "video"
```

If the container was started before you added the groups, recreate it:

```bash
docker compose -f /root/stacks/Jellyfin/docker-compose.yml down
docker compose -f /root/stacks/Jellyfin/docker-compose.yml up -d
```

### SQLite Database Corruption on NFS

If you moved a config directory to NFS and your app is crashing with `database disk image is malformed`:

```bash
# Stop the container
docker compose down

# Copy the data off NFS and onto local SSD
cp -a /mnt/nas/BadService/config/ /data/arr-db/badservice_config/

# Update the bind mount path in docker-compose.yml
# Then restart
docker compose up -d
```

This is exactly why I keep all database-backed app configs on local SSD by default.

### Watchtower Updated Something and Broke It

Because I pin versions (e.g., `jellyfin:10.11.11`), Watchtower only notifies — it doesn't auto-update pinned tags. If something breaks after a manual update:

```bash
# List available local image tags
docker image ls jellyfin/jellyfin

# Roll back by editing docker-compose.yml to the previous version tag
# then:
docker compose up -d
```

---

## 15. Conclusion

My homelab stack — Jellyfin, the Arr Suite, Immich, Authentik, Homepage, CrowdSec, Watchtower, and my portfolio — all runs on a single VM with 4 vCPUs and 8 GB RAM, with the heavy lifting offloaded to a Ugreen NAS. At idle, total RAM usage sits around 3 GB. The entire setup can be rebuilt from scratch in under two hours using the Git repo and the backup archive.

The key lessons after running this in production:

1. **Modularize from day one** — one directory, one Compose file per service. Reason about stacks independently.
2. **Use two storage tiers** — local SSD for databases, NAS for media. SQLite on NFS *will* corrupt eventually.
3. **Never open WAN ports** — Cloudflare Tunnel is free and eliminates an entire class of attack surface.
4. **Pin image tags** for critical services; let Watchtower notify you rather than auto-update.
5. **Back up `/data/arr-db/` nightly** — that's where all the irreplaceable metadata lives.
6. **Version your Compose files in git** — your `.gitignore`'d `.env` files are the only thing the repo doesn't cover.

If you're just starting out: get Portainer running first, then add one service at a time. Understand how it stores data before adding the next. The homelab rabbit hole is real, but it's deeply satisfying when your media server, dashboard, and photo library are all running on hardware *you* control.

---

*Curious about any specific service in this stack or how I set up Cloudflare Tunnel? Drop me a message — I'm always happy to geek out about homelab configs.*
