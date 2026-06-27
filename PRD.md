# 🌌 Personal Developer Portfolio (alkamfrz_portfolio)
## Product Requirements Document (PRD) & Design Specification

> **Last updated:** 2026-06-14 — Performance optimization pass v1 (self-hosted fonts, preload hints, lazy loading, Core Web Vitals, prefers-reduced-motion, theme-aware scrollbars)

This document serves as the absolute source of truth for the portfolio website's features, visual design system, accessibility rules, testing guidelines, and deployment gatekeeping criteria.

---

## 🎯 1. Project Overview & Goals

The goal of this project is to build an interactive, ultra-fast developer portfolio website to showcase technical projects, programming skills, and technical blog posts.

### Core Goals:
1. **Developer-Recruiter Balance**: Cater equally to technical recruiters seeking quick validation and fellow developers inspecting coding standards.
2. **Speed & Lightweight Footprint**: Build using **Astro v6** to output highly optimized static HTML with zero unnecessary client-side JavaScript.
3. **Terminal-Inspired Design**: Apply a dark terminal/dataviz design system with green-on-dark palette, grid background, monospace UI, and CLI-inspired interactions.
4. **100% Automated Verification**: Maintain a robust E2E test coverage using **Playwright** to prevent regressions.
5. **Reading Comfort**: Typography scaling system, prose width constraints, font-size widget, and Mac-style code blocks ensure a premium reading experience on both desktop and mobile.
6. **Visual Delight**: Terminal prompt animations, filesystem-tree skill visualization, git-log timeline, LED status indicators, and subtle hover interactions.

---

## 👥 2. Target Audience & User Stories

### User Personas
* **Persona A: Sarah (Technical Recruiter)**
  - *Goal*: Quickly assess if the developer has the required technical skills and view their featured projects.
  - *Needs*: High-speed page loads, clear skill categorization, direct links to GitHub source code, and a reliable contact form.
* **Persona B: Alex (Senior Developer / Open-Source Collaborator)**
  - *Goal*: Evaluate code quality, read technical blog posts to gauge problem-solving capabilities, and check the developer's tools and stack.
  - *Needs*: Clean semantics, readable blog text layout, accessible links, and links to source code repositories.

### Key User Stories
* *As a Recruiter*, I want to view projects on a mobile viewport and easily access the Live Demo link, so that I can evaluate the developer's work on the go.
* *As a Developer*, I want to browse blog posts sorted by date, so that I can read the most recent technical findings.
* *As a Visitor*, I want to submit a contact request and receive immediate visual feedback, so that I know my message went through.

---

## 📊 3. Product Success Metrics (KPIs)

To guarantee the website meets premium quality standards, the production build must satisfy these performance budgets:
* **Lighthouse Audit Targets**:
  - **Performance**: $\ge 95$
  - **Accessibility**: $\ge 95$
  - **Best Practices**: $\ge 95$
  - **SEO**: $\ge 95$
* **Page Load Times**:
  - **Desktop**: Largest Contentful Paint (LCP) under **1.2 seconds**.
  - **Mobile**: Largest Contentful Paint (LCP) under **2.0 seconds**.
* **Functional Integrity**: 
  - **100%** of the Playwright E2E test cases must execute successfully.

---

## 🛠️ 4. Functional Requirements & Page Specifications

### R1. Dynamic Navigation Header
* Renders a fixed navigation bar at the top of the viewport.
* Dynamically detects the current URL path to append an `.active` styling class to the current navigation link, with `aria-current="page"` for screen readers.
* **Responsive Toggle**: Displays standard navigation links on desktop, and collapses into a responsive hamburger drawer on mobile viewports.
* **Staggered Animation**: Mobile nav links fade in sequentially with `transition-delay` on open.
* **Overlay**: A semi-transparent backdrop overlay (`#nav-overlay`) appears behind mobile menu, closes on escape key.
* **Compact State**: On scroll past 80px, the header shrinks (reduced padding, smaller logo/font) via `.header.compact`.
* **Primary Selector**: The main logo link must have ID `#logo-link`.

