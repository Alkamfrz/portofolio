# 🌌 Personal Developer Portfolio (alkamfrz_portfolio)
## Product Requirements Document (PRD) & Design Specification

This document details the functional requirements, component specifications, design system guidelines, and verification rules for the personal developer portfolio website. It serves as the single source of truth for the frontend codebase, local testing routines, and build configurations.

---

## 🎯 1. Project Overview & Goals

The target of this project is to build a modern, high-performance developer portfolio website that showcases projects, skills, and a blog. 

### Core Goals:
1. **Ultra-fast Performance**: Built using **Astro v6** to output clean, static HTML files, minimizing javascript payload sizes.
2. **Interactive Elements**: Leverages **React** components dynamically loaded via Astro client directives for interactive features (e.g., hamburger menu, contact form validation).
3. **Rich Glassmorphism Aesthetic**: Applies modern UI styling including transparent backdrops, vibrant linear gradients, and subtle hover animations.
4. **Comprehensive Test Suite**: Employs **Playwright** E2E testing to guarantee structural, visual, and behavioral integrity.

---

## 🛠️ 2. Core Functional Requirements

### R1. Pages & Routing Structure
The application operates on static file-based routing:
* **Home (`/`)**: High-impact portal introducing the developer, summarizing skills, previewing featured work, listing recent posts, and providing a contact form.
* **Projects Catalog (`/projects`)**: Complete directory of all projects.
* **Blog Catalog (`/blog`)**: Listing of all published blog posts, sorted by release date.
* **Blog Detail (`/blog/[slug]`)**: Dynamic page rendering individual blog posts from markdown sources.
* **404 Page (`/404.html`)**: Fallback error landing page.

---

## 📁 3. Page & Component Technical Specifications

### 🧩 A. Navigation Header Component (`src/components/Header.jsx`)
* **Behavior**: Renders a fixed navigation bar at the top of the viewport.
* **Active State Detection**: Parses `window.location.pathname` to add the `.active` class to the matching navigation link.
* **Responsive Toggle**: 
  - *Desktop*: Displays horizontal navigation links.
  - *Mobile*: Converts navigation links into a vertical tray triggered by an interactive hamburger menu button.
* **Key IDs**:
  - Main Logo Link: `#logo-link` (must route back to `/`).

---

### 🧩 B. Landing Page (`src/pages/index.astro`)
The landing page must contain the following sections in this exact order:

#### 1. Hero Section
* **Height**: Matches the full viewport height (`90vh` to `100vh`).
* **Visuals**: Contains a large dual-color gradient heading (class `text-gradient`), subtitles, and CSS-only gradient background orbs.
* **Calls to Action (CTAs)**: Contains two buttons:
  - *"View Projects"* (routing to `/projects`)
  - *"Read Blog"* (routing to `/blog`)

#### 2. About Section
* **Content**: Text bio detailing background, expertise, homelab/home-server virtualization interests, and software development stack.

#### 3. Skills Section (`#skills-section`)
* **Data Source**: Loaded dynamically from `src/data/skills.js`.
* **Layout**: Categorized into lists (e.g., Languages, Frameworks, Tools) where each skill is rendered as a clean, rounded badge styled using the `glass-card` look.

#### 4. Projects Preview (`#projects-grid`)
* **Data Source**: Fetches data from `src/data/projects.js`.
* **Behavior**: Renders up to 3 projects flagged as `featured: true`.
* **Details**: Cards must include:
  - Title (`h3`)
  - Description (`p`)
  - Tech badges (class `tech-badge`)
  - Source Code link (class `github-link`)
  - Live Demo link (class `live-link`)
* **Redirect CTA**: A link pointing to `/projects` to view all items.

