# UI/UX Improvement Plan — Portfolio Overhaul

## Goal

Transform the portfolio into a polished, comfortable reading and browsing experience. Every change targets one of: **readability**, **navigation clarity**, **visual hierarchy**, or **interactive delight**.

---

## Area 1 — Typography & Readability

### 1.1 Font Scaling System
- Define a `--font-scale` CSS variable system (ratio ~1.25) so all heading sizes are mathematically derived
- Body text: `1.05rem` / `1.8` line-height on desktop, `1rem` / `1.7` on mobile
- Headings use tighter `line-height: 1.15` with negative `letter-spacing` scaled by size

### 1.2 Reading Width Consistency
- Currently blog detail has `720px` content width, but other pages have no reading-width constraint
- Apply a `.prose` utility class that caps at `720px` for any long-form text column
- Use on: blog detail, blog listing descriptions, project descriptions, about section

### 1.3 Improved Heading Hierarchy
- Ensure `h1 → h2 → h3` visual step-down is obvious (size, weight, margin)
- Add subtle dividers or accent lines before major section headings
- Section titles use `text-gradient` consistently

### 1.4 Code Block Readability
- Increase code font size to `0.92rem` in code blocks (currently `0.9rem`)
- Add `tab-size: 2` to pre blocks
- Improve syntax highlighting contrast (check `post-content code` against dark background)

### 1.5 Light Theme Text Contrast
- Validate all `--text-muted` colors against light background (`#f0f4f8`)
- Ensure minimum 4.5:1 contrast ratio on all text elements

---

## Area 2 — Navigation & Information Architecture

### 2.1 Sticky Header Refinements
- Reduce header height on scroll (shrink padding from `1rem 1.5rem` to `0.6rem 1.5rem`)
- Add a subtle backdrop-blur intensity increase as user scrolls down
- Smooth transition between normal and compact states

### 2.2 Active Section Indicator
- On homepage, add scroll-spy that highlights which section the user is viewing
- Could be a thin progress indicator in the nav or a floating side-dot navigation

### 2.3 Mobile Hamburger Menu
- Animate menu items with staggered entrance (each link fades in sequentially)
- Add a subtle overlay behind the menu
- Close on outside tap / escape key (current behavior unclear)

### 2.4 Blog Listing Improvements
- Add search/filter bar on `/blog` (client-side, filters by title match)
- Show reading time and word count on each blog card
- Add tag/category chips if blog posts had tags

### 2.5 Breadcrumbs
- Add breadcrumb navigation on blog detail page: `Blog > Post Title`
- On projects page if detail views are added: `Projects > Project Name`

---

## Area 3 — Homepage Layout Overhaul

### 3.1 Hero Section
- Add a subtle animated particle/grid background behind the hero text
- Make the CTA buttons pulse gently to draw attention
- Add a smooth scroll-down indicator chevron at the bottom of the viewport
- Ensure hero is exactly 100vh (currently 90vh min-height, feels slightly off)

### 3.2 About & Skills Grid
- About card currently has no visual distinction from skill categories — add a subtle left accent border
- Skills badges: show proficiency levels (Beginner / Intermediate / Expert) via dot indicators or opacity
- Add an "other tools" section for miscellany

### 3.3 Experience / Education Timeline
- Add scroll-triggered animation: timeline items slide in from left as user scrolls
- The active tab button should have a smooth sliding pill indicator (not just class swap)
- Add hover state on timeline items: slight scale + brighter glow

### 3.4 Featured Projects Section
- Currently plain card grid — convert to a spotlight row with the featured project large, others as thumbnails
- Or add a horizontal scroll snap carousel for featured projects
- Add tech stack icons or visual indicators

### 3.5 Blog Preview Section
- Show reading time inline in the preview cards
- Add a subtle "latest" badge on the most recent post
- Use a two-column layout for 2 posts (currently auto-fit grid can be 1 column at odd widths)

---

## Area 4 — Projects Page Upgrade

### 4.1 Project Detail Pages (`/projects/[slug]`)
- Create individual project detail pages with full description, screenshots, tech stack, and links
- Add `src/content/projects/` collection or separate data structure
- Include status badges: Active / Archived / In Development

