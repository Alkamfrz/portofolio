---
title: "Building a Proxmox VE Homelab: From Bare Metal to Virtualized Infrastructure"
date: "2026-06-05"
description: "How I built a production-grade homelab using Proxmox VE, covering VM and LXC setup, NFS storage, VLAN segmentation, Cloudflare Tunnel, and remote access via Tailscale."
---

## 1. Introduction — Why Proxmox VE?

I spent a long time running services directly on bare metal. One misconfigured package update could wipe out an entire stack. Migrating services between machines was painful, snapshots were nonexistent, and rollbacks meant "reinstall everything." Eventually I decided to virtualize the whole setup — and Proxmox VE was the obvious choice.

Proxmox VE is a free, open-source Type-1 hypervisor built on Debian. It combines KVM (for full virtual machines) and LXC (for lightweight containers) under a single, polished web UI. Compared to alternatives:

- **Bare metal**: No isolation, no snapshots, painful migrations.
- **ESXi (VMware)**: Excellent, but free-tier options are now severely limited post-Broadcom acquisition.
- **Cloud VMs**: You pay per CPU/RAM hour. A homelab running 24/7 gets expensive fast.
- **Proxmox VE**: Free, self-hosted, full-featured, with an active community — and it runs on hardware you already own.

My current setup at a glance:

| PVE ID | Hostname | Type | IP | Role |
|---|---|---|---|---|
| — | `pve-tng` | Bare Metal | `10.1.99.2` | Proxmox VE 8.x hypervisor |
| 100 | `cfd-tng` | LXC | `10.1.30.2` | Cloudflare Tunnel (outbound, no port-forwarding) |
| 101 | `haproxy-tng` | LXC | `10.1.30.3` | HAProxy reverse proxy + Let's Encrypt SSL |
| 102 | `technitium-tng` | LXC | `10.1.30.4` | Technitium DNS — internal wildcard resolution |
| 103 | `tailscale-tng` | LXC | `10.1.99.3` | Tailscale Mesh VPN for remote admin access |
| 104 | `docker-tng` | VM | `10.1.30.5` | Ubuntu 24.04, Docker Engine + Portainer EE LTS |
| — | `NAS-TNG` | Physical NAS | `10.1.30.6` | Ugreen DH2300, Debian 12, NFS shares |

All internal services are resolved via Technitium DNS — `*.alkamfrz.my.id` resolves to HAProxy at `10.1.30.3`. External traffic reaches services via Cloudflare Tunnel, with zero open ports on the router. Let's walk through building this from scratch.

---

## 2. Hardware Selection & Planning

You don't need enterprise gear, but a few specs genuinely matter.

### CPU

Proxmox uses KVM, which relies on hardware virtualization extensions. Make sure your processor supports **Intel VT-x** or **AMD-V**, and ideally **VT-d / AMD-Vi** for PCI passthrough. Any modern Intel Core or AMD Ryzen from the last five years works well.

**Rule of thumb**: Allocate 1–2 vCPUs per workload. If you're planning 5–8 VMs and containers, a 6-core/12-thread CPU is comfortable. My host runs a mid-range server-class CPU — nothing exotic.

### RAM

RAM is the real bottleneck in a homelab. KVM VMs each need their own allocated memory. My rough allocations:

- `haproxy-tng` (LXC): 256 MB
- `cfd-tng` (LXC): 128 MB
- `technitium-tng` (LXC): 256 MB
- `tailscale-tng` (LXC): 128 MB
- `docker-tng` (VM): 8 GB

Keep ~20% of physical RAM free for the host OS and headroom. I run 16 GB total and stay comfortable.

### Storage

- **System disk**: A fast NVMe SSD for the Proxmox OS and container/VM root disks. Disk speed here directly impacts VM boot times and I/O.
- **NAS for data**: I offload all persistent application data to my Ugreen DH2300 NAS over NFS rather than putting large disks inside the Proxmox host.

### Networking

