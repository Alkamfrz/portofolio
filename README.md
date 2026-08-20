# alkamfrz.id

Personal portfolio — static Astro site published at [alkamfrz.id](https://alkamfrz.id).
No runtime framework, vanilla CSS, small inline JS for the contact form and project filters.

## Tech

- Astro v7 (static output, inline stylesheets)
- `@astrojs/sitemap`
- Cloudflare Pages (auto-deploys on push to `main`)

## Commands

```bash
npm run dev          # local dev server
npm run build        # build to dist/
npm run check:links  # verify all outbound links return 200
```

## Structure

- `src/pages/` — routes (index, homelab-architecture, 404)
- `src/data/index.js` — all content (experience, projects, skills, certs)
- `src/layouts/Layout.astro` — shared layout, nav, dark theme
- `src/components/ProjectCard.astro` — project card component
- `public/` — static assets (CV, favicon, og-image, `_headers`, `robots.txt`)
