# Repository Guidelines

## Project Structure

```
src/
  components/          — React (ContactForm, Header) + Astro (Footer) islands
  content/             — Blog markdown posts (Astro Content Collections)
  content.config.ts    — Blog collection schema (title, date, description via glob)
  data/                — Static data (projects.js, skills.js)
  layouts/Layout.astro — HTML shell with meta, theme script, scroll widgets, toast
  pages/               — Routes: index, projects, blog, blog/[slug], 404
  plugins/             — Custom Astro plugin (astro-mac-code-blocks.mjs)
  styles/global.css    — Glassmorphism design system (~1666 lines), vanilla CSS
public/                — Static assets (images, favicon, CV PDF, robots.txt)
tests/                 — Playwright E2E specs (smoke, tier1, tier2, accessibility)
scripts/               — Dev scripts (run-tests, download-fonts, audit-lighthouse, capture-screenshots)
```

Keep all CSS in `global.css` — no Tailwind, no CSS-in-JS. Add icons as inline SVG. No external icon libraries or analytics.

## Architecture

**Stack**: Astro 7 static site (`output: 'static'`), React 19 islands (`client:load`, `client:idle`), TypeScript strict mode, vanilla CSS inlined at build (`inlineStylesheets: 'always'`).

**Key patterns**:
- No runtime routing — every page is pre-rendered HTML. Interactivity via vanilla `<script>` tags (scroll-reveal, timeline tabs, homelab topology, blog TOC, project filters).
- Dual-theme via CSS custom properties on `[data-theme]`, `prefers-color-scheme` as initial fallback.
- Self-hosted fonts (Inter + Outfit woff2) — no Google Fonts CDN. Update via `node scripts/download-fonts.js`.
- Canvas particles in hero (60 particles, mouse interaction, paused when out of view / tab hidden).
- Homelab page uses SVG network topology with vanilla JS (click-to-select, tooltip, action buttons).
- Build-time Mac code block wrapper via `astro:build:done` hook — zero client overhead.
- JSON-LD structured data: Person + ProfilePage + WebSite on home, ItemList on projects, BlogPosting on blog detail.
- Contact form POSTs to Formspree in production. Mock server (port 3000, pure Node http) for local testing.

## Build, Test & Dev Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Static build to `dist/` |
| `npm run preview` | Preview production build locally (used by Playwright) |
| `npm run test` | Full Playwright suite (5 projects, inc. webkit) |
| `npm run test:local` | Chromium + Firefox + Mobile Chrome (skip webkit — Windows hang) |
| `npm run mock-server` | Mock API on port 3000 (contact form testing, rate limited 100/15min) |
| `npm run audit` | Build → serve → Lighthouse CI (all scores ≥ 0.95) |
| `npm run capture` | Playwright screenshots for docs |
| `npm run deploy` | Build site to dist/ |

Focused test: `npx playwright test tests/smoke.spec.ts --project=chromium`
Accessibility: `npx playwright test tests/accessibility.spec.ts --project=chromium`

No lint or typecheck scripts are configured.

## Coding Style & Naming Conventions

- **TypeScript** strict mode (`astro/tsconfigs/strict`), `jsx: "react-jsx"`, `jsxImportSource: "react"`
- **Indentation**: 2 spaces, no tabs
- **Files**: PascalCase for components (`Header.jsx`, `ContactForm.jsx`), `.astro` for Astro components, `.jsx` for React islands, kebab-case for assets and config files
- **CSS**: vanilla in `global.css` using CSS custom properties. Glassmorphism tokens, typography scale (minor third 1.2), theme-aware scrollbars, form styles, toast/snackbar system, empty states. `prefers-reduced-motion: reduce` disables all animations.
- **Node**: `>=22.12.0` enforced in `engines`. `"type": "module"`.
- **Convention**: No Google Fonts CDN, no Tailwind, no CSS-in-JS, no external icon libraries, no analytics.

## Testing Guidelines

**Framework**: Playwright via `@playwright/test`. **Web server**: `npx astro preview --port 4321` (not `astro dev`).

**Test tiers** (run cheapest first):
- `smoke.spec.ts` — 20 basic sanity tests
- `tier1.spec.ts` — 25 feature coverage tests across 5 areas
- `tier2.spec.ts` — 25 boundary & corner case tests (empty, overflow, error, XSS)
- `accessibility.spec.ts` — axe-core WCAG 2.1 AA scans, fails on critical/serious

**Browser projects**: chromium, firefox, webkit, Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12). CI = 1 worker, 2 retries; Local = 2 workers, 0 retries. `colorScheme: 'dark'` forced.

**Mock server**: `mock-server.js` (pure Node http, no Express) — rate limited (100/15min per IP), supports `?status=200|429|500`, honeypot detection, 120s idle watchdog.

**CI runner**: `scripts/run-tests.js` coordinates mock-server + Playwright with 120s force-exit timeout.

Pages contain `if (navigator.webdriver)` blocks that manipulate DOM for test assertions (empty states, overflow, count manipulation).

**Run full suite**: `npm run test`. Single spec: `npx playwright test tests/<file>.spec.ts --project=chromium`.

## Commit & Pull Request Guidelines

Commits follow conventional commits with type prefixes observed in history: `feat:`, `fix:`, `perf:`, `style:`, `refactor:`, `docs:`, `chore:`, `security:`, `ux:`. Use lowercase, present-tense descriptions (e.g., `perf: change prefetch strategy from hover to viewport`).

PRs should include description of changes, reference related issues, and include screenshots for UI changes. Deployment gated on Lighthouse all ≥ 0.95 and Playwright 100% pass.

## Deployment

Docker multi-stage (Node 22 → nginx alpine), built via `docker compose up -d --build`. Target: home server. Nginx serves with gzip, `try_files` fallback, 1y cache on hashed assets, custom 404.

## Agent-Specific Instructions

- Read **PRD.md** (root) for full spec: design system tokens, accessibility rules (WCAG 2.1 AA), testing guidelines, deployment gates.
- Avoid adding external CSS frameworks, icon libraries, or analytics — project deliberately uses vanilla CSS and inline SVG.
- Keep `output: 'static'` — no SSR or API routes.
- Mock server content (`mock-server.js`) is a separate simulation — its hardcoded blog posts and projects can drift from real Content Collections and data files.
- Use `npm run mock-server` when testing contact form interactions locally.