A single gigabit NIC is sufficient to start. For VLANs, your NIC and switch must support **802.1Q VLAN tagging**. I use a **MikroTik RB450Gx4** (`RT-TNG`) as the core router/firewall with full VLAN enforcement.

---

## 3. Installing Proxmox VE

### Download & Flash

Grab the latest ISO from [proxmox.com/downloads](https://www.proxmox.com/en/downloads) and flash it to a USB drive:

```bash
# On a Linux host
dd if=proxmox-ve_8.x-1.iso of=/dev/sdX bs=4M status=progress && sync
```

Boot from USB and follow the graphical installer. Key decisions:

- **Target disk**: Select your NVMe SSD.
- **Filesystem**: `ZFS (RAID0)` on a single disk gives you copy-on-write integrity and native snapshots. `ext4` is simpler but offers neither.
- **Hostname**: Set something meaningful — I use `pve-tng.alkamfrz.my.id`.
- **Management IP**: Use a static IP on the MGMT VLAN. Mine is `10.1.99.2/24`, gateway `10.1.99.1`.

### Post-Install Tweaks

Once the web UI is reachable at `https://10.1.99.2:8006`, SSH in as `root` and apply these tweaks.

**1. Switch from the enterprise repo to the no-subscription repo:**

```bash
rm /etc/apt/sources.list.d/pve-enterprise.list

echo "deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription" \
  > /etc/apt/sources.list.d/pve-no-subscription.list

apt update && apt dist-upgrade -y
```

**2. Suppress the subscription nag popup (optional quality-of-life fix):**

```bash
sed -Ezi.bak \
  "s/(Ext.Msg.show\(\{[^}]*title: gettext\('No valid sub)/void\(\{\/\/\1/g" \
  /usr/share/javascript/proxmox-widget-toolkit/proxmoxlib.js
systemctl restart pveproxy
```

**3. Enable IOMMU for PCI passthrough (Intel example):**

Edit `/etc/default/grub`:

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on iommu=pt"
```

Then apply and reboot:

```bash
update-grub && reboot
```

---

## 4. Storage Configuration

### ZFS on the System Disk

With a ZFS install, Proxmox creates a `local-zfs` storage pool for VM and container disk images. Enable LZ4 compression to reclaim space with zero performance penalty:

```bash
zfs set compression=lz4 rpool/data
```

Check your pool health and dataset layout at any time:

```bash
zpool status
zfs list
```

### NAS-Backed Storage — Ugreen DH2300

My persistent data lives on a dedicated **Ugreen DH2300 NAS** (`NAS-TNG`) running **Debian 12 (bookworm)** on a 6.1.x kernel. It's a standalone physical device on VLAN 30 at `10.1.30.6` — not a Proxmox VM.

The NAS exposes three NFS shares:

| NFS Export | Purpose |
|---|---|
| `/volume1/Docker` | Docker Compose volume data for `docker-tng` |
| `/volume1/Backups` | VM/LXC vzdump backup archives |
| `/volume1/Proxmox VE` | Proxmox ISO images, snippets, and templates |

### Registering NAS Shares in Proxmox

In the Proxmox web UI: **Datacenter → Storage → Add → NFS**

Add two entries:

| ID | Server | Export | Content |
|---|---|---|---|
| `nas-backups` | `10.1.30.6` | `/volume1/Proxmox VE` | Backup, ISO image, Snippets |
| `nas-vzdump` | `10.1.30.6` | `/volume1/Backups` | Backup |

This lets Proxmox store scheduled vzdump archives directly on the NAS without any manual rsync.

---

## 5. Network Setup — MikroTik + Proxmox VLANs

### VLAN Design

My MikroTik RB450Gx4 enforces five VLANs with strict inter-VLAN firewall rules:

| VLAN | Name | Subnet | Policy |
|---|---|---|---|
| 10 | USER | `10.1.10.0/24` | Trusted; can reach SERVER VLAN |
| 20 | IOT | `10.1.20.0/24` | WAN-only; fully isolated |
| 30 | SERVER | `10.1.30.0/24` | All VMs, LXC containers, NAS |
| 40 | GUEST | `10.1.40.0/24` | WAN-only; isolated |
| 99 | MGMT | `10.1.99.0/24` | Proxmox host + Tailscale VPN only |

The Proxmox host itself lives on VLAN 99. Services (VMs/LXC) sit on VLAN 30. This means even a compromised service container cannot reach the hypervisor management interface.

### Proxmox Network Interfaces

My `/etc/network/interfaces` on `pve-tng`:

```
auto lo
iface lo inet loopback

# Physical NIC — trunk port from MikroTik, carries all VLANs
auto enp3s0
iface enp3s0 inet manual

# Main bridge — VLAN-aware
auto vmbr0
iface vmbr0 inet manual
    bridge-ports enp3s0
    bridge-stp off
    bridge-fd 0
    bridge-vlan-aware yes
    bridge-vids 2-4094

# MGMT VLAN — Proxmox host management interface
auto vmbr0.99
iface vmbr0.99 inet static
    address 10.1.99.2/24
    gateway 10.1.99.1
```

With `bridge-vlan-aware yes`, each VM/LXC NIC is assigned a VLAN tag in the Proxmox web UI. For example, `haproxy-tng`'s NIC gets tag `30`, placing it on `10.1.30.0/24`. No separate bridge per VLAN needed.

Apply interface changes without a reboot:

```bash
ifreload -a
```

### MikroTik Hardening

I manage the MikroTik with a custom `hardening.rsc` script deployed from my Windows workstation:

```bash
# Deploy MikroTik config via SCP + SSH (from PowerShell on Windows)
scp hardening.rsc alkamfrz@10.1.99.1:/
ssh alkamfrz@10.1.99.1 "/import hardening.rsc"
```

Key hardening actions in the script:
- Disables all plaintext management services (Telnet, FTP, HTTP, Winbox plain)
- Restricts SSH access to MGMT VLAN (`10.1.99.0/24`) only
- Disables the default `admin` account; only `alkamfrz` has access
- Applies `optimization.rsc` for FastTrack connection tracking and QoS queues

---

## 6. Creating LXC Containers

LXC containers share the host kernel, start in seconds, and use minimal RAM — ideal for stateless infrastructure services like DNS, a reverse proxy, or a VPN exit node.

### Download a Container Template

```bash
# Update the template catalog
pveam update

# List available Debian templates
pveam available | grep debian

# Download Debian 12
pveam download local debian-12-standard_12.2-1_amd64.tar.zst
```

### haproxy-tng — Reverse Proxy LXC (ID 101)

```bash
pct create 101 local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \
  --hostname haproxy-tng \
  --cores 1 \
  --memory 256 \
  --swap 128 \
  --rootfs local-zfs:4 \
  --net0 name=eth0,bridge=vmbr0,ip=10.1.30.3/24,gw=10.1.30.1,tag=30 \
  --nameserver 10.1.30.4 \
  --unprivileged 1 \
  --start 1
```

Inside the container, install HAProxy and configure it as the single ingress point:

```bash
pct enter 101
apt update && apt install -y haproxy certbot
```

My `/etc/haproxy/haproxy.cfg` skeleton — HAProxy terminates TLS using Let's Encrypt certs fetched by `certbot`:

```
global
    log /dev/log local0
    maxconn 4096
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    timeout connect 5s
    timeout client  30s
    timeout server  30s

frontend http_in
    bind *:80
    redirect scheme https code 301 if !{ ssl_fc }

frontend https_in
    bind *:443 ssl crt /etc/letsencrypt/live/alkamfrz.my.id/fullchain.pem
    use_backend portainer_backend if { hdr(host) -i portainer.alkamfrz.my.id }
    use_backend gitea_backend    if { hdr(host) -i git.alkamfrz.my.id }
    default_backend docker_backend

backend docker_backend
    server docker-tng 10.1.30.5:80 check

backend portainer_backend
    server docker-tng 10.1.30.5:9443 check ssl verify none
```

```bash
systemctl enable --now haproxy
```

### technitium-tng — Internal DNS (ID 102)

```bash
pct create 102 local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \
  --hostname technitium-tng \
  --cores 1 \
  --memory 256 \
  --swap 64 \
  --rootfs local-zfs:4 \
  --net0 name=eth0,bridge=vmbr0,ip=10.1.30.4/24,gw=10.1.30.1,tag=30 \
  --unprivileged 1 \
  --start 1
```

Install Technitium DNS Server inside:

```bash
pct enter 102
curl -sSL https://download.technitium.com/dns/install.sh | sudo bash
```

In the Technitium web UI (`http://10.1.30.4:5380`), configure a **Zone** for `alkamfrz.my.id` and add a wildcard A record:

```
*.alkamfrz.my.id  →  10.1.30.3   (HAProxy)
```

With this, every service under `*.alkamfrz.my.id` automatically resolves to HAProxy, which routes by `Host` header to the correct upstream.

### tailscale-tng — VPN LXC (ID 103)

```bash
pct create 103 local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \
  --hostname tailscale-tng \
  --cores 1 \
  --memory 128 \
  --rootfs local-zfs:2 \
  --net0 name=eth0,bridge=vmbr0,ip=10.1.99.3/24,gw=10.1.99.1,tag=99 \
  --unprivileged 0 \
  --start 1
```

> **Note**: Tailscale's TUN device requires a **privileged** container or kernel TUN access. Either run it privileged, or add `lxc.cgroup2.devices.allow: c 10:200 rwm` and mount `/dev/net/tun` in the container config.

```bash
pct enter 103
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --advertise-exit-node --ssh
```

This gives me authenticated SSH access to all nodes from anywhere — no port forwarding on the router, no VPN certificates to manage.

### cfd-tng — Cloudflare Tunnel (ID 100)

The Cloudflare Tunnel container establishes an outbound-only encrypted tunnel to Cloudflare's edge, making services publicly accessible without opening any ports on my router.

```bash
pct create 100 local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \
  --hostname cfd-tng \
  --cores 1 \
  --memory 128 \
  --rootfs local-zfs:2 \
  --net0 name=eth0,bridge=vmbr0,ip=10.1.30.2/24,gw=10.1.30.1,tag=30 \
  --unprivileged 1 \
  --start 1
```

Inside the container, install `cloudflared` and authenticate:

```bash
pct enter 100
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared bookworm main' \
  | tee /etc/apt/sources.list.d/cloudflared.list
apt update && apt install -y cloudflared
cloudflared tunnel login
cloudflared tunnel create homelab-tng
```

Configure the tunnel to route to HAProxy at `10.1.30.3`:

```yaml
# /etc/cloudflared/config.yml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: "*.alkamfrz.my.id"
    service: https://10.1.30.3:443
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

```bash
cloudflared service install
systemctl enable --now cloudflared
```

With this architecture, `cfd-tng` → `haproxy-tng` → `docker-tng` is the full request path for any public service.

---

## 7. Creating the Docker VM — docker-tng (ID 104)

Full VMs run their own kernel, making them the right choice for Docker (overlay2 filesystem, iptables rules, etc.).

### Upload the Ubuntu ISO

```bash
wget -O /var/lib/vz/template/iso/ubuntu-24.04-server.iso \
  https://releases.ubuntu.com/24.04/ubuntu-24.04.1-live-server-amd64.iso
```

Or upload via the web UI: **local → ISO Images → Upload**.

### Create the VM

```bash
qm create 104 \
  --name docker-tng \
  --memory 8192 \
  --cores 4 \
  --sockets 1 \
  --cpu host \
  --net0 virtio,bridge=vmbr0,tag=30 \
  --ide2 local:iso/ubuntu-24.04-server.iso,media=cdrom \
  --scsi0 local-zfs:32 \
  --scsihw virtio-scsi-pci \
  --boot order=ide2 \
  --ostype l26 \
  --agent enabled=1

qm start 104
```

Complete the Ubuntu installer via the Proxmox web console. After first boot:

```bash
# Remove the ISO
qm set 104 --ide2 none

# Inside the VM: install QEMU guest agent
apt install -y qemu-guest-agent
systemctl enable --now qemu-guest-agent
```

### Install Docker + Portainer EE

I use a dedicated install script (`install-portainer-ee.sh`) that secures the Docker daemon with mutual TLS on port 2376:

```bash
# Inside docker-tng — secure Docker daemon setup
mkdir -p /etc/docker/certs
# (Script generates CA, server cert, client cert, writes /etc/docker/daemon.json)
bash /scripts/portainer/install-portainer-ee.sh

# daemon.json (result)
# {
#   "hosts": ["fd://", "tcp://0.0.0.0:2376"],
#   "tls": true,
#   "tlscacert": "/etc/docker/certs/ca.pem",
#   "tlscert":   "/etc/docker/certs/server-cert.pem",
#   "tlskey":    "/etc/docker/certs/server-key.pem",
#   "tlsverify": true
# }
```

Portainer EE LTS runs as a Docker container and manages all stacks. My compose stacks live under `/opt/stacks/`:

```
/opt/stacks/
├── gitea/
├── vaultwarden/
├── uptime-kuma/
├── immich/
└── homepage/
```

All persistent data volumes point to `/mnt/nas/<service>/`, backed by the NAS over NFS.

---

## 8. Mounting NFS from the Ugreen NAS

The Ugreen DH2300 (`NAS-TNG`) runs Debian 12 and exports three NFS shares. The primary one for Docker data is `/volume1/Docker`.

### Manual Mount (Test First)

```bash
# Inside docker-tng
apt install -y nfs-common
mkdir -p /mnt/nas
mount -t nfs 10.1.30.6:/volume1/Docker /mnt/nas
df -h /mnt/nas
```

You should see the NAS filesystem with its available space reported.

### Persistent Mount via /etc/fstab

```bash
echo "10.1.30.6:/volume1/Docker  /mnt/nas  nfs  defaults,_netdev,nofail  0  0" \
  >> /etc/fstab

mount -a
```

Key mount options:

| Option | Purpose |
|---|---|
| `_netdev` | Tell systemd to wait for the network before attempting the mount |
| `nofail` | Boot succeeds even if the NAS is temporarily unreachable |

### Docker Compose Volumes on NFS

Point each service's data directory at `/mnt/nas`:

```yaml
services:
  vaultwarden:
    image: vaultwarden/server:latest
    volumes:
      - /mnt/nas/vaultwarden:/data

  gitea:
    image: gitea/gitea:latest
    volumes:
      - /mnt/nas/gitea:/data
```

If `docker-tng` is ever rebuilt, all service data survives on the NAS — recovery is as simple as re-running `docker compose up -d`.

---

## 9. Resource Management

### CPU Mode

For a single-host homelab where all VMs run on the same physical CPU, always use `--cpu host`. This passes the actual host CPU flags through to the guest, giving the best performance. VMs configured this way are not portable between different CPU architectures, but that's fine for a homelab.

### CPU Pinning

For latency-sensitive workloads, pin vCPUs to specific physical cores to prevent NUMA effects:

```bash
# Pin docker-tng's 4 vCPUs to physical cores 4-7
qm set 104 --affinity 4-7
```

Check your CPU topology first:

```bash
lscpu | grep -E 'Socket|Core|Thread'
```

### Memory Ballooning

KVM supports memory ballooning — the guest can release unused RAM back to the host dynamically:

```bash
# docker-tng: max 8 GB, balloon floor 2 GB
qm set 104 --memory 8192 --balloon 2048
```

For LXC containers:

```bash
pct set 101 --memory 256 --swap 128
```

### The 80% Rule

Never commit more than 80% of physical RAM across all VMs and containers. Proxmox itself needs headroom. Overcommitting leads to swapping, and once the host starts swapping, the web UI becomes unresponsive — a miserable experience when you're trying to fix the very thing causing it.

Monitor real usage:

```bash
pvesh get /nodes/pve-tng/status
```

---

## 10. Backup Strategy

I use Proxmox's built-in `vzdump` tool, exporting directly to the NAS over NFS. No Proxmox Backup Server is needed for a single-node setup.

### Scheduled Backups

In the web UI: **Datacenter → Backup → Add**

- Storage: `nas-vzdump` (NFS share at `/volume1/Backups`)
- Schedule: `0 2 * * *` (02:00 nightly)
- Mode: `snapshot` (no downtime)
- Compression: `zstd`
- Retention: 7 copies

### Manual Backup via CLI

```bash
# Backup LXC 101 (haproxy-tng)
vzdump 101 --storage nas-vzdump --mode snapshot --compress zstd

# Backup VM 104 (docker-tng)
vzdump 104 --storage nas-vzdump --mode snapshot --compress zstd

# Backup all VMs/LXC at once
vzdump --all --storage nas-vzdump --mode snapshot --compress zstd
```

Backup mode comparison:

| Mode | Downtime | Notes |
|---|---|---|
| `stop` | Yes | Guaranteed consistent; VM is offline during backup |
| `suspend` | Brief pause | Memory is checkpointed; minimal disruption |
| `snapshot` | None | Requires snapshot-capable storage (ZFS, LVM-thin); preferred |

### Restore Test Cadence

Run a test restore quarterly. A backup you've never restored is not a backup — it's a hope. I restore to a temporary VM, verify service start, then destroy it.

---

## 11. Remote Admin — Tailscale + SSH Keys

### Tailscale for Zero-Trust Remote Access

`tailscale-tng` at `10.1.99.3` joins my Tailscale mesh and acts as an exit node. When I'm away from home, I connect via Tailscale and have authenticated access to every node on my homelab's MGMT VLAN — exactly as if I were physically on the network.

```bash
# Check Tailscale status on tailscale-tng
tailscale status
tailscale netcheck
```

### SSH Key Deployment

All nodes accept root SSH key authentication. I manage this from my Windows workstation with a PowerShell deploy script:

```powershell
# deploy-configs.ps1 (excerpt)
$nodes = @(
  @{ IP = "10.1.30.3"; Name = "haproxy-tng" },
  @{ IP = "10.1.30.4"; Name = "technitium-tng" },
  @{ IP = "10.1.30.5"; Name = "docker-tng" }
)

foreach ($node in $nodes) {
  Write-Host "Deploying to $($node.Name) ($($node.IP))..."
  scp .\configs\$($node.Name)\ root@$($node.IP):/etc/
  ssh root@$($node.IP) "systemctl restart $($node.Name)"
}
```

This makes reconfiguring any service a one-command operation from my workstation.

---

## 12. Monitoring & Maintenance

### Built-in Proxmox Metrics

The Proxmox web UI shows per-node and per-VM CPU, RAM, disk I/O, and network throughput in real time under the **Summary** tab of each node or VM.

For historical metrics, configure an external sink under **Datacenter → Metric Server**. I send metrics to an InfluxDB 2 instance running on `docker-tng`:

```
Type: InfluxDB
Server: 10.1.30.5
Port: 8086
Bucket: proxmox
Organization: homelab
Token: <your-influxdb-token>
```

Grafana on `docker-tng` visualizes these metrics with a community Proxmox dashboard (ID `10048` on grafana.com).

### Keeping Proxmox Updated

```bash
# Check what's pending
apt update && apt list --upgradable

# Apply updates — safe to do with VMs running
apt dist-upgrade -y

# Check if a reboot is needed after a kernel update
[ -f /var/run/reboot-required ] && echo "Reboot required"
```

**Before rebooting the host after a kernel update**, snapshot all VMs:

```bash
qm snapshot 104 pre-kernel-update --vmstate 0
pct snapshot 101 pre-kernel-update
pct snapshot 102 pre-kernel-update
```

This lets you roll back in under a minute if anything breaks.

### Updating Container Templates

```bash
pveam update
pveam available | grep debian
pveam download local debian-12-standard_12.7-1_amd64.tar.zst
```

---

## 13. Common Mistakes & Lessons Learned

After running this setup for months, these are the gotchas I hit so you don't have to.

### 1. Putting the Proxmox UI on a Non-MGMT VLAN

Early on, my Proxmox web interface was reachable from the SERVER VLAN. A misconfigured firewall rule briefly made it reachable from everywhere on my LAN. Isolating the host on a dedicated MGMT VLAN (99) means even a compromised service container cannot see the hypervisor.

### 2. Forgetting `_netdev` in /etc/fstab

A VM that tries to mount NFS before the network is up will hang at boot for 90 seconds. The `_netdev` mount option tells systemd to defer NFS mounts until after the network is online. The `nofail` option ensures the VM boots even if the NAS is temporarily down.

### 3. Running Tailscale in an Unprivileged LXC Without Proper Permissions

Tailscale needs access to `/dev/net/tun`. In an unprivileged LXC without the right kernel capabilities, it silently fails. Either run the container privileged or add the TUN device to the container config:

```bash
# /etc/pve/lxc/103.conf (additions)
lxc.cgroup2.devices.allow: c 10:200 rwm
lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file
```

### 4. Overcommitting RAM

I once allocated a total of 20 GB of RAM across VMs on a 16 GB host. The host swapped, everything slowed to a crawl, and the web UI became unresponsive — making recovery difficult. The 80% rule exists for a reason.

### 5. No Backup Verification

I had `vzdump` running nightly for months before I actually tested a restore. It turned out one backup set was truncated because the NAS share hit its quota mid-backup. Now I test a restore quarterly and check `vzdump` logs after every run.

### 6. Using Privileged LXC Containers Without a Clear Reason

Privileged LXC containers map UID 0 (root) inside the container to UID 0 on the host. A container escape is a full host compromise. Only `tailscale-tng` runs privileged in my setup, and only because it needs kernel TUN access. Everything else is unprivileged.

### 7. Skipping the QEMU Guest Agent

Without the guest agent installed in a KVM VM, Proxmox cannot:
- Quiesce the filesystem before a snapshot (risking inconsistent backups)
- Report the VM's IP address in the web UI
- Perform a graceful shutdown — instead, it sends a hard power-off

Install it on every VM immediately after OS setup:

```bash
apt install -y qemu-guest-agent
systemctl enable --now qemu-guest-agent
```

---

## 14. Conclusion

Building this homelab has taught me more about Linux networking, VLAN segmentation, containerization, and infrastructure design than any structured course could. Proxmox VE is a genuinely capable platform for a free product — KVM VMs, LXC containers, ZFS storage, and a polished web UI, all without a license fee.

Here's my current stack in summary:

- **`pve-tng`**: Proxmox VE 8.x on MGMT VLAN 99, isolated from all services
- **`cfd-tng`**: Cloudflare Tunnel — zero open ports on my router, services still publicly reachable
- **`haproxy-tng`**: Single ingress point for all HTTPS traffic, terminates TLS with Let's Encrypt certs
- **`technitium-tng`**: Internal DNS, wildcard `*.alkamfrz.my.id` → HAProxy
- **`tailscale-tng`**: Secure remote access from anywhere, no port-forwarding required
- **`docker-tng`**: 10+ Docker Compose stacks, Docker daemon secured with mTLS
- **`NAS-TNG`**: Ugreen DH2300 on Debian 12, NFS exports for Docker data and Proxmox backups

The whole infrastructure runs on a single server plus one dedicated NAS appliance. Idle power draw is around 40W combined. If you're weighing the effort of setting up a homelab against the cost of cloud VMs, the math firmly favors the homelab — especially once you want to run more than two or three services.

Start with Proxmox on any halfway-decent machine, spin up one LXC container, and go from there. The learning curve is real, but the control and insight you gain over your own infrastructure is worth every hour of it.

Happy homelabbing.
