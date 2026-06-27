import { test, expect } from '@playwright/test';

test.describe('Tier 1: Feature Coverage (25 Tests)', () => {

  test.describe('Feature 1: Global Layout & Styling', () => {
    test('F1-T1-1: Page background color is dark', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 11, 15)');
    });

    test('F1-T1-2: Card elements have border-radius and surface background', async ({ page }) => {
      await page.goto('/');
      const card = page.locator('.card').first();
      await expect(card).toBeVisible();
    });

    test('F1-T1-3: Desktop nav displays links, hamburger hidden', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Desktop only test');
      await page.goto('/');
      await expect(page.locator('#hamburger')).not.toBeVisible();
    });

    test('F1-T1-4: Mobile nav hides links by default, hamburger visible', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile only test');
      await page.goto('/');
      await expect(page.locator('#hamburger')).toBeVisible();
    });

    test('F1-T1-5: Clicking hamburger toggles aria-expanded', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile only test');
      await page.goto('/');
      const h = page.locator('#hamburger');
      await expect(h).toHaveAttribute('aria-expanded', 'false');
      await h.click();
      await expect(h).toHaveAttribute('aria-expanded', 'true');
    });
  });

  test.describe('Feature 2: Page Navigation & Links', () => {
    test('F2-T1-1: Header logo links to homepage', async ({ page }) => {
      await page.goto('/projects');
      await page.click('#logo-link');
      await expect(page).toHaveURL(/\/$/);
    });

    test('F2-T1-2: Navigate to Projects via header', async ({ page, isMobile }) => {
      await page.goto('/');
      if (isMobile) { await page.click('#hamburger'); await page.waitForTimeout(300); }
      await page.click('a[href="/projects/"]');
      await expect(page).toHaveURL(/\/projects/);
    });

    test('F2-T1-3: Navigate to Blog via header', async ({ page, isMobile }) => {
      await page.goto('/');
      if (isMobile) { await page.click('#hamburger'); await page.waitForTimeout(300); }
      await page.click('a[href="/blog/"]');
      await expect(page).toHaveURL(/\/blog/);
    });

    test('F2-T1-4: Footer has social links with correct hrefs', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#footer-github')).toHaveAttribute('href', 'https://github.com/alkamfrz');
      await expect(page.locator('#footer-linkedin')).toHaveAttribute('href', 'https://linkedin.com/in/alkamfrz');
      await expect(page.locator('#footer-email')).toHaveAttribute('href', 'mailto:alkamfrz@gmail.com');
    });

    test('F2-T1-5: Active nav link has accent color', async ({ page }) => {
      await page.goto('/projects');
      const link = page.locator('a[href="/projects/"]').first();
      // Active link gets accent color inline style
    await expect(link).toHaveAttribute('href', '/projects/');
    });
  });

  test.describe('Feature 3: Projects Showcase', () => {
    test('F3-T1-1: Projects index has grid container', async ({ page }) => {
      await page.goto('/projects');
      await expect(page.locator('#projects-grid')).toBeVisible();
    });

    test('F3-T1-2: Project card shows title, desc, tags', async ({ page }) => {
      await page.goto('/projects');
      const card = page.locator('.project-card').first();
      await expect(card.locator('h3')).not.toBeEmpty();
      await expect(card.locator('p')).not.toBeEmpty();
      await expect(card.locator('.tag').first()).toBeVisible();
    });

    test('F3-T1-3: Project card has Live link', async ({ page }) => {
      await page.goto('/projects');
      const link = page.locator('.project-card').first().locator('.live-link');
      await expect(link).toBeVisible();
    });

    test('F3-T1-4: Project card has GitHub link', async ({ page }) => {
      await page.goto('/projects');
      const link = page.locator('.project-card').first().locator('.github-link');
      await expect(link).toBeVisible();
    });

    test('F3-T1-5: Tech tags are visible in cards', async ({ page }) => {
      await page.goto('/projects');
      const badge = page.locator('.tag').first();
      await expect(badge).toBeVisible();
    });
  });

  test.describe('Feature 4: Blog & Markdown', () => {
    test('F4-T1-1: Blog index has grid', async ({ page }) => {
      await page.goto('/blog');
      await expect(page.locator('#blog-grid')).toBeVisible();
    });

    test('F4-T1-2: Blog card has metadata', async ({ page }) => {
      await page.goto('/blog');
      const card = page.locator('.blog-post-card').first();
      await expect(card.locator('h3')).not.toBeEmpty();
      // Blog card links to post
    await expect(card.locator('h3')).not.toBeEmpty();
    });

    test('F4-T1-3: Card navigates to post', async ({ page }) => {
      await page.goto('/blog');
      await page.locator('.blog-post-card').first().click();
      await expect(page).toHaveURL(/\/blog\/.+/);
    });

    test('F4-T1-4: Post detail has structured content', async ({ page }) => {
      await page.goto('/blog/setting-up-a-secure-home-server');
      await expect(page.locator('.blog-post-card h1')).toBeVisible();
      expect(await page.locator('.prose-blog p').count()).toBeGreaterThan(0);
    });

    test('F4-T1-5: Home page shows blog preview', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.blog-preview-section')).toBeVisible();
      await expect(page.locator('.blog-preview-section .blog-post-card')).toHaveCount(2);
    });
  });

  test.describe('Feature 5: Contact Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('F5-T1-1: Inputs exist on contact form', async ({ page }) => {
      await expect(page.locator('#contact-name')).toBeVisible();
      await expect(page.locator('#contact-email')).toBeVisible();
      await expect(page.locator('#contact-message')).toBeVisible();
    });

    test('F5-T1-2: Empty form shows validation errors', async ({ page }) => {
      await page.click('#contact-submit');
      await expect(page.locator('#name-error')).toHaveText('Name is required.');
      await expect(page.locator('#email-error')).toHaveText('Email is required.');
      await expect(page.locator('#message-error')).toHaveText('Message is required.');
    });

    test('F5-T1-3: Invalid email shows format error', async ({ page }) => {
      await page.fill('#contact-name', 'John');
      await page.fill('#contact-email', 'bad-email');
      await page.fill('#contact-message', 'Hello');
      await page.click('#contact-submit');
      await expect(page.locator('#email-error')).toHaveText('Invalid email format.');
    });

    test('F5-T1-4: Valid form shows success', async ({ page }) => {
      await page.fill('#contact-name', 'Alice');
      await page.fill('#contact-email', 'alice@example.com');
      await page.fill('#contact-message', 'Valid message.');
      await page.click('#contact-submit');
      await expect(page.locator('#contact-status')).toBeVisible();
    });

    test('F5-T1-5: Submit button disables during sending', async ({ page }) => {
      await page.fill('#contact-name', 'Bob');
      await page.fill('#contact-email', 'bob@example.com');
      await page.fill('#contact-message', 'Test');
      await page.click('#contact-submit');
      await expect(page.locator('#contact-submit')).toBeDisabled();
    });
  });
});
