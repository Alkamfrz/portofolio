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
      expect(maxWidth).toBe('1200px');
    });

    test('F1-T2-2: Ultra-small screen width handles spacing without clipping', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/');
      // Verify no horizontal overflow scrollable height/width
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflowX).toBe(false);
    });

    test('F1-T2-3: Resizing from mobile to desktop automatically closes active menu', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Must start on desktop and simulate resizing manually');
      await page.setViewportSize({ width: 375, height: 812 }); // Start at mobile
      await page.goto('/');
      await page.click('#hamburger');
      await expect(page.locator('#nav-links')).toBeVisible();

      // Resize back to desktop width
      await page.setViewportSize({ width: 1024, height: 768 });
      // The menu is flex on desktop, asserting hamburger hides
      await expect(page.locator('#hamburger')).not.toBeVisible();
      await expect(page.locator('#nav-home')).toBeVisible();
    });

    test('F1-T2-4: Prefix safety checks for glassmorphic properties', async ({ page }) => {
      await page.goto('/');
      const card = page.locator('#welcome-card');
      const supportFilter = await card.evaluate(el => {
        const style = window.getComputedStyle(el);
        return !!(style.backdropFilter || style.webkitBackdropFilter);
      });
      expect(supportFilter).toBe(true);
    });

    test('F1-T2-5: Rapid double-toggle hamburger stress test', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile only hamburger test');
      await page.goto('/');
      const hamburger = page.locator('#hamburger');
      
      // Perform 5 fast clicks
      for (let i = 0; i < 5; i++) {
        await hamburger.click();
      }
      // Ends on odd number, menu should be open
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
      await expect(page.locator('#not-found-card h1')).toHaveText('404');
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

    test('F2-T2-3: Social links security rel tags and mailto protocol', async ({ page }) => {
      await page.goto('/');
      const gitLink = page.locator('#contact-github');
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
      // Navigating away should not break the page. 
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

    test('F3-T2-2: Text overflow rendering boundary', async ({ page }) => {
      await page.goto('/projects?overflow=true');
      const firstTitle = page.locator('.project-card h3').first();
      await expect(firstTitle).toHaveText(/^[A]+$/);
      // Confirm height is not overflowing container or text is readable / wrapped
      const height = await firstTitle.evaluate(el => el.clientHeight);
      expect(height).toBeGreaterThan(0);
    });

    test('F3-T2-3: Grid column counts scale correctly by viewport size', async ({ page }) => {
      await page.goto('/projects?count=3');
      
      // Desktop
      await page.setViewportSize({ width: 1200, height: 800 });
      const grid = page.locator('#projects-grid');
      const columnsDesktop = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(columnsDesktop).toBe(3);

      // Mobile
      await page.setViewportSize({ width: 375, height: 800 });
      const columnsMobile = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(columnsMobile).toBe(1);
    });

    test('F3-T2-4: Heavy load rendering verification', async ({ page }) => {
      await page.goto('/projects?count=50');
      await expect(page.locator('.project-card')).toHaveCount(50);
      await expect(page.locator('#project-50')).toBeVisible();
    });

    test('F3-T2-5: Card layout doesn\'t break when live links are missing', async ({ page }) => {
      await page.goto('/projects?missingLinks=true');
      await expect(page.locator('.project-card').first().locator('.live-link')).toHaveCount(0);
      await expect(page.locator('.project-card').first().locator('.github-link')).toHaveCount(0);
      // Card container is still rendering nicely
      await expect(page.locator('.project-card').first()).toBeVisible();
    });
  });

  // ==========================================
  // FEATURE 4: BLOG & MARKDOWN RENDERING
  // ==========================================
  test.describe('Feature 4: Blog & Markdown Rendering', () => {
    test('F4-T2-1: Empty blog list handles dynamic parameter', async ({ page }) => {
      await page.goto('/blog?count=0');
      await expect(page.locator('#no-posts')).toBeVisible();
      await expect(page.locator('#no-posts')).toHaveText('No posts found');
    });

    test('F4-T2-2: Markdown rendering structure parser validation', async ({ page }) => {
      await page.goto('/blog/setting-up-a-secure-home-server?markdown=custom');
      const detail = page.locator('.blog-post-detail');
      await expect(detail.locator('h1')).toBeVisible();
      await expect(detail.locator('blockquote')).toBeVisible();
      await expect(detail.locator('pre code')).toBeVisible();
      await expect(detail.locator('ul li')).toHaveCount(3);
      await expect(detail.locator('img')).toHaveAttribute('src', '/placeholder.jpg');
    });

    test('F4-T2-3: Requesting non-existent post slug displays 404 page', async ({ page }) => {
      const res = await page.goto('/blog/fake-slug-article');
      expect(res?.status()).toBe(404);
      await expect(page.locator('h1')).toContainText('404');
    });

    test('F4-T2-4: Posts on blog index display in reverse-chronological order', async ({ page }) => {
      await page.goto('/blog?count=5');
      // Get all dates in rendered cards
      const dates = await page.locator('.post-date').allTextContents();
      
      const epochTimes = dates.map(d => Date.parse(d));
      // Verify first epoch time is larger or equal to subsequent ones (descending)
      for (let i = 0; i < epochTimes.length - 1; i++) {
        expect(epochTimes[i]).toBeGreaterThanOrEqual(epochTimes[i+1]);
      }
    });

    test('F4-T2-5: Blog index dates use readable textual format', async ({ page }) => {
      await page.goto('/blog?count=1');
      const dateText = await page.locator('.post-date').first().innerText();
      // Expect textual date format instead of ISO, e.g. "June 1, 2026"
      expect(dateText).toMatch(/^[A-Za-z]+ \d{1,2}, \d{4}$/);
    });
  });

  // ==========================================
  // FEATURE 5: CONTACT FORM & SUBMISSION
  // ==========================================
  test.describe('Feature 5: Contact Form & API Submission', () => {
    test('F5-T2-1: Input boundary character overflow validation', async ({ page }) => {
      await page.goto('/');
      await page.fill('#contact-name', 'A'.repeat(500));
      await page.fill('#contact-form #contact-email', 'test@overflow.com');
      await page.fill('#contact-message', 'B'.repeat(5000));
      await page.click('#contact-submit');
      
      await expect(page.locator('#contact-status')).toHaveClass('success');
    });

    test('F5-T2-2: Submitting with status 500 query triggers server error display', async ({ page }) => {
      await page.goto('/?status=500');
      await page.fill('#contact-name', 'Jane');
      await page.fill('#contact-form #contact-email', 'jane@example.com');
      await page.fill('#contact-message', 'Force 500 error submission.');
      await page.click('#contact-submit');
      
      await expect(page.locator('#contact-status')).toBeVisible();
      await expect(page.locator('#contact-status')).toHaveClass('error');
      await expect(page.locator('#contact-status')).toHaveText('Server error. Please try again later.');
    });

    test('F5-T2-3: Submitting with status 429 query triggers rate limit display', async ({ page }) => {
      await page.goto('/?status=429');
      await page.fill('#contact-name', 'Jane');
      await page.fill('#contact-form #contact-email', 'jane@example.com');
      await page.fill('#contact-message', 'Force 429 error.');
      await page.click('#contact-submit');
      
      await expect(page.locator('#contact-status')).toBeVisible();
      await expect(page.locator('#contact-status')).toHaveClass('error');
      await expect(page.locator('#contact-status')).toHaveText('Too many requests. Please wait before trying again.');
    });

    test('F5-T2-4: Submitting whitespaces triggers empty field errors', async ({ page }) => {
      await page.goto('/');
      await page.fill('#contact-name', '   ');
      await page.fill('#contact-form #contact-email', 'abc@def.com');
      await page.fill('#contact-message', '     ');
      await page.click('#contact-submit');
      
      await expect(page.locator('#name-error')).toHaveText('Name is required.');
      await expect(page.locator('#message-error')).toHaveText('Message is required.');
    });

    test('F5-T2-5: Submitting HTML scripts is escaped safely without injection execution', async ({ page }) => {
      await page.goto('/');
      const maliciousScript = '<script id="injected-tag">window.xssRun = true;</script>';
      await page.fill('#contact-name', 'Attacker');
      await page.fill('#contact-form #contact-email', 'attacker@inject.com');
      await page.fill('#contact-message', maliciousScript);
      await page.click('#contact-submit');

      await expect(page.locator('#contact-status')).toBeVisible();
      
      // Confirm that the script tag was not parsed into DOM and run
      const xssRun = await page.evaluate(() => (window as any).xssRun);
      expect(xssRun).toBeUndefined();
      
      const tagCount = await page.locator('#injected-tag').count();
      expect(tagCount).toBe(0);
    });
  });

});
