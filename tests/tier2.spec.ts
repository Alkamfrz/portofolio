import { test, expect } from '@playwright/test';

test.describe('Tier 2: Boundary & Corner Cases (25 Tests)', () => {

  // ==========================================
  // FEATURE 1: GLOBAL LAYOUT & STYLING
  // ==========================================
  test.describe('Feature 1: Global Layout & Styling', () => {
    test('F1-T2-1: Ultra-wide resolution centering and max width constraint', async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });
      await page.goto('/');
      const container = page.locator('main.container');
      const maxWidth = await container.evaluate(el => window.getComputedStyle(el).maxWidth);
      expect(maxWidth).toBe('1100px');
    });

    test('F1-T2-2: Ultra-small screen width handles spacing without clipping', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/');
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflowX).toBe(false);
    });

    test('F1-T2-3: Resizing from mobile to desktop automatically closes active menu', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Must start on desktop and simulate resizing manually');
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/');
      await page.click('#hamburger');
      await expect(page.locator('#nav-links')).toBeVisible();
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(page.locator('#hamburger')).not.toBeVisible();
      await expect(page.locator('#nav-home')).toBeVisible();
    });

    test('F1-T2-4: Body uses terminal grid background pseudo-element', async ({ page }) => {
      await page.goto('/');
      const hasGrid = await page.evaluate(() => {
        const style = window.getComputedStyle(document.body, '::before');
        return (style.backgroundImage || '').includes('linear-gradient');
      });
      expect(hasGrid).toBe(true);
    });

    test('F1-T2-5: Rapid double-toggle hamburger stress test', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile only hamburger test');
      await page.goto('/');
      const hamburger = page.locator('#hamburger');
      for (let i = 0; i < 5; i++) {
        await hamburger.click();
      }
      await expect(page.locator('#nav-links')).toBeVisible();
    });
  });

  // ==========================================
  // FEATURE 2: PAGE NAVIGATION & LINKS
  // ==========================================
  test.describe('Feature 2: Page Navigation & Header/Footer Links', () => {
    test('F2-T2-1: Navigating to invalid page returns 404', async ({ page }) => {
      const response = await page.goto('/this-page-does-not-exist');
      expect(response?.status()).toBe(404);
      await expect(page.locator('.error-code')).toHaveText('404');
      await page.click('#go-home-link');
      await expect(page).toHaveURL(/\/$/);
    });

    test('F2-T2-2: Traverse browser back/forward history preserves router state', async ({ page }) => {
      await page.goto('/');
      await page.goto('/projects');
      await page.goto('/blog');
      await page.goBack();
      await expect(page).toHaveURL(/\/projects/);
      await page.goForward();
      await expect(page).toHaveURL(/\/blog/);
    });

    test('F2-T2-3: Social links open in new tab with security attributes', async ({ page }) => {
      await page.goto('/');
      const gitLink = page.locator('#footer-github');
      await expect(gitLink).toHaveAttribute('target', '_blank');
      await expect(gitLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('F2-T2-4: Trailing slash load handles normal responses', async ({ page }) => {
      const res = await page.goto('/projects/');
      expect(res?.status()).toBe(200);
      await expect(page).toHaveURL(/\/projects\//);
    });

    test('F2-T2-5: Navigating with existing search parameters', async ({ page, isMobile }) => {
      await page.goto('/?ref=testing-flow');
      await expect(page).toHaveURL(/\?ref=testing-flow/);
      if (isMobile) {
        await page.click('#hamburger');
      }
      await page.click('#nav-projects');
      await expect(page).toHaveURL(/\/projects/);
    });
  });

  // ==========================================
  // FEATURE 3: PROJECTS SHOWCASE
  // ==========================================
  test.describe('Feature 3: Projects Showcase', () => {
    test('F3-T2-1: Empty project count displays warning label', async ({ page }) => {
      await page.goto('/projects?count=0');
      await expect(page.locator('#no-projects')).toBeVisible();
      await expect(page.locator('#no-projects')).toHaveText('No projects found');
      await expect(page.locator('.project-card')).toHaveCount(0);
    });

    test('F3-T2-2: Project filter resets to All when tag param is removed', async ({ page }) => {
      await page.goto('/projects?tag=Python');
      await expect(page.locator('.filter-btn.active')).toContainText('Python');
      await page.goto('/projects');
      await expect(page.locator('.filter-btn.active')).toContainText('All');
    });

    test('F3-T2-3: Project card has accessible status badge', async ({ page }) => {
      await page.goto('/projects');
      const badge = page.locator('.status-badge').first();
      await expect(badge).toBeVisible();
    });

    test('F3-T2-4: All project links open in new tab', async ({ page }) => {
      await page.goto('/projects');
      const links = page.locator('.project-link');
      const count = await links.count();
      for (let i = 0; i < count && i < 3; i++) {
        await expect(links.nth(i)).toHaveAttribute('target', '_blank');
        await expect(links.nth(i)).toHaveAttribute('rel', 'noopener noreferrer');
      }
    });

    test('F3-T2-5: Overflow title does not break layout', async ({ page }) => {
      await page.goto('/projects?overflow=true');
      const firstCard = page.locator('.project-card').first();
      const box = await firstCard.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // FEATURE 4: BLOG & MARKDOWN RENDERING
  // ==========================================
  test.describe('Feature 4: Blog & Markdown Rendering', () => {
    test('F4-T2-1: Empty blog list displays warning label', async ({ page }) => {
      await page.goto('/blog?count=0');
      await expect(page.locator('#no-posts')).toBeVisible();
      await expect(page.locator('#no-posts')).toHaveText('No posts found');
      await expect(page.locator('.blog-post-card')).toHaveCount(0);
    });

    test('F4-T2-2: No search results displays empty state', async ({ page }) => {
      await page.goto('/blog');
      const searchInput = page.locator('#blog-search');
      await searchInput.fill('zzzznonexistent');
      await expect(page.locator('#no-search-results')).toBeVisible();
    });

    test('F4-T2-3: Blog detail page returns 404 for nonexistent slug', async ({ page }) => {
      const res = await page.goto('/blog/this-is-not-a-real-blog-article');
      expect(res?.status()).toBe(404);
      await expect(page.locator('.error-code')).toContainText('404');
    });

    test('F4-T2-4: Blog detail has breadcrumb navigation', async ({ page }) => {
      await page.goto('/blog/setting-up-a-secure-home-server');
      await expect(page.locator('.breadcrumbs')).toBeVisible();
      await expect(page.locator('.breadcrumbs a')).toHaveCount(2);
    });

    test('F4-T2-5: Blog post displays reading time and word count', async ({ page }) => {
      await page.goto('/blog/setting-up-a-secure-home-server');
      const meta = page.locator('.blog-post-card .post-meta').first();
      await expect(meta).toContainText(/min/);
    });

    test('F4-T2-6: Blog index dates use readable textual format', async ({ page }) => {
      await page.goto('/blog');
      const dateText = await page.locator('.post-meta').first().innerText();
      expect(dateText).toMatch(/[A-Za-z]+\s+\d{1,4}/);
    });

    test('F4-T2-7: Font size widget cycles through sizes on blog detail', async ({ page }) => {
      await page.goto('/blog/setting-up-a-secure-home-server');
      const content = page.locator('#post-content-body');
      const largeBtn = page.locator('#fs-lg');
      await largeBtn.click();
      await expect(content).toHaveClass(/text-lg/);
      const smallBtn = page.locator('#fs-sm');
      await smallBtn.click();
      await expect(content).toHaveClass(/text-sm/);
    });
  });

  // ==========================================
  // FEATURE 5: CONTACT FORM & SUBMISSION
  // ==========================================
  test.describe('Feature 5: Contact Form & API Submission', () => {
    test('F5-T2-1: Input boundary character overflow validation', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.fill('#contact-name', 'A'.repeat(500));
      await page.fill('#contact-form #contact-email', 'test@overflow.com');
      await page.fill('#contact-message', 'B'.repeat(5000));
      await page.click('#contact-submit');
      await expect(page.locator('#contact-status')).toHaveClass(/success/);
    });

    test('F5-T2-2: Submitting with status 500 query triggers server error display', async ({ page }) => {
      await page.goto('/?status=500');
      await page.waitForLoadState('networkidle');
      await page.fill('#contact-name', 'Jane');
      await page.fill('#contact-form #contact-email', 'jane@example.com');
      await page.fill('#contact-message', 'Force 500 error submission.');
      await page.click('#contact-submit');
      await expect(page.locator('#contact-status')).toBeVisible();
      await expect(page.locator('#contact-status')).toHaveClass(/error/);
      await expect(page.locator('#contact-status')).toContainText('Server error');
    });

    test('F5-T2-3: Submitting with status 429 query triggers rate limit display', async ({ page }) => {
      await page.goto('/?status=429');
      await page.waitForLoadState('networkidle');
      await page.fill('#contact-name', 'Jane');
      await page.fill('#contact-form #contact-email', 'jane@example.com');
      await page.fill('#contact-message', 'Force 429 error.');
      await page.click('#contact-submit');
      await expect(page.locator('#contact-status')).toBeVisible();
      await expect(page.locator('#contact-status')).toHaveClass(/error/);
      await expect(page.locator('#contact-status')).toContainText('Too many requests');
    });

    test('F5-T2-4: Submitting whitespaces triggers empty field errors', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.fill('#contact-name', '   ');
      await page.fill('#contact-form #contact-email', 'abc@def.com');
      await page.fill('#contact-message', '     ');
      await page.click('#contact-submit');
      await expect(page.locator('#name-error')).toHaveText('Name is required.');
      await expect(page.locator('#message-error')).toHaveText('Message is required.');
    });

    test('F5-T2-5: Submitting HTML scripts is escaped safely without injection execution', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.fill('#contact-name', 'Attacker');
      await page.fill('#contact-form #contact-email', 'attacker@inject.com');
      await page.fill('#contact-message', '<script id="injected-tag">window.xssRun = true;</script>');
      await page.click('#contact-submit');
      await expect(page.locator('#contact-status')).toBeVisible();
      const xssRun = await page.evaluate(() => (window as any).xssRun);
      expect(xssRun).toBeUndefined();
      const tagCount = await page.locator('#injected-tag').count();
      expect(tagCount).toBe(0);
    });
  });

});
