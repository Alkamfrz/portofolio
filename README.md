# Alkamfrz Portfolio

Personal developer portfolio built with [Astro](https://astro.build) + React, featuring glassmorphism design, Playwright E2E tests, and Docker-based deployment.

## Commands

| Command                 | Action                                   |
| :---------------------- | :--------------------------------------- |
| `npm run dev`           | Start dev server at `localhost:4321`     |
| `npm run build`         | Build production site to `./dist/`       |
| `npm run preview`       | Preview production build locally         |
| `npm run test`          | Run Playwright E2E tests (50 tests)      |
| `npm run mock-server`   | Start mock API server on port 3000       |
| `npm run audit`         | Run Lighthouse CI audit                  |

## Project Structure

```
src/
├── components/      # React (ContactForm, Header) + Astro (Footer)
├── content/         # Blog markdown posts (Astro Content Collections)
├── data/            # Static data (projects, skills)
├── layouts/         # Layout.astro (HTML shell)
├── pages/           # Routes: index, projects, blog/, blog/[slug], 404
└── styles/          # global.css (design system)
tests/               # Playwright E2E specs (tier1, tier2)
```

## Deployment

Built via Docker multi-stage (Node 22 → nginx alpine). Deployed to home server at `10.1.30.5` through Docker Compose, building directly from `github.com/Alkamfrz/portofolio.git#main`.

## Tech Stack

Astro 6 · React 19 · TypeScript · Playwright 1.60 · Docker · Nginx