#### 5. Blog Preview (`#blog-preview-section`)
* **Data Source**: Fetches recent markdown blog files from `src/content/blog/`.
* **Behavior**: Renders the 2 most recently published posts.
* **Details**: Post cards (class `blog-post-card`) must display:
  - Title (`h3`)
  - Date (class `post-date`) formatted as `"Month DD, YYYY"` (e.g., `"June 1, 2026"`).
  - Short description (`p`)
  - A *"Read More"* link (class `read-more`) pointing to `/blog/[slug]`.

#### 6. Contact Section & Form Component (`src/components/ContactForm.jsx`)
An interactive React component loaded client-side via `client:load`.
* **Form Structure**:
  - Name Input (`#contact-name`) with validation error container (`#name-error`).
  - Email Input (`#contact-email`) with validation error container (`#email-error`).
  - Message Textarea (`#contact-message`) with validation error container (`#message-error`).
  - Submit Button (`#contact-submit`).
* **Client Validation**: Trims whitespace. Rejects empty fields, invalid email formats, and displays real-time descriptive errors.
* **Submission Logic**:
  - During submission: Disables input fields, updates button text to `"Sending..."`.
  - Performs a `POST` request to `/api/contact`. 
  - To facilitate E2E error testing, the endpoint URL must append `window.location.search` parameters to forward query simulation flags (e.g., `?status=500` or `?status=429`).
* **Server Response States**:
  - `200 Success`: Clears form fields. Displays a success banner in `#contact-status` (class `success`).
  - `429 Rate Limit`: Displays a rate limit warning banner in `#contact-status` (class `error`).
  - `500+ Server Error`: Displays an internal server error banner in `#contact-status` (class `error`).
* **Social Integration**: Lists social links for direct access:
  - GitHub (ID `#contact-github`, `href` to `https://github.com/alkamfrz`)
  - LinkedIn (ID `#contact-linkedin`, `href` to `https://linkedin.com/in/alkamfrz`)
  - Email Link (ID `#contact-email-link`, `href` to `mailto:alkam.fariz@outlook.com`)

---

### 🧩 C. Projects Showcase Page (`src/pages/projects.astro`)
* **Behavior**: Displays the full catalog of projects loaded from `src/data/projects.js` inside grid container `#projects-grid`.
* **Card Details**: Matches Projects Preview formatting (class `project-card` and `glass-card`).
* **Empty State**: Displays an empty message (`#no-projects` containing the exact text `No projects found`) if no projects are provided.
* **Page Title**: Document `<title>` must contain the word `"Projects"`.

---

### 🧩 D. Blog Listing Page (`src/pages/blog/index.astro`)
* **Behavior**: Catalogs blog posts in a grid container (`#blog-grid`) sorted newest-first.
* **Post Details**: Matches Blog Preview post cards (class `blog-post-card`).
* **Empty State**: Displays an empty message (`#no-posts` containing the exact text `No posts found`) if no posts are returned.
* **Page Title**: Document `<title>` must contain the word `"Blog"`.

---

### 🧩 E. Blog Post Detail Page (`src/pages/blog/[slug].astro`)
* **Behavior**: Dynamic Astro route matching individual blog post files.
* **Content Loader**: Uses Astro Content Collections (`src/content.config.ts`) configured with the `glob` loader.
* **Structure**: Renders the markdown content inside a container with class `blog-post-detail`. The page header must contain the post title in an `h1`.

---

### 🧩 F. 404 Error Page (`src/pages/404.astro`)
* **Details**: Renders a dedicated card (`#not-found-card`) displaying `404` and a redirection link (`#go-home-link`) back to `/`.

---

## 🎨 4. Design System & Scoped Styling Spec

Styling uses **Vanilla CSS** (no TailwindCSS or CSS frameworks). Global design tokens are defined in `src/styles/global.css`, while component-specific rules are encapsulated in Astro `<style>` blocks.

