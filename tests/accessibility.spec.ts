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
  return violations.map(v =>
    `\n  [${v.impact.toUpperCase()}] ${v.id}: ${v.description}\n` +
    `    Nodes: ${v.nodes.map((n: any) => n.target.join(', ')).join(' | ')}\n` +
    `    Help: ${v.helpUrl}`
  ).join('\n');
}

test.describe('A11y: Dark Mode', () => {
  for (const { name, url } of PAGES) {
    test(`${name} — dark no critical/serious violations`, async ({ page }) => {
      await page.goto(url);
      await page.evaluate(() => { localStorage.setItem('theme', 'dark'); document.documentElement.setAttribute('data-theme', 'dark'); });
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('iframe').analyze();
      const blocking = getBlockingViolations(results.violations);
      expect(blocking, `Dark — ${name}: ${formatViolations(blocking)}`).toHaveLength(0);
    });
  }
});

test.describe('A11y: Light Mode', () => {
  for (const { name, url } of PAGES) {
    test(`${name} — light no critical/serious violations`, async ({ page }) => {
      await page.goto(url);
      await page.evaluate(() => { localStorage.setItem('theme', 'light'); document.documentElement.setAttribute('data-theme', 'light'); });
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('iframe').analyze();
      const blocking = getBlockingViolations(results.violations);
      expect(blocking, `Light — ${name}: ${formatViolations(blocking)}`).toHaveLength(0);
    });
  }
});

test.describe('A11y: Keyboard', () => {
  test('Skip link is first focusable', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveClass(/skip-link/);
    await expect(focused).toHaveAttribute('href', '#main-content');
  });

  test('Nav links Tab-reachable', async ({ page }) => {
    await page.goto('/');
    let found = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const href = await page.evaluate(() => {
        const el = document.activeElement as HTMLAnchorElement;
        return el?.tagName === 'A' ? el.getAttribute('href') : null;
      });
      if (href === '/') { found = true; break; }
    }
    expect(found).toBe(true);
  });

  test('Theme toggle keyboard-operable', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#theme-toggle');
    await toggle.focus();
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.keyboard.press('Enter');
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(after).not.toBe(before);
  });

  test('Contact form fields labelled', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#contact-name', { state: 'visible', timeout: 10000 });
    for (const id of ['#contact-name', '#contact-email', '#contact-message']) {
      const el = page.locator(id);
      const hasLabel = await el.evaluate((el: HTMLElement) => {
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const labelFor = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
        return !!(ariaLabel || ariaLabelledBy || labelFor);
      });
      expect(hasLabel, `${id} must have a label`).toBe(true);
    }
  });
});
