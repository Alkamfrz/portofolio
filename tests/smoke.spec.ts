import { test, expect } from '@playwright/test';

test.describe('Production Smoke Tests', () => {

  test('Homepage loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Home.*Alkamfrz Portfolio/);
  });

  test('Navigation links are present', async ({ page, isMobile }) => {
    await page.goto('/');
    if (isMobile) {
      await page.click('#hamburger');
    }
    await expect(page.locator('#nav-home')).toBeVisible();
    await expect(page.locator('#nav-projects')).toBeVisible();
    await expect(page.locator('#nav-blog')).toBeVisible();
  });

  test('Hero section has heading with name', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hero-heading')).toContainText('Muhammad Alkam Alfariz');
  });

  test('Projects page loads and shows project cards', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('.project-card')).toHaveCount(5);
  });

  test('Projects filter buttons work', async ({ page }) => {
    await page.goto('/projects');
    const filterBtn = page.locator('.filter-btn', { hasText: 'Python' });
    await filterBtn.click();
    await expect(filterBtn).toHaveClass(/active/);
    await expect(page.locator('.project-card:visible')).toHaveCount(2);
  });

  test('Blog page loads with posts', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.locator('.blog-post-card')).toHaveCount(4);
  });

  test('404 page renders', async ({ page }) => {
    await page.goto('/nonexistent');
    await expect(page.locator('h1')).toContainText(/404|not found/i);
  });

  test('Theme toggle switches mode', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#theme-toggle');
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await toggle.click();
    const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(newTheme).not.toBe(initialTheme);
  });

  test('Mobile hamburger menu works', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only test');
    await page.goto('/');
    const hamburger = page.locator('#hamburger');
    await expect(hamburger).toBeVisible();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    await hamburger.click();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
  });

  test('Homelab section exists on homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#homelab')).toBeVisible();
    await expect(page.locator('#homelab')).toContainText('Homelab Architecture');
  });

  test('Contact form has input fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#contact-name')).toBeVisible();
    await expect(page.locator('#contact-email')).toBeVisible();
    await expect(page.locator('#contact-message')).toBeVisible();
    await expect(page.locator('#contact-submit')).toBeVisible();
  });

  test('Contact form validates required fields', async ({ page }) => {
    await page.goto('/');
    await page.locator('#contact-submit').click();
    await expect(page.locator('#name-error')).not.toBeEmpty();
    await expect(page.locator('#email-error')).not.toBeEmpty();
    await expect(page.locator('#message-error')).not.toBeEmpty();
  });

  test('Skills section has categories', async ({ page }) => {
    await page.goto('/');
    const skillSection = page.locator('#skills');
    await expect(skillSection).toBeVisible();
    await expect(skillSection.locator('.skill-category')).toHaveCount(2);
    const toggle = page.locator('#skills-toggle-btn');
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(skillSection.locator('.skill-category')).toHaveCount(6);
    }
  });

  test('Experience timeline switches tabs', async ({ page }) => {
    await page.goto('/');
    const eduTab = page.locator('#tab-edu');
    await eduTab.click();
    await expect(eduTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#work-column')).not.toBeVisible();
    await expect(page.locator('#edu-column')).toBeVisible();
    const workTab = page.locator('#tab-work');
    await workTab.click();
    await expect(workTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Footer has social links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#footer-github')).toBeVisible();
    await expect(page.locator('#footer-linkedin')).toBeVisible();
    await expect(page.locator('#footer-email')).toBeVisible();
  });

  test('Back to top button appears on scroll', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#back-to-top')).not.toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect(page.locator('#back-to-top')).toBeVisible();
  });

  test('Download CV button exists', async ({ page }) => {
    await page.goto('/');
    const cvBtn = page.locator('.btn-cv');
    await expect(cvBtn).toBeVisible();
    await expect(cvBtn).toHaveAttribute('download');
  });

  test('JSON-LD structured data exists', async ({ page }) => {
    await page.goto('/');
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('About section has bio highlights', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#about')).toContainText('B.Eng. Informatics');
    await expect(page.locator('#about')).toContainText('3.90');
  });

  test('Topology diagram is interactive', async ({ page }) => {
    await page.goto('/');
    const node = page.locator('.node-group').first();
    await node.click();
    await expect(page.locator('#node-detail-name')).not.toContainText('Select a Node');
  });
});
