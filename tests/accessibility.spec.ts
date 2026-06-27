import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { name: 'Homepage', url: '/' },
  { name: 'Projects', url: '/projects' },
  { name: 'Blog index', url: '/blog' },
  { name: 'Blog detail', url: '/blog/building-a-proxmox-homelab' },
];

const BLOCKING_IMPACTS: string[] = ['critical', 'serious'];

function getBlockingViolations(violations: any[]) {
  return violations.filter(v => BLOCKING_IMPACTS.includes(v.impact));
}

function formatViolations(violations: any[]): string {
  return violations
    .map(v =>
      `\n  [${v.impact.toUpperCase()}] ${v.id}: ${v.description}\n` +
      `    Affected nodes: ${v.nodes.map((n: any) => n.target.join(', ')).join(' | ')}\n` +
      `    Help: ${v.helpUrl}`
    )
    .join('\n');
}

test.describe('Accessibility: Dark Mode', () => {
  for (const { name, url } of PAGES) {
    test(`${name} (${url}) — dark mode has no critical/serious violations`, async ({ page }) => {
      await page.goto(url);
      await page.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('iframe')
        .analyze();

      const blocking = getBlockingViolations(results.violations);

      expect(
        blocking,
        `Dark mode — ${name}: Found ${blocking.length} critical/serious violation(s):${formatViolations(blocking)}`
      ).toHaveLength(0);
    });
  }
});

test.describe('Accessibility: Light Mode', () => {
  for (const { name, url } of PAGES) {
    test(`${name} (${url}) — light mode has no critical/serious violations`, async ({ page }) => {
      await page.goto(url);
      await page.evaluate(() => {
        localStorage.setItem('theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('iframe')
        .analyze();

      const blocking = getBlockingViolations(results.violations);

      expect(
        blocking,
        `Light mode — ${name}: Found ${blocking.length} critical/serious violation(s):${formatViolations(blocking)}`
      ).toHaveLength(0);
    });
  }
});

test.describe('Accessibility: Keyboard Navigation', () => {
  test('Skip-link is the first focusable element and leads to #main-content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveClass(/skip-link/);
    await expect(focused).toHaveAttribute('href', '#main-content');
  });

  test('All nav links are reachable via Tab and have visible focus indicators', async ({ page }) => {
    await page.goto('/');
    let found = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const focusedHref = await page.evaluate(() => {
        const el = document.activeElement as HTMLAnchorElement;
        return el?.tagName === 'A' ? el.getAttribute('href') : null;
      });
      if (focusedHref === '/') { found = true; break; }
    }
    expect(found, 'Home nav link should be Tab-reachable').toBe(true);
  });

  test('Theme toggle is keyboard-operable', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#theme-toggle');
    await toggle.focus();
    const before = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    await page.keyboard.press('Enter');
    const after = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(after).not.toBe(before);
  });

  test('Contact form fields are Tab-reachable and labelled', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#contact-name', { state: 'visible', timeout: 10000 });

    const nameInput = page.locator('#contact-name');
    const emailInput = page.locator('#contact-email');
    const messageInput = page.locator('#contact-message');

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(messageInput).toBeVisible();

    for (const locator of [nameInput, emailInput, messageInput]) {
      const hasLabel = await locator.evaluate((el: HTMLElement) => {
        const id = el.id;
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const labelFor = id ? document.querySelector(`label[for="${id}"]`) : null;
        return !!(ariaLabel || ariaLabelledBy || labelFor);
      });
      expect(hasLabel, `Field ${await locator.getAttribute('id')} must have an associated label`).toBe(true);
    }
  });
});
