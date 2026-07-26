export const experience = [
  {
    id: 'smf',
    role: 'IT Hardware Support Intern',
    org: 'Sinarmas Multifinance',
    location: 'West Jakarta',
    period: 'May 2025 – Present',
    description: 'IT hardware support for a leading Indonesian financial services company under Sinar Mas Group.',
    achievements: [
      'Deployed Windows 11, Linux openSUSE 15.6, and macOS across 40+ workstations with 99% success rate.',
      'Configured CCTV DVR with ZoneMinder, establishing 24/7 centralized monitoring for 15+ cameras.',
      'Resolved 25–30 weekly incidents via remote desktop with 95% first-call resolution.',
      'Managed Active Directory and OpenVPN for 200+ employees on Windows Server.',
      'Standardized 50+ applications across workstations; reduced security vulnerabilities by 40%.',
    ],
  },
  {
    id: 'emtek',
    role: 'IT Support Intern',
    org: 'EMTEK Group — RS EMC Alam Sutera',
    location: 'South Tangerang',
    period: 'Sep 2024 – Dec 2024',
    description: 'IT support at a premier hospital under EMTEK, a leading Indonesian conglomerate.',
    achievements: [
      'Deployed 50+ IoT devices, printers, and APs; resolved 20+ weekly connectivity incidents.',
      'Reduced network downtime from 8% to 6% (25% improvement) via monitoring scripts and VLAN segmentation.',
      'Automated data audits with Python (BERT NLP, fuzzy search) — cut manual effort by 15 hrs/week (40%).',
      'Upgraded 30+ HDDs to SSDs (~3× faster boot); crimped 150+ Cat6 cables achieving 99% uptime during 500+ critical surgeries.',
      'Trained 40+ staff on Code White System via 8 workshops; reduced procedural errors by 50%.',
    ],
  },
  {
    id: 'halodoc',
    role: 'Tech IT Infrastructure Intern',
    org: 'Halodoc',
    location: 'South Jakarta',
    period: 'Feb 2024 – Jun 2024',
    description: "Indonesia's #1 healthtech platform serving millions of users.",
    achievements: [
      'Resolved 15–20 weekly HW/SW incidents; slashed resolution time from 2.5h to 1.6h (35% faster) via RCA templates and tiered prioritization.',
      'Integrated Zabbix–Jira to auto-generate 10–15 pharmacy router tickets/week; reduced manual reporting from 4h to 2h with 100% SLA compliance.',
      'Built PowerShell script to purge 50–100 non-compliant files/week on reboot — saving 6h weekly, aligned with ISO 27001 retention policies.',
    ],
  },
  {
    id: 'aslab',
    role: 'Assistant Coordinator',
    org: 'ASLAB Fasilkom UMB',
    location: 'West Jakarta',
    period: 'Jan 2024 – Dec 2024',
    description: 'Student-led technical division managing 5 computer labs for 3,000+ students.',
    achievements: [
      'Managed 15–20 assistants across 5 labs via Notion scheduling; achieved 100% coverage during 10+ peak events.',
      'Revamped hiring with Python and network sim assessments — 90% pass rate, reduced onboarding from 4 to 2.8 weeks (30%).',
      'Built KPI dashboard tracking 5+ metrics (1.2h avg resolution time); cut recurring complaints by 25%.',
    ],
  },
];

export const education = [
  {
    degree: 'Bachelor of Informatics Engineering',
    school: 'Universitas Mercu Buana',
    location: 'Jakarta',
    period: 'Aug 2021 – Aug 2025',
    gpa: '3.90 / 4.00',
  },
  {
    degree: 'Computer & Network Engineering',
    school: 'SMKN 1 Tangerang',
    location: 'Tangerang',
    period: 'Jul 2018 – Jul 2021',
    gpa: '85.00 / 100.00',
  },
];

export const certifications = [
  'Google IT Automation with Python — Google',
  'Programming with Python — Dicoding',
  'DevOps Fundamentals — Dicoding',
  'Networking for Beginners — Codepolitan',
];

export const skills = {
  Languages: ['Python', 'JavaScript', 'TypeScript', 'Bash', 'PowerShell', 'SQL', 'C++', 'Java'],
  Databases: ['PostgreSQL', 'MySQL', 'Oracle Database', 'Firebase'],
  Containers: ['Docker', 'Docker Compose', 'Proxmox VE'],
  Networking: ['Cloudflare Tunnel', 'HAProxy', 'Tailscale', 'Unbound DNS', 'VLAN', 'nftables', 'RouterOS'],
  Security: ['CrowdSec', 'Cloudflare WAF', 'Fail2ban', 'UFW'],
  'Identity & Access': ['Active Directory', 'OpenVPN'],
  Systems: ['Linux', 'macOS', 'Windows Server'],
};

export const projects = [
  {
    id: 'homelab',
    title: 'Homelab Infrastructure',
    description: 'Production-grade homelab on Proxmox VE — 7 Docker Compose stacks, VLAN-segmented RouterOS networking, Cloudflare Tunnel ingress, CrowdSec IPS, and Tailscale VPN. Infrastructure-as-code with SOPS+Age encryption, full CI/CD pipeline (169 tests), and one-command deployment.',
    tech: ['Docker', 'Proxmox VE', 'Cloudflare Tunnel', 'CrowdSec', 'HAProxy', 'Tailscale', 'Bash', 'PowerShell'],
    github: 'https://github.com/alkamfrz/home-server-infrastructure',
    live: 'https://home.alkamfrz.id',
    status: 'active',
  },
  {
    id: 'cfo-retinanet',
    title: 'CFO-RetinaNet',
    description: 'Custom RetinaNet architecture for precision agriculture — classifying oil palm ripeness from aerial imagery. Published on Garuda/Kemdiktisaintek.',
    tech: ['Python', 'PyTorch', 'RetinaNet', 'Computer Vision'],
    github: 'https://github.com/Alkamfrz/Retinanet-Oil-Palm-Bunch-Ripeness-Detection',
    journal: 'https://garuda.kemdiktisaintek.go.id/documents/detail/5253843',
    status: 'published',
  },
  {
    id: 'brain-tumor',
    title: 'Brain Tumor Classifier',
    description: 'End-to-end pipeline using fine-tuned ResNet50 and EfficientNet for brain tumor detection from MRI scans. Published in IJICOM journal.',
    tech: ['Python', 'TensorFlow', 'CNN', 'ResNet50'],
    journal: 'https://ijicom.respati.ac.id/index.php/ijicom/article/view/80',
    status: 'published',
  },
  {
    id: 'portfolio',
    title: 'Portfolio Website',
    description: 'This site — Astro static site, editorial top-nav layout, zero runtime framework. Google Fonts, pure CSS custom properties.',
    tech: ['Astro', 'TypeScript', 'CSS', 'Docker'],
    github: 'https://github.com/alkamfrz/portofolio',
    live: 'https://alkamfrz.id',
    status: 'active',
  },
];