### R2. Pages Layouts

#### 1. Home Page (`/`)
Must contain the following sections in this exact order:
1. **Hero Section**: 
   - Viewport height: `90vh` to `100vh`.
   - Heading uses a large, high-contrast dual-color linear gradient (class `text-gradient`).
   - Grid background pattern (CSS linear-gradient, pseudo-element, no image assets).
    - CTA buttons: *"View Projects"* (routes to `/projects`) and *"Read Blog"* (routes to `/blog`).
    - Primary CTA has `.btn-pulse` for a subtle box-shadow animation.
    - Scroll-down indicator (`.scroll-indicator`) at bottom with "Scroll" label and chevron.
 2. **About Section**:
    - Short biography describing development background, virtualization/homelab experience, and core programming interests.
    - Uses `.card-accent` class for a left cyan accent border.
 3. **Skills Section (`#skills-section`)**:
    - Renders categorized skill badges loaded from `src/data/skills.js`.
    - Badges styled using the transparent `glass-card` look.
    - Skills have proficiency levels: `.skill-level-advanced` (cyan), `.skill-level-expert` (blue), `.skill-level-proficient` (purple) via color-coded backgrounds.
 4. **Experience Section (`#experience`)**:
    - Timeline switcher with two tabs: *"Work Experience"* (`#tab-work`) and *"Education"* (`#tab-edu`) to toggle visibility of lists.
    - Individual cards show date, role/degree, and brief description, with an expandable *"Show details"* button (`.timeline-details-btn`) that toggles the display of comprehensive bullet points.
    - Experience cards feature distinct color-coded badges and border hover glows based on category (work vs education).
 5. **Projects Preview (`.featured-projects-wrapper`)**:
    - Displays up to 3 featured projects marked as `featured: true` in the data model.
    - First featured project is rendered as `.spotlight` (full-width with 2-column layout on desktop, gradient background border).
    - Project cards (class `project-card` and `glass-card`) must contain: Title (`h3`), Description (`p`), tech badges (class `tech-badge`), GitHub source link (class `github-link`), and Live Demo link (class `live-link`).
    - Project card header shows a `.tag-chip` "Featured" label on the spotlight card.
    - Sections use `.section-hidden` / `.section-visible` for fade-in on scroll.
    - Displays a redirection link pointing to the full `/projects` page.
 6. **Homelab Architecture (`#homelab`)**:
    - Interactive SVG topology diagram tracing the secure data flow (WAN, Cloudflare Tunnel, HAProxy, Proxmox VE, Docker VM, UGREEN NAS).
    - Hovering over a node displays a floating tooltip with node name and IP segment.
    - Clicking a node pins it as the active selection, updates the details panel (`#node-details-panel`), and highlights relevant network connections.
    - Close button `(×)` (`#details-close-btn`), re-clicking the active node, or clicking empty diagram space deselects the node.
    - Selected nodes display dynamic action buttons in the details panel (e.g., *"Read Setup Guide"*, *"GitHub Repo"*), styled dynamically via `:global()` selectors to bypass Astro CSS scoping limits.
 7. **Blog Preview (`#blog-preview-section`)**:
    - Displays the 2 most recently published blog posts in a 2-column grid.
    - Post cards (class `blog-post-card`) contain: Title (`h3`), Date (class `post-date` formatted as `"Month DD, YYYY"`), reading time (class `.post-reading-time`), Description (`p`), and a *"Read More"* link (class `read-more`) pointing to `/blog/[slug]`.
 8. **Contact Section & Form (`#contact-form`)**:
    - Vanilla JS contact form (`contact-form.js`) with Formspree POST + mock-server fallback.
   - Name input (`#contact-name`) with validation error span (`#name-error`).
   - Email input (`#contact-email`) with validation error span (`#email-error`).
   - Message textarea (`#contact-message`) with validation error span (`#message-error`).
    - Rate-limiting, spam protection, and email routing are handled natively by Formspree (production endpoint). Honeypot parameters deter bot submissions.
    - Local mock server implements rate-limiting on `/api/contact` for testing validation.
    - Submit button (`#contact-submit`). When sending, disables fields and displays `"Sending..."`.
    - Status banner (`#contact-status`) displaying success (class `success`) or error messages (class `error`). The form POSTs to Formspree in production, appending active URL query parameters (e.g. `?status=500`) to mock API errors for E2E test assertions.
   - Outbound social links: GitHub (ID `#contact-github`), LinkedIn (ID `#contact-linkedin`), and Email (ID `#contact-email-link`, pointing to `mailto:alkamfrz@gmail.com`).

