# CLAUDE.md — Alkamfrz Portfolio

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Static build to `./dist/` |
| `npm run preview` | Preview production build locally (used by Playwright) |
| `npm run test:local` | Playwright chromium + firefox + Mobile Chrome (skip webkit — Windows hang) |
| `npm run test` | All 5 Playwright projects inc. webkit |
| `npm run mock-server` | Mock API on port 3000 (contact form testing) |
| `npm run audit` | Build → serve → Lighthouse CI (all scores ≥ 0.95) |
| `npm run capture` | Playwright screenshots for docs |

Focused test: `npx playwright test tests/smoke.spec.ts --project=chromium`
Accessibility: `npx playwright test tests/accessibility.spec.ts --project=chromium`

No lint/typecheck scripts exist.

## Architecture

### Stack
- **Astro 6** static site (`output: 'static'`), no SSR or API routes
- **React 19** islands: `Header.jsx` (`client:idle`), `ContactForm.jsx` (`client:load`)
- **Vanilla CSS** in `src/styles/global.css` (1666 lines) — glassmorphism design system, CSS custom properties, no Tailwind/CSS-in-JS. Inlined at build (`inlineStylesheets: 'always'`).
- **Self-hosted fonts** (Inter + Outfit woff2) — no Google Fonts CDN
- **No external icon libs** — all icons inline SVG
- **No analytics/tracking** in v1

### Source map
```
src/
  content.config.ts          — Blog collection schema (title, date, description via glob)
  components/
    ContactForm.jsx          — React island, Formspree POST + mock-server fallback
    Footer.astro             — Static social links + copyright
    Header.jsx               — React island, nav + hamburger + theme toggle + scroll progress
  content/blog/              — 4 markdown blog posts with frontmatter
  data/
    projects.js              — 5 projects with techStack, links, featured flag, status
    skills.js                — 6 categories of skills
  layouts/Layout.astro       — HTML shell, theme script, scroll-reveal/scroll-spy/reading-progress/back-to-top/toast
  pages/
    index.astro              — Home (hero + canvas particles, about, skills, experience timeline, featured projects, homelab SVG topology, blog preview, contact form)
    projects.astro           — Project grid with tech filter bar, URL param persistence
    404.astro                — Minimal glass card
    blog/
      index.astro            — Blog grid with search filter
      [slug].astro           — Post detail with breadcrumbs, TOC sidebar, font-size widget, Mac code blocks, social sharing, related posts
  plugins/
    astro-mac-code-blocks.mjs — Build hook: post-processes HTML, wraps <pre> with Mac-style header + copy button
  styles/global.css          — All design tokens, glassmorphism, animations, dual-theme overrides
```

### Key patterns
- **No runtime routing** — every page is pre-rendered HTML. Interactivity via vanilla JS <script> tags (scroll-reveal, timeline tabs, homelab topology, blog TOC, project filters).
- **Dual-theme** — CSS custom properties on `[data-theme]` attribute, `prefers-color-scheme` as initial fallback. No JS-driven theme switching beyond setting the attribute.
- **Build-time transforms** — Mac code block wrapper applied via astro:build:done hook (zero client overhead).
- **Test driver scripts** — pages contain inline `if (navigator.webdriver)` blocks that manipulate DOM for test assertions (empty states, overflow, count manipulation).
- **Contact form** — production POST to Formspree. Mock server (port 3000) for local testing. Content in mock-server.js is a **separate simulation** — its hardcoded blog posts/projects can drift from real Content Collections and data files.
- **Homelab page** — SVG network topology (6 nodes) with CSS animation, tooltip on hover, click-to-select detail panel, per-node action buttons. All vanilla JS.
- **Canvas particles** — Hero section has 60-particle system with mouse interaction, paused when out of view / tab hidden.
- **JSON-LD** — Person + ProfilePage + WebSite on home, ItemList/CreativeWork on projects, BlogPosting on blog detail.

### CSS design system
- Custom properties: `--accent-cyan`, `--accent-blue`, `--accent-purple`, glassmorphism tokens, typography scale (minor third 1.2)
- Dark theme default, light via `[data-theme="light"]`
- `prefers-reduced-motion: reduce` disables all animations
- Scroll-reveal: `.reveal`, `.reveal-left`, `.reveal-scale` with staggered delays
- Glass-card: `backdrop-filter: blur(16px)`, hover lift + glow
- Theme-aware scrollbars, form styles, toast/snackbar system, empty states

## Testing

- **Web server**: `npx astro preview --port 4321` (not `astro dev`)
- **4 test tiers** (run cheapest first):
  - `smoke.spec.ts` — 20 basic sanity tests
  - `tier1.spec.ts` — 25 feature coverage tests across 5 feature areas
  - `tier2.spec.ts` — 25 boundary & corner case tests (empty/overflow/error/XSS)
  - `accessibility.spec.ts` — axe-core WCAG 2.1 AA scans, fails on critical/serious
- **5 browser projects**: chromium, firefox, webkit, Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12)
- **Config**: CI = 1 worker, 2 retries; Local = 2 workers, 0 retries; `colorScheme: 'dark'` forced
- **Mock server**: `mock-server.js` (pure Node http, no Express) — rate limited (100/15min per IP), supports `?status=200|429|500`, honeypot detection, 120s idle watchdog
- **CI runner**: `scripts/run-tests.js` coordinates mock-server + Playwright, 120s force-exit timeout

## Deployment

- Docker multi-stage (Node 22 → nginx alpine), built via `docker compose up -d --build`
- Target: home server at 10.1.30.5
- Source: `github.com/Alkamfrz/portofolio.git#main`
- Nginx: gzip, `try_files` fallback, 1y cache on hashed assets, custom 404

## Detail Design

`PRD.md` at root contains full spec: design system tokens, accessibility rules (WCAG 2.1 AA), testing guidelines, deployment gates (Lighthouse all ≥ 0.95, Playwright 100% pass).

## Conventions

- Node.js >=22.12.0 (enforced in engines)
- Astro = `.astro`; interactive islands = `.jsx` (React 19)
- `dist/`, `.astro/`, `.agents/` gitignored
- Fonts: self-hosted woff2. Update via `node scripts/download-fonts.js`.
- No Google Fonts CDN, no Tailwind, no CSS-in-JS, no external icon libraries
