export const projects = [
  {
    id: 1,
    title: 'Home Server Infrastructure',
    description: 'Automated self-hosted home infrastructure using Docker, K3s, and Ansible. Features Traefik reverse proxy, automated SSL, and Gitea for self-hosted Git.',
    techStack: ['Docker', 'K3s', 'Ansible', 'Traefik', 'Linux'],
    liveUrl: 'https://alkamfrz.my.id',
    githubUrl: 'https://github.com/alkamfrz/home-server-infrastructure',
    featured: true,
  },
  {
    id: 2,
    title: 'Portfolio Website',
    description: 'Personal portfolio built with Astro and React, featuring glassmorphism design, Playwright E2E testing, and a Docker-based deployment pipeline.',
    techStack: ['Astro', 'React', 'Playwright', 'Docker', 'Nginx'],
    liveUrl: 'https://alkamfrz.my.id',
    githubUrl: 'https://github.com/alkamfrz/alkamfrz_portfolio',
    featured: true,
  },
  {
    id: 3,
    title: 'Monitoring Stack',
    description: 'Comprehensive monitoring solution using Prometheus, Grafana, and Loki for full observability of home lab services and infrastructure health.',
    techStack: ['Prometheus', 'Grafana', 'Loki', 'Docker Compose', 'Node Exporter'],
    liveUrl: 'https://grafana.alkamfrz.my.id',
    githubUrl: 'https://github.com/alkamfrz/monitoring-stack',
    featured: true,
  },
];

export default projects;