#### 2. Projects Catalog (`/projects`)
* Renders the full array of projects from `src/data/projects.js` inside grid `#projects-grid`.
* Cards follow the same specs as the Home page preview.
* Each project card shows a colored `status-badge` (`.active` green, `.archived` yellow, `.dev` blue) and a date string.
* **Filter Bar**: Tech-stack filter buttons (`.filter-btn`) at top. Clicking a filter hides/shows cards with a scale animation. Filter state is stored in URL search params (`?tag=Docker`) and restored on page load. Browser back/forward navigation preserves the selected filter via `popstate` event.
* If no projects exist, displays an empty state container (`#no-projects` containing the exact text `No projects found`).
* Document `<title>` must contain the word `"Projects"`.

#### 3. Blog Catalog (`/blog`)
* Displays all blog posts in a grid (`#blog-grid`) sorted by date (newest first).
* Cards follow the same specs as the Home page preview, plus reading time (`.post-reading-time`) displayed next to the date.
* **Search**: An input field (`#blog-search`) at the top of the page filters cards by title match in real-time.
* If no posts exist, displays an empty state container (`#no-posts` containing the exact text `No posts found`).
* Document `<title>` must contain the word `"Blog"`.

#### 4. Blog Details Page (`/blog/[slug]`)
* Renders the individual post title in an `h1` and the markdown content in a container with class `blog-post-detail`.
* Configured using Astro Content Collections with a file glob loader in `src/content.config.ts`.
* **Breadcrumbs**: Navigation bar showing `Home > Blog > Post Title`.
* **Reading Stats**: Displays reading time (X min read) and word count calculated from the content body.
* **Font-size Widget**: Floating A- / A / A+ buttons to dynamically scale the article text (`.text-sm`, `.text-md`, `.text-lg`).
* **Sticky Table of Contents**: On screens >= 1200px, renders a side panel with auto-generated links from `h2`/`h3` headings. Active heading is highlighted via scroll spy. A progress bar (`.toc-progress`) fills from top to bottom as the user reads.
* **Mac-style Code Blocks**: All `<pre>` blocks are wrapped with a header showing Mac dots, language label, and a "Copy" button. Multi-line blocks display at `0.92rem` with `tab-size: 2`.
* **Social Sharing**: Share buttons for Twitter/X and LinkedIn via popup windows, plus a "Copy Link" button using the Clipboard API.
* **Related Posts**: Two suggested posts (most recent excluding current) shown in a grid below the article.

#### 5. 404 Fallback Page (`/404.html`)
* Renders a not-found card (`#not-found-card`) displaying `404` and a return link (`#go-home-link`) back to `/`.

---

## 🎨 5. Design System & Styling Spec

Styling uses **Vanilla CSS** with scoped rules. Global design tokens are defined in `src/styles/global.css`.

