# AGENTS.md — Alkamfrz Portfolio

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Static build to `./dist/` |
| `npm run preview` | Preview production build locally |
| `npm run test:local` | Playwright on chromium + firefox + Mobile Chrome (omit webkit — known Windows hang) |
| `npm run test` | All Playwright projects including webkit |
| `npm run mock-server` | Mock API on port 3000 (contact form testing) |
| `npm run audit` | Build → serve → Lighthouse CI (all scores ≥ 0.95) |
| `npm run capture` | Take Playwright screenshots for docs |

No lint / typecheck scripts. For accessibility: `npx playwright test tests/accessibility.spec.ts --project=chromium`.

## Architecture

- **Astro 6** static site (`output: 'static'`) with React 19 islands (ContactForm, Header) and Astro components (Footer). No SSR or framework router. Header uses `client:idle` (deferred hydration), ContactForm uses `client:load` (eager).
- **Vanilla CSS** in `src/styles/global.css` — glassmorphism design system, no Tailwind. Stylesheets inlined (`inlineStylesheets: 'always'`).
- **Content Collections** (`src/content.config.ts`): blog posts loaded via `glob()` from `src/content/blog/*.md`. Schema enforces `title`, `date`, `description`.
- **Data**: `src/data/projects.js`, `src/data/skills.js`.
- **Pages**: `src/pages/index.astro`, `projects.astro`, `blog/index.astro`, `blog/[slug].astro`, `404.astro`.
- **Layout**: `src/layouts/Layout.astro` — HTML shell, shared `<head>`, theme toggle script inlined.
- **Contact form**: React at `src/components/ContactForm.jsx` — Formspree production endpoint, mock-server for local testing. **Mock server content is a separate simulation** — its hardcoded blog posts/projects can drift from real Content Collections and data files.
- **Detailed design spec**: `PRD.md` at root — design system, accessibility rules, testing guidelines, deployment gates.

## Testing

- Playwright uses `npx astro preview --port 4321` as web server (not `astro dev`).
- `npm run test` runs ALL 5 projects (chromium, firefox, webkit, Mobile Chrome, Mobile Safari). Use `test:local` on Windows to skip webkit.
- Four test tiers, run from fastest/cheapest to most expensive:
  - `smoke.spec.ts` — basic sanity
  - `tier1.spec.ts` — feature coverage (25 tests)
  - `tier2.spec.ts` — boundary & corner cases (25 tests)
  - `accessibility.spec.ts` — axe-core WCAG 2.1 AA scans (fails on critical/serious)
- Focused: `npx playwright test tests/tier1.spec.ts --project=chromium`
- CI: 1 worker, 2 retries; Local: 2 workers, 0 retries.
- Playwright config forces `colorScheme: 'dark'` — tests always run in dark mode.
- `scripts/run-tests.js` coordinates mock-server + Playwright for CI runs.

## Deployment

- Docker multi-stage (Node 22 → nginx alpine). Built via `docker compose up -d --build` on home server at 10.1.30.5.
- Builds from `github.com/Alkamfrz/portofolio.git#main`.
- Nginx config at `nginx.conf`: gzip, `try_files` fallback for SPA-like routing, 1y cache on assets.

## Style & Conventions

- **Node.js >=22.12.0** required (enforced in `package.json` engines).
- **No Google Fonts CDN** — fonts self-hosted as woff2 in `/public/fonts/`. Update via `node scripts/download-fonts.js`.
- Astro components use `.astro`; interactive islands use `.jsx` (React 19).
- `dist/`, `.astro/`, `.agents/` are gitignored.
