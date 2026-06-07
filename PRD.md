# 🌌 Personal Developer Portfolio (alkamfrz_portfolio)
## Product Requirements Document (PRD) & Design Specification

This document serves as the absolute source of truth for the portfolio website's features, visual design system, accessibility rules, testing guidelines, and deployment gatekeeping criteria.

---

## 🎯 1. Project Overview & Goals

The goal of this project is to build an interactive, ultra-fast developer portfolio website to showcase technical projects, programming skills, and technical blog posts.

### Core Goals:
1. **Developer-Recruiter Balance**: Cater equally to technical recruiters seeking quick validation and fellow developers inspecting coding standards.
2. **Speed & Lightweight Footprint**: Build using **Astro v6** to output highly optimized static HTML with zero unnecessary client-side JavaScript.
3. **Immersive Dark Theme**: Apply a premium dark glassmorphism design system to reflect a modern, state-of-the-art developer brand.
4. **100% Automated Verification**: Maintain a robust E2E test coverage using **Playwright** to prevent regressions.

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
* Dynamically detects the current URL path to append an `.active` styling class to the current navigation link.
* **Responsive Toggle**: Displays standard navigation links on desktop, and collapses into a responsive hamburger drawer on mobile viewports.
* **Primary Selector**: The main logo link must have ID `#logo-link`.

### R2. Pages Layouts

#### 1. Home Page (`/`)
Must contain the following sections in this exact order:
1. **Hero Section**: 
   - Viewport height: `90vh` to `100vh`.
   - Heading uses a large, high-contrast dual-color linear gradient (class `text-gradient`).
   - Pure CSS background gradient orbs (no heavy image assets).
   - CTA buttons: *"View Projects"* (routes to `/projects`) and *"Read Blog"* (routes to `/blog`).
2. **About Section**:
   - Short biography describing development background, virtualization/homelab experience, and core programming interests.
3. **Skills Section (`#skills-section`)**:
   - Renders categorized skill badges loaded from `src/data/skills.js`.
   - Badges styled using the transparent `glass-card` look.
4. **Projects Preview (`#projects-grid`)**:
   - Displays up to 3 featured projects marked as `featured: true` in the data model.
   - Project cards (class `project-card` and `glass-card`) must contain: Title (`h3`), Description (`p`), tech badges (class `tech-badge`), GitHub source link (class `github-link`), and Live Demo link (class `live-link`).
   - Displays a redirection link pointing to the full `/projects` page.
5. **Blog Preview (`#blog-preview-section`)**:
   - Displays the 2 most recently published blog posts.
   - Post cards (class `blog-post-card`) contain: Title (`h3`), Date (class `post-date` formatted as `"Month DD, YYYY"`), Description (`p`), and a *"Read More"* link (class `read-more`) pointing to `/blog/[slug]`.
6. **Contact Section & Form (`#contact-form`)**:
   - Dynamic React component (`ContactForm.jsx`) loaded with `client:load`.
   - Name input (`#contact-name`) with validation error span (`#name-error`).
   - Email input (`#contact-email`) with validation error span (`#email-error`).
   - Message textarea (`#contact-message`) with validation error span (`#message-error`).
   - Submit button (`#contact-submit`). When sending, disables fields and displays `"Sending..."`.
   - Status banner (`#contact-status`) displaying success (class `success`) or error messages (class `error`). The form POSTs to `/api/contact` appending active URL query parameters (e.g. `?status=500`) to test API errors.
   - Outbound social links: GitHub (ID `#contact-github`), LinkedIn (ID `#contact-linkedin`), and Email (ID `#contact-email-link`, pointing to `mailto:alkamfrz@gmail.com`).

#### 2. Projects Catalog (`/projects`)
* Renders the full array of projects from `src/data/projects.js` inside grid `#projects-grid`.
* Cards follow the same specs as the Home page preview.
* If no projects exist, displays an empty state container (`#no-projects` containing the exact text `No projects found`).
* Document `<title>` must contain the word `"Projects"`.

#### 3. Blog Catalog (`/blog`)
* Displays all blog posts in a grid (`#blog-grid`) sorted by date (newest first).
* Cards follow the same specs as the Home page preview.
* If no posts exist, displays an empty state container (`#no-posts` containing the exact text `No posts found`).
* Document `<title>` must contain the word `"Blog"`.

#### 4. Blog Details Page (`/blog/[slug]`)
* Renders the individual post title in an `h1` and the markdown content in a container with class `blog-post-detail`.
* Configured using Astro Content Collections with a file glob loader in `src/content.config.ts`.

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
* Hover state raises cards by `-4px` using `transform` transitions, glows the border with blue, and adds a drop-shadow.

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
* **JSON-LD Schema**: Generates JSON-LD structured data for blog posts and project structures to improve search engine crawling.
* **Sitemap**: Compiles an automated XML sitemap during build stage.

---

## 🧪 7. Playwright Test Suite Specifications

The application includes an automated E2E test suite running **50 test cases** locally using `npm run test` or `npx playwright test`.

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

## 🚫 8. Out-of-Scope (OOS)

The following features are out of scope for version 1:
* **User Accounts & Login**: No administrator panel or authentication.
* **Database-driven Blog**: All posts are written as static markdown files and loaded from source code rather than a dynamic database.
* **Interactive Blog Comments**: No guest commenting or user engagement forum system.
* **Internal Mail Transfer Agent**: The contact form does not trigger direct emails from the VM. Submissions are sent as JSON to external webhooks or APIs.

---

## 🚀 9. Deployment Gatekeeping & Rollback Rules

To guarantee uptime and stability on the live site, deployments must adhere to these policies:

### Deployment Gatekeeping
1. **Local Test Compliance**: No commits should be pushed to the GitHub repository unless **100%** of the Playwright E2E tests pass locally.
2. **Warning-free Builds**: The local build compiler (`npm run build`) must compile with zero errors and warnings.

### Rollback Strategy
If a deployment fails in production (e.g. causes a container crash or HAProxy 502/503 errors):
1. **Revert Commits**: Check out the previous stable git commit tag in the local workspace.
2. **Push Revert**: Push the stable codebase back to GitHub's `main` branch.
3. **Trigger Rebuild**: Manually run the compose build command to fetch the stable commit and redeploy:
   ```bash
   ssh root@10.1.30.5 "cd /root/stacks/Portfolio && docker compose --env-file stack.env up -d --build"
   ```