### Core Color Palette & Variables
* **Body Background (`--bg-dark`)**: `#0f172a` (deep slate black / `rgb(15, 23, 42)`).
* **Card Overlay (`--glass-bg`)**: `rgba(255, 255, 255, 0.03)` (semi-transparent white).
* **Card Border (`--glass-border`)**: `rgba(255, 255, 255, 0.08)`.
* **Primary Text (`--text-light`)**: `#f8fafc`.
* **Secondary Text (`--text-muted`)**: `#94a3b8`.
* **Accent Colors**: Cyan (`#22d3ee`), Blue (`#3b82f6`), and Purple (`#a855f7`).
* **Linear Gradients**:
  - Primary (`--gradient-primary`): `linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))`
  - Secondary (`--gradient-secondary`): `linear-gradient(135deg, var(--accent-blue), var(--accent-purple))`
  - Text (`--gradient-text`): `linear-gradient(to right, var(--accent-cyan), var(--accent-purple))`
* **Typography**: Outfit/Inter font family.

### Glassmorphism Styles (`.glass-card`, `.project-card`)
* Background set to `var(--glass-bg)` with `backdrop-filter: blur(12px)` and `-webkit-backdrop-filter: blur(12px)`.
* Hover state raises cards by `-6px` using `transform` transitions, glows the border with blue, and adds a drop-shadow.
* `.glow-hover` variant adds a cyan glow (`box-shadow: 0 0 30px rgba(34, 211, 238, 0.15)`) on hover.

### Scroll-Reveal Animation System
* Three reveal classes control entrance animations via Intersection Observer:
  - `.reveal`: fades in + slides up 24px.
  - `.reveal-left`: fades in + slides left 24px (used for timeline items).
  - `.reveal-scale`: fades in + scales from 0.95.
* Staggered delays: `.reveal-delay-1` through `.reveal-delay-5` at 0.1s increments.
* All sections use `.section-hidden` / `.section-visible` for fade-in on scroll.
* All animations respect `prefers-reduced-motion: reduce`.

### Typography Scale
* CSS variables define a minor-third scale: `--text-xs` (0.75rem) through `--text-5xl` (4.5rem).
* Line-height variables: `--leading-tight` (1.15), `--leading-normal` (1.6), `--leading-relaxed` (1.8).
* `.prose` utility class constrains long-form text to 720px with proper heading spacing and accent borders.

### Asset Optimization & Media Specs
* **Image Formats**: All images must be served in WebP or AVIF next-gen formats.
* **Responsive Optimization**: Use Astro's native `<Image />` component for automatic optimization, cropping, and dynamic resizing of media assets during the build process to minimize Largest Contentful Paint (LCP).
* **Lazy Loading**: All below-the-fold images must carry `loading="lazy"` and `decoding="async"` attributes. Above-the-fold LCP images carry `loading="eager"`, `decoding="sync"`, and `fetchpriority="high"`.
* **CLS Prevention**: Global CSS enforces `img { max-width: 100%; height: auto; }` to prevent Cumulative Layout Shift across all image elements.

### Font Performance
* **Self-Hosted Fonts**: Inter and Outfit font families are served from `/public/fonts/` as woff2 files — no Google Fonts CDN dependency.
* **Critical Preloads**: Inter 400/500 (body text) and Outfit 700/800 (headings) are declared with `<link rel="preload">` in the document `<head>` to make them available before the first paint.
* **font-display: swap**: All `@font-face` rules use `font-display: swap` to prevent invisible text during font load (FOIT).

### Accessibility & Motion
* **`prefers-reduced-motion`**: A CSS `@media (prefers-reduced-motion: reduce)` rule disables all keyframe animations and transitions site-wide for users with vestibular or motion sensitivity settings.
* **CSS @layer Architecture**: Styles organized in cascade layers (base → components → utilities) for predictable specificity and smaller bundles.
* **Theme-Aware Scrollbars**: Scrollbar track and thumb colors use CSS custom properties (`--page-bg`, `--glass-border`) so they correctly adapt between dark and light mode.

---

## ♿ 6. Accessibility (a11y) & SEO Requirements

