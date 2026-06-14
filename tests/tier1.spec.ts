import { test, expect } from '@playwright/test';

test.describe('Tier 1: Feature Coverage (25 Tests)', () => {

  // ==========================================
  // FEATURE 1: GLOBAL LAYOUT & STYLING
  // ==========================================
  test.describe('Feature 1: Global Layout & Styling', () => {
    test('F1-T1-1: Page background color is rgb(15, 23, 42)', async ({ page }) => {
      await page.goto('/');
      const body = page.locator('body');
      await expect(body).toHaveCSS('background-color', 'rgb(15, 23, 42)');
    });

    test('F1-T1-2: Card elements contain glassmorphism blur and border styles', async ({ page }) => {
      await page.goto('/');
      const card = page.locator('#welcome-card');
      const filter = await card.evaluate(el => window.getComputedStyle(el).backdropFilter || window.getComputedStyle(el).webkitBackdropFilter);
      expect(filter).toContain('blur(16px)');
      const border = await card.evaluate(el => window.getComputedStyle(el).border);
      expect(border).toContain('rgba(255, 255, 255, 0.08)');
    });

    test('F1-T1-3: Desktop navigation displays links and hides hamburger menu', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Desktop only test');
      await page.goto('/');
      await expect(page.locator('#hamburger')).not.toBeVisible();
      await expect(page.locator('#nav-home')).toBeVisible();
      await expect(page.locator('#nav-projects')).toBeVisible();
      await expect(page.locator('#nav-blog')).toBeVisible();
    });

    test('F1-T1-4: Mobile navigation hides links by default and displays hamburger button', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile only test');
      await page.goto('/');
      await expect(page.locator('#hamburger')).toBeVisible();
      await expect(page.locator('#nav-home')).not.toBeVisible();
    });

    test('F1-T1-5: Clicking hamburger toggles menu visibility and aria-expanded', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile only test');
      await page.goto('/');
      const hamburger = page.locator('#hamburger');
      await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
      await hamburger.click();
      await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#nav-home')).toBeVisible();
    });
  });

  // ==========================================
  // FEATURE 2: PAGE NAVIGATION & LINKS
  // ==========================================
  test.describe('Feature 2: Page Navigation & Header/Footer Links', () => {
    test('F2-T1-1: Header logo redirects to homepage', async ({ page }) => {
      await page.goto('/projects');
      await page.click('#logo-link');
      await expect(page).toHaveURL(/\/$/);
    });

    test('F2-T1-2: Navigating to Projects page via header link', async ({ page, isMobile }) => {
      await page.goto('/');
      if (isMobile) {
        await page.click('#hamburger');
      }
      await page.click('#nav-projects');
      await expect(page).toHaveURL(/\/projects/);
      await expect(page).toHaveTitle(/Projects/);
    });

    test('F2-T1-3: Navigating to Blog page via header link', async ({ page, isMobile }) => {
      await page.goto('/');
      if (isMobile) {
        await page.click('#hamburger');
      }
      await page.click('#nav-blog');
      await expect(page).toHaveURL(/\/blog/);
      await expect(page).toHaveTitle(/Blog/);
    });

    test('F2-T1-4: Footer contains external social links and email link', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#footer-github')).toHaveAttribute('href', 'https://github.com/alkamfrz');
      await expect(page.locator('#footer-linkedin')).toHaveAttribute('href', 'https://linkedin.com/in/alkamfrz');
      await expect(page.locator('footer #footer-email')).toHaveAttribute('href', 'mailto:alkamfrz@gmail.com');
    });

    test('F2-T1-5: Current active page has visual active highlight', async ({ page }) => {
      await page.goto('/projects');
      const activeLink = page.locator('#nav-projects');
      await expect(activeLink).toHaveClass(/active/);
    });
  });

  // ==========================================
  // FEATURE 3: PROJECTS SHOWCASE
  // ==========================================
  test.describe('Feature 3: Projects Showcase', () => {
    test('F3-T1-1: Projects index contains list grid container', async ({ page }) => {
      await page.goto('/projects');
      await expect(page.locator('#projects-grid')).toBeVisible();
    });

    test('F3-T1-2: Project card has details (Title, Desc, Tags)', async ({ page }) => {
      await page.goto('/projects');
      const firstCard = page.locator('.project-card').first();
      await expect(firstCard.locator('h3')).not.toBeEmpty();
      await expect(firstCard.locator('p')).not.toBeEmpty();
      await expect(firstCard.locator('.tech-badge').first()).toBeVisible();
    });

    test('F3-T1-3: Project card contains Live Demo link button', async ({ page }) => {
      await page.goto('/projects');
      const liveLink = page.locator('.project-card').first().locator('.live-link');
      await expect(liveLink).toBeVisible();
    });

    test('F3-T1-4: Project card contains GitHub link button', async ({ page }) => {
      await page.goto('/projects');
      const gitLink = page.locator('.project-card').first().locator('.github-link');
      await expect(gitLink).toBeVisible();
    });

    test('F3-T1-5: Technology badges have individual block styling', async ({ page }) => {
      await page.goto('/projects');
      const badge = page.locator('.tech-badge').first();
      await expect(badge).toHaveCSS('display', 'inline-block');
    });
  });

  // ==========================================
  // FEATURE 4: BLOG & MARKDOWN RENDERING
  // ==========================================
  test.describe('Feature 4: Blog & Markdown Rendering', () => {
    test('F4-T1-1: Blog index displays post listing grid', async ({ page }) => {
      await page.goto('/blog');
      await expect(page.locator('#blog-grid')).toBeVisible();
    });

    test('F4-T1-2: Blog card displays metadata correctly', async ({ page }) => {
      await page.goto('/blog');
      const firstPost = page.locator('.blog-post-card').first();
      await expect(firstPost.locator('h3')).not.toBeEmpty();
      await expect(firstPost.locator('.post-date')).not.toBeEmpty();
      await expect(firstPost.locator('.read-more')).toBeVisible();
    });

    test('F4-T1-3: Navigation from card to post details', async ({ page }) => {
      await page.goto('/blog');
      await page.locator('.blog-post-card').first().locator('.read-more').click();
      await expect(page).toHaveURL(/\/blog\/.+/);
    });

    test('F4-T1-4: Post details render structured layout content', async ({ page }) => {
      await page.goto('/blog/setting-up-a-secure-home-server');
      await expect(page.locator('.blog-post-detail h1')).toBeVisible();
      expect(await page.locator('.blog-post-detail p').count()).toBeGreaterThan(0);
    });

    test('F4-T1-5: Home page renders blog preview grid section', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#blog-preview-section')).toBeVisible();
      await expect(page.locator('#blog-preview-section .blog-post-card')).toHaveCount(2);
    });
  });

  // ==========================================
  // FEATURE 5: CONTACT FORM & SUBMISSION
  // ==========================================
  test.describe('Feature 5: Contact Form & API Submission', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('F5-T1-1: Inputs exist on Homepage contact card', async ({ page }) => {
      await expect(page.locator('#contact-name')).toBeVisible();
      await expect(page.locator('#contact-form #contact-email')).toBeVisible();
      await expect(page.locator('#contact-message')).toBeVisible();
    });

    test('F5-T1-2: Submitting empty form fires client-side validation errors', async ({ page }) => {
      await page.click('#contact-submit');
      await expect(page.locator('#name-error')).toHaveText('Name is required.');
      await expect(page.locator('#email-error')).toHaveText('Email is required.');
      await expect(page.locator('#message-error')).toHaveText('Message is required.');
    });

    test('F5-T1-3: Validation alerts error for incorrect email syntax', async ({ page }) => {
      await page.fill('#contact-name', 'John Doe');
      await page.fill('#contact-form #contact-email', 'john-email-without-at');
      await page.fill('#contact-message', 'Hello server');
      await page.click('#contact-submit');
      await expect(page.locator('#email-error')).toHaveText('Invalid email format.');
    });

    test('F5-T1-4: Valid form submission displays confirmation message', async ({ page }) => {
      await page.fill('#contact-name', 'Alice');
      await page.fill('#contact-form #contact-email', 'alice@example.com');
      await page.fill('#contact-message', 'This is a valid feedback message.');
      await page.click('#contact-submit');
      await expect(page.locator('#contact-status')).toBeVisible();
      await expect(page.locator('#contact-status')).toHaveText('Message sent successfully!');
    });

    test('F5-T1-5: Submit button shows sending text and is disabled during fetch', async ({ page }) => {
      await page.fill('#contact-name', 'Bob');
      await page.fill('#contact-form #contact-email', 'bob@example.com');
      await page.fill('#contact-message', 'Delayed submission check.');
      
      // Submit without waiting to catch middle state
      await page.click('#contact-submit');
      const submitBtn = page.locator('#contact-submit');
      await expect(submitBtn).toBeDisabled();
      await expect(submitBtn).toHaveText('Sending...');
    });
  });

});