### Primary Color Scheme & Styling Tokens
* **Background Dark (`--bg-dark`)**: `#0a0b10` (used for document body).
* **Card Fill (`--bg-card`)**: `rgba(255, 255, 255, 0.03)` (transparent overlay).
* **Card Border (`--border-card`)**: `rgba(255, 255, 255, 0.08)` (subtle white border).
* **Primary Text (`--text-primary`)**: `#f8fafc`.
* **Secondary Text (`--text-secondary`)**: `#94a3b8`.
* **Accent Colors**: Blue (`#3b82f6`) and Purple (`#8b5cf6`).
* **Vibrant Accent Gradient (`--gradient-accent`)**: `linear-gradient(135deg, var(--accent-blue), var(--accent-purple))`.
* **Typography**: Primary Outfit/Inter font family.

### Styling Implementations
* **Glassmorphism (`.glass-card`, `.project-card`)**:
  - Semi-transparent background using `var(--bg-card)`.
  - Blur properties: `backdrop-filter: blur(12px)` and `-webkit-backdrop-filter: blur(12px)`.
  - Border thickness: `1px solid var(--border-card)`.
  - Hover states: Smooth `transform` transitions scaling cards or raising them by `-4px`, border color transitions, and soft drop-shadow glows.
* **Linear Gradient Headers (`.text-gradient`)**:
  - Clips background using `background-clip: text` and `-webkit-text-fill-color: transparent` to overlay the dual-color gradient accent.

---

## 💾 5. Data Model Schemas

### 📋 Projects Data Model (`src/data/projects.js`)
An exported array of project objects conforming to the following structure:
```javascript
export const projects = [
  {
    id: "project-slug-id",
    title: "Project Title",
    description: "Detailed description of the project.",
    techStack: ["React", "Astro", "Nginx"],
    liveUrl: "https://project-live-link.com",
    githubUrl: "https://github.com/username/project",
    featured: true // Boolean flag to include on home page preview
  }
];
```

### 📋 Skills Data Model (`src/data/skills.js`)
An exported categorized skills object:
```javascript
export const skills = {
  languages: ["JavaScript", "TypeScript", "HTML/CSS"],
  frameworks: ["React", "Astro", "Node.js"],
  devops: ["Docker", "Nginx", "Proxmox", "HAProxy"],
  tools: ["Git", "Playwright", "VS Code"]
};
```

---

## 🧪 6. Playwright Test Suite Specifications

The application integrates an automated test suite containing **50 verification test cases** divided into two tiers. Run them locally using `npm run test` or `npx playwright test`.

### Tier 1: Layout & Navigation Integrity (`tests/tier1.spec.ts`)
* **Logo Check**: Assert the presence of `#logo-link` pointing to `/`.
* **Navigation Links**: Verify that Header links navigate to `/`, `/projects`, and `/blog` correctly.
* **Responsive Layouts**: Assert that standard desktop layouts render horizontal navigation, and mobile viewports (`375px` width) toggle display visibility via a hamburger button.
* **Content Previews**: Verifies presence of headers and grids on index pages (`#skills-section`, `#projects-grid`, `#blog-preview-section`).

### Tier 2: Dynamic Interactivity & Routing (`tests/tier2.spec.ts`)
* **API Redirection**: Assert that the contact form handles `POST` requests and appends query parameters from `window.location.search` during execution.
* **API Validation & Errors**: Mocks API endpoints to verify frontend status banner messages:
  - Response `200` triggers success banner display (class `success`).
  - Response `429` triggers rate limit warning banner (class `error`).
  - Response `500` triggers internal server error banner (class `error`).
* **Empty States**: Verifies empty state elements (`#no-projects` and `#no-posts`) appear when databases contain no entries.

---

## 🚀 7. Local Development & Build Execution

### Project Setup
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Dev Server** (starts Astro dev server, usually on `http://localhost:4321`):
   ```bash
   npm run dev
   ```
3. **Compile Static Build**:
   ```bash
   npm run build
   ```
   *Static output files compile to the `/dist` directory.*

### Running E2E Test Suite
The mock server handles form submission simulations and E2E validation hooks.
1. **Run Playwright Tests**:
   ```bash
   npx playwright test
   ```
