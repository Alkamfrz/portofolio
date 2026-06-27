# Alkamfrz Portfolio

Personal developer portfolio built with [Astro](https://astro.build) — terminal-inspired design, vanilla JS, zero framework runtime on the client.

## Commands

| Command | Action |
| :------ | :----- |
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build production site to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run Playwright E2E tests |
| `npm run test:local` | Chromium + Firefox + Mobile Chrome (skip webkit) |
| `npm run mock-server` | Start mock API server on port 3000 |
| `npm run audit` | Run Lighthouse CI audit |

## Project Structure

```
src/
  components/      — Vanilla JS (contact-form) + Astro (Footer)
  content/         — Blog markdown posts (Astro Content Collections)
  data/            — Static data (projects, skills)
  layouts/         — Layout.astro (HTML shell, terminal header)
  pages/           — Routes: index, projects, blog, blog/[slug], 404
  styles/          — global.css (terminal design system, @layer architecture)
public/            — Static assets (images, favicon, CV PDF, robots.txt)
tests/             — Playwright E2E specs (smoke, tier1, tier2, accessibility)
```

## Design

Terminal/dataviz aesthetic: green-on-dark palette (`#00ff41` on `#0a0b0e`), grid background, monospace UI, filesystem-tree skills, git-log experience timeline, LED status badges. CSS `@layer` architecture (base → components → utilities), self-hosted Inter + system monospace fonts, `font-display: optional`. No CSS frameworks, no icon libraries, no analytics.

## Tech Stack

Astro 7 · TypeScript · Vanilla JS · Playwright · Docker · Nginx

## Deployment

Docker multi-stage (Node 22 → nginx alpine), deployed via Docker Compose to home server from `github.com/Alkamfrz/portofolio.git#main`.