### 4.2 Project Card Enhancements
- Add date ranges (`dateStart`, `dateEnd` fields to data model)
- Show project status as a colored badge (green=active, yellow=archived, blue=dev)
- Add a "Featured" star indicator for featured projects
- Make tech badges clickable as filters (currently they're just display)

### 4.3 URL-based Filtering
- Current filter bar resets on page load — add URL search params (`?tag=Docker`)
- Preserve filter state on browser back/forward
- Animate filter transitions with layout shift prevention

### 4.4 Masonry / Responsive Layout
- If projects vary in content length, consider CSS masonry or reasonable min-height
- Current `auto-fit minmax(300px, 1fr)` works well — keep but set cards to use `grid-row: auto`

---

## Area 5 — Blog Reading Experience

### 5.1 Blog Post Metadata
- Show reading time + word count on blog listing cards (already in detail page)
- Add "Published on" date far more prominently
- Show "Last updated" date if post has `updated` frontmatter

### 5.2 Table of Contents Enhancements
- Add a "Back to top" link after each major section in the TOC
- Show reading progress within the TOC as a line filling from top to bottom
- Collapse h3 items under their parent h2 in the TOC sidebar

### 5.3 Social Sharing
- Add share buttons (Twitter/X, LinkedIn, copy link) at the bottom of each blog post
- Use native `navigator.share()` with fallback to clipboard copy
- Add `meta[property="og:*"]` tags for rich link previews

### 5.4 Code Block Improvements
- Add line numbers for multi-line code blocks
- Add a "View raw" link for code blocks
- Better copy animation: "Copied!" with a checkmark icon, then fade back
- Add syntax highlight theme (consider a lighter theme for light mode)

### 5.5 Reading Progress
- The scroll progress bar in header already works — add a floating "X% read" badge
- On blog detail, add estimated read time remaining ("3 min left") updating dynamically

### 5.6 Related Posts
- At the bottom of each blog post, show 2 related/suggested posts
- Simple heuristic: match by similar word count or random selection

---

## Area 6 — Accessibility & Performance

### 6.1 Accessibility Audit
- Add `aria-current="page"` to active nav link
- Fix social link aria-labels to be more descriptive: "Visit Alkam Fariz on GitHub" instead of "GitHub"
- Ensure all interactive elements are reachable via keyboard in logical tab order
- Test with screen reader (VoiceOver / NVDA) for navigation flow

### 6.2 Focus Management
- When mobile menu closes, return focus to the hamburger button
- When a toast appears, it should be announced by screen readers (currently `aria-live="polite"` — good)
- After form submission, move focus to the status message

### 6.3 Font Loading Performance
- Add `font-display: swap` to Google Fonts (or switch to self-hosted woff2)
- Preconnect to Google Fonts origins (already done)
- Consider using `subset` parameter in Google Fonts URL to reduce payload
- Or self-host fonts via Astro integration (`@astrojs/font` or manual)

### 6.4 Critical CSS
- Extract critical CSS for above-the-fold content
- Load non-critical CSS asynchronously
- Inline critical styles in `<head>` for instant paint

### 6.5 Image Optimization
- Add `@astrojs/image` for future image assets
- Define WebP/AVIF source sets
- Add lazy loading with `loading="lazy"` on all below-fold images

### 6.6 Reduced Motion
- Current `prefers-reduced-motion` media query exists — ensure all new animations respect it
- Add `@media (prefers-reduced-motion: no-preference)` wrapper around decorative animations

---

## Area 7 — Visual Polish & Micro-interactions

### 7.1 Scroll-Triggered Reveal
- Add intersection observer for section fade-in: sections slide up 20px and fade in as they enter viewport
- Timeline items slide in from left staggered by index
- Skill category cards fade in with delay based on position

### 7.2 Card Hover Effects
- Current glass-card hover raises by 4px — increase to 6px with a stronger glow
- Add a subtle border gradient on hover (cyan-to-purple sweep)
- Project cards: show a "View →" button that slides in from bottom on hover

### 7.3 Background Orbs
- Add a 4th small orb that follows mouse cursor on desktop (parallax effect)
- Ensure orbs don't cause layout shifts or performance issues (use `will-change: transform`)
- Adjust orb opacity for light theme

### 7.4 Page Transitions
- Add Astro View Transitions for smooth page navigation (`<ViewTransitions />`)
- Preserve scroll position on back/forward navigation
- Add a subtle fade between pages

### 7.5 Loading States
- Contact form submit button: current spinner is good — add skeleton loading for blog pages
- Add a subtle shimmer effect on glass cards while content loads (if dynamic)

### 7.6 Link Underline Animation
- Current nav link underline grows from right — extend this pattern to all inline links
- Blog post content links: underline on hover with gradient color
- Social links: icon slide + underline effect

---

## Implementation Order

```
Phase 1 (Typography + Navigation)
  1.1 → 1.2 → 1.3 → 2.1 → 2.3 → 2.4

Phase 2 (Homepage + Projects)
  3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 4.1 → 4.2 → 4.3

Phase 3 (Blog + Polish)
  5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 → 7.1 → 7.2 → 7.3

Phase 4 (A11y + Performance)
  6.1 → 6.2 → 6.3 → 6.4 → 6.6 → 7.4

Phase 5 (Documentation + Testing)
  Update PRD.md → Update README.md → Run full Playwright suite → Fix regressions
```
