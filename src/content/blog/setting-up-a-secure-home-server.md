---
title: "Setting Up a Secure Home Server with HAProxy & CrowdSec"
date: "2026-06-01"
description: "Learn how to deploy a secure local homelab, including HAProxy reverse proxy, Let's Encrypt SSL automation, Cloudflare Tunnels, and CrowdSec intrusion prevention."
---

Running your own home server is incredibly rewarding — but only if it's done securely. In this guide, I'll walk through my personal setup using **Proxmox VE**, **Docker Compose**, **HAProxy**, **Cloudflare Tunnels**, and **CrowdSec**.

## Hypervisor & Virtualization

At the core of the homelab is **Proxmox VE** hosting dedicated VMs and LXC containers to segment responsibilities:
- **`pve-tng`**: Proxmox host.
- **`haproxy-tng`**: Dedicated LXC container for reverse proxy and SSL termination.
- **`docker-tng`**: Linux VM hosting all Docker Compose stacks.
- **`nas-tng`**: TrueNAS shared NFS storage mounted at `/mnt/nas`.

## Why HAProxy & Cloudflare Tunnels?

Instead of opening WAN ports on the router and exposing the public IP, the server uses a **Cloudflare Tunnel** (`cfd-tng`) for public traffic. 
All incoming web requests flow through the tunnel to **HAProxy**, which terminates SSL and manages routing to backend Docker containers.

For local mapping, a **Technitium DNS** server resolves `*.alkamfrz.my.id` domains internally to HAProxy, allowing transparent access inside the home network.

## Reconciling with Docker Compose

Rather than heavy orchestration engines, services are managed via modular **Docker Compose** stacks. Data persistence is bind-mounted directly to TrueNAS NFS shares (with SQLite-heavy apps hosted locally on SSD mounts to prevent NFS lock latency).

To deploy new configurations and stacks from the admin workstation, a custom PowerShell orchestrator script (`deploy-configs.ps1`) automates SCP file transfer and parallel SSH composition.

## Intrusion Prevention with CrowdSec

Instead of basic log parsers, the proxy uses **CrowdSec** for advanced intrusion detection:
1. HAProxy logs HTTP traffic via UDP to a local syslog relay.
2. The relay appends metadata and forwards logs to the CrowdSec daemon on the Docker VM.
3. If a threat/abuse is detected, CrowdSec tells the HAProxy Lua bouncer module to block the attacker's IP.

## Conclusion

A secure home server is achievable without opening WAN ports or overcomplicating configuration. Using Proxmox VE for virtualization, HAProxy for routing, and Cloudflare Tunnels for secure ingress creates a robust and private hosting environment.
