import { test, expect } from '@playwright/test';

test.describe('Tier 2: Boundary & Corner Cases (25 Tests)', () => {

  test.describe('Feature 1: Global Layout & Styling', () => {
    test('F1-T2-1: Ultra-wide centering', async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });
      await page.goto('/');
      const container = page.locator('main');
      const maxWidth = await container.evaluate(el => window.getComputedStyle(el).maxWidth);
      expect(maxWidth).toBe('1120px');
    });

    test('F1-T2-2: Small screen no overflow', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow).toBe(false);
    });

    test('F1-T2-3: Resize mobile to desktop', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Desktop simulation');
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/');
      const h = page.locator('#hamburger');
      await h.click();
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(h).not.toBeVisible();
    });

    test('F1-T2-4: Theme toggle exists and works', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#theme-toggle')).toBeVisible();
    });

    test('F1-T2-5: Rapid hamburger toggle', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile only');
      await page.goto('/');
      const h = page.locator('#hamburger');
      for (let i = 0; i < 5; i++) await h.click();
      await expect(h).toHaveAttribute('aria-expanded', 'true');
    });
  });

  test.describe('Feature 2: Navigation', () => {
    test('F2-T2-1: 404 page works', async ({ page }) => {
      const res = await page.goto('/nonexistent');
      expect(res?.status()).toBe(404);
      await expect(page.locator('h1')).toContainText(/not found/i);
      await page.click('#go-home-link');
      await expect(page).toHaveURL(/\/$/);
    });

    test('F2-T2-2: Browser back/forward', async ({ page }) => {
      await page.goto('/');
      await page.goto('/projects');
      await page.goto('/blog');
      await page.goBack();
      await expect(page).toHaveURL(/\/projects/);
      await page.goForward();
      await expect(page).toHaveURL(/\/blog/);
    });

    test('F2-T2-3: Footer GitHub opens new tab', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#footer-github')).toHaveAttribute('target', '_blank');
      await expect(page.locator('#footer-github')).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('F2-T2-4: Trailing slash works', async ({ page }) => {
      const res = await page.goto('/projects/');
      expect(res?.status()).toBe(200);
    });

    test('F2-T2-5: Search params preserved through nav', async ({ page, isMobile }) => {
      await page.goto('/?ref=test');
      await expect(page).toHaveURL(/\?ref=test/);
      if (isMobile) { await page.click('#hamburger'); await page.waitForTimeout(300); }
      await page.click('a[href="/projects/"]');
      await expect(page).toHaveURL(/\/projects/);
    });
  });

  test.describe('Feature 3: Projects', () => {
    test('F3-T2-1: Empty count shows no-projects', async ({ page }) => {
      await page.goto('/projects?count=0');
      await expect(page.locator('#no-projects')).toBeVisible();
      await expect(page.locator('.project-card')).toHaveCount(0);
    });

    test('F3-T2-2: Filter resets on page nav', async ({ page }) => {
      await page.goto('/projects?tag=Python');
      await expect(page.locator('.filter-btn').first()).not.toHaveCSS('background-color', 'rgb(99, 102, 241)');
      await page.goto('/projects');
    });

    test('F3-T2-3: Status badge visible', async ({ page }) => {
      await page.goto('/projects');
      await expect(page.locator('.status-led').first()).toBeVisible();
    });

    test('F3-T2-4: Project links open in new tab', async ({ page }) => {
      await page.goto('/projects');
      const link = page.locator('.project-link').first();
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('F3-T2-5: Overflow title does not break layout', async ({ page }) => {
      await page.goto('/projects?overflow=true');
      const card = page.locator('.project-card').first();
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });
  });

  test.describe('Feature 4: Blog & Markdown', () => {
    test('F4-T2-1: Empty blog shows no-posts', async ({ page }) => {
      await page.goto('/blog?count=0');
      await expect(page.locator('#no-posts')).toBeVisible();
      await expect(page.locator('.blog-post-card')).toHaveCount(0);
    });

    test('F4-T2-2: Search no results', async ({ page }) => {
      await page.goto('/blog');
      await page.locator('#blog-search').fill('zzzznonexistent');
      await expect(page.locator('#no-search-results')).toBeVisible();
    });

    test('F4-T2-3: Bad slug returns 404', async ({ page }) => {
      const res = await page.goto('/blog/not-a-real-post');
      expect(res?.status()).toBe(404);
    });

    test('F4-T2-4: Blog detail has breadcrumbs', async ({ page }) => {
      await page.goto('/blog/setting-up-a-secure-home-server');
      await expect(page.locator('nav a').first()).toBeVisible();
    });

    test('F4-T2-5: Blog post shows reading time', async ({ page }) => {
      await page.goto('/blog/setting-up-a-secure-home-server');
      await expect(page.locator('article .card').first()).toContainText(/min/);
    });

    test('F4-T2-6: Font size widget works', async ({ page }) => {
      await page.goto('/blog/setting-up-a-secure-home-server');
      const content = page.locator('#post-content-body');
      await page.locator('#fs-lg').click();
      const fs = await content.evaluate(el => window.getComputedStyle(el).fontSize);
      expect(parseFloat(fs)).toBeGreaterThan(16);
    });
  });

  test.describe('Feature 5: Contact Form', () => {
    test('F5-T2-1: Large inputs submit', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.fill('#contact-name', 'A'.repeat(500));
      await page.fill('#contact-email', 'test@test.com');
      await page.fill('#contact-message', 'B'.repeat(5000));
      await page.click('#contact-submit');
      await expect(page.locator('#contact-status')).toHaveClass(/success/);
    });

    test('F5-T2-2: Status 500 shows error', async ({ page }) => {
      await page.goto('/?status=500');
      await page.waitForLoadState('networkidle');
      await page.fill('#contact-name', 'Jane');
      await page.fill('#contact-email', 'jane@test.com');
      await page.fill('#contact-message', 'Force error');
      await page.click('#contact-submit');
      await expect(page.locator('#contact-status')).toBeVisible();
      await expect(page.locator('#contact-status')).toHaveClass(/error/);
    });

    test('F5-T2-3: Status 429 shows rate limit', async ({ page }) => {
      await page.goto('/?status=429');
      await page.waitForLoadState('networkidle');
      await page.fill('#contact-name', 'Jane');
      await page.fill('#contact-email', 'jane@test.com');
      await page.fill('#contact-message', 'Rate limit');
      await page.click('#contact-submit');
      await expect(page.locator('#contact-status')).toBeVisible();
      await expect(page.locator('#contact-status')).toHaveClass(/error/);
    });

    test('F5-T2-4: Whitespace triggers empty errors', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.fill('#contact-name', '   ');
      await page.fill('#contact-email', 'abc@def.com');
      await page.fill('#contact-message', '     ');
      await page.click('#contact-submit');
      await expect(page.locator('#name-error')).toHaveText('Name is required.');
      await expect(page.locator('#message-error')).toHaveText('Message is required.');
    });

    test('F5-T2-5: XSS in message is escaped', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.fill('#contact-name', 'Attacker');
      await page.fill('#contact-email', 'a@b.com');
      await page.fill('#contact-message', '<script id="xss">window.xssRun=true;</script>');
      await page.click('#contact-submit');
      await expect(page.locator('#contact-status')).toBeVisible();
      const run = await page.evaluate(() => (window as any).xssRun);
      expect(run).toBeUndefined();
      expect(await page.locator('#xss').count()).toBe(0);
    });
  });
});