### Accessibility (WCAG 2.1 AA Compliance)
* **Keyboard Navigation**: Interactive elements (inputs, buttons, anchors) must have visible focus rings (`:focus-visible`) and follow tab indexing.
* **Aria Labels**: Outbound social icons and nav buttons must have descriptive `aria-label` attributes (e.g. `aria-label="Visit my GitHub profile"`).
* **Contrast Ratios**: Body copy and metadata text must maintain a minimum contrast ratio of **4.5:1** against the dark background.
* **Form Accessibility**: Form fields must have associated descriptive `<label>` elements or clear accessibility titles.

### Search Engine Optimization (SEO)
* **Metadata**: Every page must render unique title tags, meta descriptions, and viewport declarations.
* **Social Graph (Open Graph)**: Renders Open Graph tags (`og:title`, `og:description`, `og:type`, `og:image`) for rich link sharing.
* **JSON-LD Schema**: Generates structured data to improve search engine crawling:
  - Home Page: `Person` and `ProfilePage` schemas detailing author info and career bio.
  - Blog detail pages: `BlogPosting` schema containing article timestamps, author profile, and headings.
  - Project detail pages: `CreativeWork` schema listing project description, technologies, and repositories.
* **Sitemap**: Compiles an automated XML sitemap during build stage.

---

## 🧪 7. Playwright Test Suite Specifications

The application includes an automated E2E test suite running **203 test cases** across 3 browser engines (`chromium`, `firefox`, `Mobile Chrome`) using `npm run test:local` or `npx playwright test`.

> [!NOTE]
> Local executions on Windows hosts may experience Webkit engine hangs due to driver incompatibility. Developers should run stable targets locally (e.g. `npx playwright test --project=chromium --project=firefox --project="Mobile Chrome"`) while relying on CI pipelines for Webkit coverage.

### Tier 1: Core Layout, Elements & Navigation (`tests/tier1.spec.ts`)
* Assert presence of primary header links and `#logo-link`.
* Verify that header routing navigates cleanly between pages.
* Verify hamburger menu drawer trigger on mobile viewports (`375px` width).
* Verify background colors match `--bg-dark` and card elements possess `backdrop-filter: blur(...)` rules.

### Tier 2: Dynamic Form States, APIs & Slugs (`tests/tier2.spec.ts`)
* Assert that the contact form handles `POST` requests and appends URL parameters during execution.
* Mock API endpoint responses to assert UI banner states:
  - Response `200` triggers success banner display (class `success`).
  - Response `429` triggers rate limit warning banner (class `error`).
  - Response `500` triggers internal server error banner (class `error`).
* Assert that empty states (`#no-projects`, `#no-posts`) show when lists are empty.
* Verify dynamic slug routing by navigating directly to `/blog/setting-up-a-secure-home-server` and verifying title headers.

---

## 🚀 8. Deployment Gatekeeping & Rollback Rules

To guarantee uptime and stability on the live site, deployments must adhere to these policies:

### Deployment Gatekeeping
1. **Local Test Compliance**: No commits should be pushed to the GitHub repository unless **100%** of the Playwright E2E tests pass locally.
2. **Warning-free Builds**: The local build compiler (`npm run build`) must compile with zero errors and warnings.

### Rollback Strategy
If a deployment fails in production:
1. **Revert Commits**: Check out the previous stable git commit tag in the local workspace.
2. **Push Revert**: Push the stable codebase back to GitHub's `main` branch.
3. **Trigger Rebuild**: Manually run the compose build command to fetch the stable commit and redeploy:
   ```bash
   ssh root@10.1.30.5 "cd /root/stacks/Portfolio && docker compose --env-file stack.env up -d --build"
   ```

### Observability & Telemetry Rules
1. **Local Telemetry**: Write all runtime exception logs and console telemetry to stdout/stderr inside the Docker/Nginx containers.
2. **Production Tracking**: Out-of-scope for version 1 to minimize client-side bundle size. Telemetry integration (such as Sentry or a self-hosted GlitchTip instance) is planned for the v2 roadmap.
