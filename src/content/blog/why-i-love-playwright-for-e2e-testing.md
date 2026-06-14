---
title: "Why I Love Playwright for E2E Testing"
date: "2026-05-15"
description: "Playwright brings speed, reliability, and cross-browser support to end-to-end testing workflows. Here's why it's become my go-to tool."
---

End-to-end testing has a reputation problem. Ask any developer who has maintained a Selenium suite for more than six months and you will hear the same words: flaky, slow, painful. I spent years fighting that battle before I discovered Playwright — and it genuinely changed how I think about test automation. This post is part retrospective, part deep-dive tutorial. By the end you will have a solid understanding of why Playwright is different, and you will have real, working patterns you can drop into your own projects today.

My context: I run Playwright against an Astro + React portfolio site. The suite currently sits at **66 test cases** spread across smoke tests, tier1 core-feature tests, and tier2 boundary/edge-case tests. They run across Chromium, Firefox, and Mobile Chrome in parallel using 2 workers locally. Everything is configured via a single `playwright.config.ts`. Let's get into it.

---

## 1. The Problem with Traditional E2E Testing

### Selenium's baggage

Selenium is the grandfather of browser automation. It works, but its architecture shows its age. The WebDriver protocol introduces an extra network hop between your test code and the browser — your code speaks to a WebDriver server, which then speaks to the browser. Every interaction is an HTTP round-trip. This adds latency, and more importantly, it means Selenium can't *listen* to the browser; it can only *poll* it.

The result is that you end up writing a lot of `Thread.sleep()` calls, or you reach for explicit waits that are both verbose and brittle:

```java
// Selenium: waiting for an element the hard way
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
WebElement button = wait.until(
  ExpectedConditions.elementToBeClickable(By.id("submit-btn"))
);
button.click();
```

When the timing changes — because CI is slower, or your API response is a few milliseconds late — the test breaks. You add more sleep time. Now the test is even slower. It's a losing battle.

### Cypress's hidden ceiling

Cypress was a breath of fresh air when it launched. It runs *inside* the browser, which eliminates the WebDriver round-trip. Auto-waiting is built in, the developer experience is polished, and the dashboard is genuinely beautiful.

But Cypress has a ceiling. For years it didn't support multiple browser tabs, `iframe` interactions were cumbersome, and — critically — running tests across multiple *browsers* required commercial licensing. The architecture that makes Cypress fast (running in the same origin as the app) also limits what you can test. Cross-origin navigation, file downloads, and anything outside the browser sandbox all required workarounds.

For a portfolio site that I want verified in Chromium, Firefox, *and* Mobile Chrome before every deploy, Cypress's free tier started to feel like a straitjacket.

---

## 2. What Makes Playwright Different

Playwright was built by the same team that originally created Puppeteer at Google. When they moved to Microsoft they rebuilt it from scratch with multi-browser support as a first-class design goal. The core architecture advantages are:

**CDP + browser-native protocols.** Playwright communicates with Chromium via the Chrome DevTools Protocol (CDP), with Firefox via a custom protocol, and with WebKit via a WebKit-specific protocol. This is a persistent WebSocket connection — not an HTTP round-trip per action. The browser is a peer, not a server you poll.

**Out-of-process isolation.** Each test runs in its own browser context (think: incognito profile). There's no shared state between tests by default. No cookies bleeding between runs, no `localStorage` pollution.

**True multi-tab and cross-origin support.** Playwright can open new tabs, switch between them, and navigate across origins — all natively, without hacks.

**First-class TypeScript support.** The types are excellent. Your IDE autocompletes everything. You write real, type-safe test code, not stringly typed selectors.

---

## 3. Auto-Waiting in Depth

Auto-waiting is the feature I show to every developer who's skeptical of Playwright. When you call `page.click('button')`, Playwright doesn't immediately fire the click. It first waits for the element to:

1. Exist in the DOM
2. Be visible (not `display: none` or `visibility: hidden`)
3. Be stable (not animating)
4. Be enabled (not `disabled`)
5. Receive the pointer event (not covered by another element)

All of this happens automatically, with a configurable timeout (default 30 seconds). You write the intent; Playwright handles the synchronization.

```typescript
// tests/smoke.spec.ts
import { test, expect } from '@playwright/test';

test('hero section is visible on load', async ({ page }) => {
  await page.goto('/');

  // No sleep, no waitForSelector — Playwright auto-waits
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toContainText('Alkam Fariz');
});
```

### Actionability vs. Assertions

It's worth knowing that auto-waiting applies differently to *actions* vs. *assertions*:

- **Actions** (`click`, `fill`, `hover`) auto-wait for the element to be actionable before proceeding.
- **Assertions** (`expect(locator).toBeVisible()`) use `expect`'s own retry mechanism, polling until the condition is met or timing out.

You can tune assertion timeouts independently:

```typescript
// Wait up to 5s for a specific assertion, overriding the global default
await expect(page.getByTestId('notification-banner')).toBeHidden({
  timeout: 5_000,
});
```

### Waiting for Network Responses

Auto-waiting doesn't cover network calls by default, but Playwright gives you clean primitives for that too:

```typescript
test('project cards load after data fetch', async ({ page }) => {
  // Wait for the API response and the DOM update in one clean pattern
  const responsePromise = page.waitForResponse('**/api/projects');
  await page.goto('/projects');
  const response = await responsePromise;

  expect(response.status()).toBe(200);
  await expect(page.getByTestId('project-card')).toHaveCount(3);
});
```

---

## 4. Cross-Browser Testing

This is where Playwright earns its keep. Real cross-browser testing — not just "it runs in Chrome" — catches real bugs. I have caught layout issues that only appeared in Firefox, and touch event mismatches that only showed up on Mobile Chrome.

### Configuring Projects

In `playwright.config.ts`, each "project" maps to a browser configuration:

```typescript
// playwright.config.ts (projects excerpt)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

The `devices` preset sets the viewport, user agent, and device pixel ratio automatically. `Pixel 5` gives you a `393x851` viewport with a touch-enabled device profile.

### Selector Strategies Across Browsers

Some selectors that "work" in Chromium are fragile in Firefox because of subtle rendering differences. The Playwright team recommends the **user-facing locator API** over CSS or XPath selectors. These locators find elements the way a user does — by role, label, or visible text — which is naturally cross-browser:

```typescript
// Prefer this — works identically in all browsers
page.getByRole('button', { name: 'Send Message' })
page.getByLabel('Email address')
page.getByPlaceholder('Enter your name')
page.getByText('Read more')

// Avoid fragile CSS selectors for interactive elements
// page.locator('.btn-primary.cta-submit') <- brittle
```

For elements without good semantic roles (e.g., custom visual components), `data-testid` attributes are your friend:

```typescript
// In your component
// <div data-testid="skill-badge">TypeScript</div>

// In your test
await expect(page.getByTestId('skill-badge')).toHaveCount(8);
```

---

## 5. Parallel Execution

Playwright parallelizes at two levels:

1. **File-level**: Test files run in parallel across worker processes (default behaviour).
2. **Test-level**: Within a single file you can opt into parallel mode with `test.describe.parallel`.

### Workers Configuration

For local development I use 2 workers — enough to speed things up without overwhelming my laptop:

```typescript
// playwright.config.ts
export default defineConfig({
  // 2 workers locally; override in CI with environment variable
  workers: process.env.CI ? 4 : 2,
  // ...
});
```

In CI (GitHub Actions with a 4-core runner) I bump it to 4. Each worker gets its own browser process and its own set of browser contexts, so tests are truly isolated.

### Test Isolation

Every test gets a fresh browser context. That means:

- Clean cookies and `localStorage`
- No shared authentication state (unless you explicitly set it up with `storageState`)
- No race conditions from shared DOM

If you need shared state (e.g., a logged-in session), Playwright's `storageState` lets you authenticate once and reuse the session file:

```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', process.env.TEST_EMAIL!);
  await page.fill('[name=password]', process.env.TEST_PASSWORD!);
  await page.click('button[type=submit]');
  await page.waitForURL('/dashboard');

  // Save session to disk
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

Then reference it in your project config:

```typescript
{
  name: 'authenticated',
  use: { storageState: 'playwright/.auth/user.json' },
  dependencies: ['setup'],
}
```

---

## 6. The `playwright.config.ts` Deep Dive

Here's the full config I use for this portfolio project, annotated:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Directory containing all test specs
  testDir: './tests',

  // Run all tests in a file sequentially by default
  // (parallel is opt-in per describe block)
  fullyParallel: false,

  // Fail the build on CI if test.only is accidentally committed
  forbidOnly: !!process.env.CI,

  // Retry failed tests once on CI, never locally
  retries: process.env.CI ? 1 : 0,

  // 2 parallel workers locally, 4 on CI
  workers: process.env.CI ? 4 : 2,

  // Reporter: list in terminal + HTML report saved to playwright-report/
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    // Base URL so tests can use relative paths: page.goto('/')
    baseURL: 'http://localhost:4321',

    // Collect traces on first retry (great for debugging CI failures)
    trace: 'on-first-retry',

    // Capture screenshot only on failure
    screenshot: 'only-on-failure',

    // Record video only on retry (saves disk space)
    video: 'on-first-retry',
  },

  // Spin up the Astro dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // 2 minutes for cold starts
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

### Key Decisions Explained

**`reuseExistingServer: !process.env.CI`** — Locally, if you already have `npm run dev` running, Playwright won't start a second instance. On CI there's no pre-existing server, so it starts fresh. This saves a lot of friction during local development.

**`trace: 'on-first-retry'`** — Traces capture a full timeline of the test: network requests, DOM snapshots, console logs. Recording on every run would be wasteful. Recording only on retry means you get a trace exactly when something goes wrong.

**`fullyParallel: false`** — I prefer file-level parallelism and sequential execution within a file. It makes test output easier to read and avoids timing issues when tests in the same file interact with the same server routes.

---

## 7. Writing a Real Test Suite

My test suite is organised into three tiers, each in its own directory:

```
tests/
  smoke/
    homepage.spec.ts      <- Is the app up? Are critical elements present?
  tier1/
    navigation.spec.ts    <- Core user journeys
    contact.spec.ts       <- Form submission flow
    projects.spec.ts      <- Project listing & detail pages
  tier2/
    accessibility.spec.ts <- WCAG compliance checks
    responsive.spec.ts    <- Layout at various viewports
    edge-cases.spec.ts    <- Error states, empty states
```

### Smoke Tests

Smoke tests are intentionally minimal. They answer one question: *is the app alive and loading?*

```typescript
// tests/smoke/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Smoke — Homepage', () => {
  test('page loads with HTTP 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('critical above-the-fold content is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('no JavaScript console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    expect(errors).toHaveLength(0);
  });
});
```

### Tier1 — Core Feature Tests

Tier1 tests verify complete user journeys end-to-end:

```typescript
// tests/tier1/navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Tier1 — Navigation', () => {
  test('clicking nav links updates the URL and renders the correct page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    await page.getByRole('link', { name: 'Blog' }).click();
    await expect(page).toHaveURL('/blog');
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible();
  });

  test('mobile hamburger menu opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menu = page.getByRole('navigation');
    const hamburger = page.getByRole('button', { name: /menu/i });

    // Menu links should be hidden initially on mobile
    await expect(menu.getByRole('link', { name: 'Projects' })).toBeHidden();

    await hamburger.click();
    await expect(menu.getByRole('link', { name: 'Projects' })).toBeVisible();

    await hamburger.click();
    await expect(menu.getByRole('link', { name: 'Projects' })).toBeHidden();
  });
});
```

### Tier2 — Boundary and Edge Case Tests

Tier2 tests are where you catch the subtle bugs that only happen in edge conditions:

```typescript
// tests/tier2/edge-cases.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Tier2 — Edge Cases', () => {
  test('404 page renders for unknown routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    // Astro serves a custom 404 page
    expect(response?.status()).toBe(404);
    await expect(page.getByText('Page not found')).toBeVisible();
  });

  test('contact form shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: 'Send Message' }).click();

    // HTML5 validation or custom validation messages should appear
    await expect(page.getByText(/required/i)).toBeVisible();
  });

  test('blog post renders code blocks with syntax highlighting', async ({ page }) => {
    await page.goto('/blog');
    const firstPost = page.getByRole('link', { name: /blog post/i }).first();
    await firstPost.click();

    // Shiki/Prism code blocks should be present
    await expect(page.locator('pre code')).toBeVisible();
  });
});
```

---

## 8. Page Object Model Pattern

As test suites grow, raw locators scattered across files become a maintenance nightmare. The Page Object Model (POM) wraps page interactions behind a clean API. When your UI changes, you update the page object — not every test that uses it.

```typescript
// tests/page-objects/NavigationPage.ts
import { type Page, type Locator } from '@playwright/test';

export class NavigationPage {
  private readonly page: Page;
  private readonly navBar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navBar = page.getByRole('navigation');
  }

  async goto() {
    await this.page.goto('/');
  }

  async clickLink(name: string) {
    await this.navBar.getByRole('link', { name }).click();
  }

  async isMenuVisible() {
    return this.navBar.isVisible();
  }

  getActiveLink() {
    return this.navBar.locator('[aria-current="page"]');
  }
}
```

```typescript
// tests/page-objects/ContactPage.ts
import { type Page, type Locator } from '@playwright/test';

export class ContactPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly messageTextarea: Locator;
  readonly submitButton: Locator;
  readonly successBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByLabel('Name');
    this.emailInput = page.getByLabel('Email');
    this.messageTextarea = page.getByLabel('Message');
    this.submitButton = page.getByRole('button', { name: 'Send Message' });
    this.successBanner = page.getByTestId('form-success');
  }

  async goto() {
    await this.page.goto('/contact');
  }

  async fillAndSubmit(name: string, email: string, message: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.messageTextarea.fill(message);
    await this.submitButton.click();
  }
}
```

Using these in a test becomes much more readable:

```typescript
// tests/tier1/contact.spec.ts
import { test, expect } from '@playwright/test';
import { ContactPage } from '../page-objects/ContactPage';

test('contact form submits successfully', async ({ page }) => {
  const contact = new ContactPage(page);
  await contact.goto();
  await contact.fillAndSubmit('Jane Doe', 'jane@example.com', 'Hello!');

  await expect(contact.successBanner).toBeVisible();
});
```

---

## 9. Debugging with Playwright

Debugging E2E tests used to mean adding `console.log` statements and squinting at CI logs. Playwright's debugging tools are genuinely excellent.

### The Trace Viewer

When a test fails in CI, the trace file (`.zip`) is uploaded as an artifact. You can open it locally with:

```bash
npx playwright show-trace path/to/trace.zip
```

The trace viewer gives you a timeline of every action, a DOM snapshot at each step, network requests, console logs, and screenshots. You can scrub through the test like a video — it's one of the most impressive debugging tools I've used.

### Headed Mode

Run tests in a visible browser window for live debugging:

```bash
npx playwright test --headed
```

Combine with `--project=chromium` to narrow down to a single browser and `--grep` to run a single test:

```bash
npx playwright test --headed --project=chromium --grep "contact form submits"
```

### The UI Mode

The `--ui` flag opens Playwright's interactive UI mode — a GUI where you can see all your tests, run them individually, watch them execute step-by-step, and inspect the trace inline:

```bash
npx playwright test --ui
```

This is my go-to for writing new tests. I run the test, watch it fail, click through the steps in the trace panel, and fix the locator or assertion — all without leaving the UI.

### `page.pause()` for Interactive Debugging

Drop a `page.pause()` call anywhere in a test (requires `--headed`) to freeze execution and open Playwright Inspector:

```typescript
test('debugging a flaky interaction', async ({ page }) => {
  await page.goto('/projects');
  await page.pause(); // <- Execution pauses here; Inspector opens
  await page.getByTestId('project-card').first().click();
});
```

In Inspector you can hover over elements, click them, and see the generated locator code — perfect for finding the right selector.

---

## 10. Handling Dynamic Content and APIs

### Route Interception

One of Playwright's most powerful features is the ability to intercept and mock network requests. This lets you test UI states that are hard to reproduce with real data — empty states, error responses, slow loading:

```typescript
test('shows empty state when API returns no projects', async ({ page }) => {
  // Intercept the projects API and return an empty array
  await page.route('**/api/projects', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.goto('/projects');
  await expect(page.getByText('No projects found')).toBeVisible();
});

test('shows error banner when API fails', async ({ page }) => {
  await page.route('**/api/projects', async route => {
    await route.fulfill({ status: 500 });
  });

  await page.goto('/projects');
  await expect(page.getByRole('alert')).toContainText('Something went wrong');
});
```

### Mocking Slow Responses

You can simulate network latency to test loading states:

```typescript
test('shows skeleton loader during slow API response', async ({ page }) => {
  await page.route('**/api/projects', async route => {
    // Delay the response by 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2_000));
    await route.continue();
  });

  await page.goto('/projects');

  // Skeleton should be visible during the delay
  await expect(page.getByTestId('skeleton-loader')).toBeVisible();

  // After the delay, real content should appear
  await expect(page.getByTestId('project-card')).toBeVisible({ timeout: 5_000 });
});
```

### Testing File Downloads

```typescript
test('resume PDF downloads on button click', async ({ page }) => {
  await page.goto('/');

  // Start waiting for the download before clicking
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Resume' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/resume.*\.pdf/i);
});
```

---

## 11. CI/CD Integration Tips

### GitHub Actions Setup

Here's a minimal but production-ready workflow:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test
        env:
          CI: true

      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

      - name: Upload traces on failure
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-traces
          path: test-results/
          retention-days: 7
```

### Caching Playwright Browsers

Playwright browser binaries are large (~300MB). Cache them to speed up CI:

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}

- name: Install Playwright browsers
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps
```

### Running Only Changed Tests

For large suites, use `--only-changed` (available from Playwright 1.38+) to run tests related to changed files:

```bash
npx playwright test --only-changed=origin/main
```

---

## 12. Common Pitfalls and How to Avoid Them

### Pitfall 1: Using `page.waitForTimeout()`

`page.waitForTimeout()` is a hard sleep. It makes tests slow on fast machines and fragile on slow ones. Almost every use of it can be replaced with a proper wait:

```typescript
// Bad: hard sleep
await page.waitForTimeout(2000);
await expect(page.getByTestId('toast')).toBeVisible();

// Good: assertion with timeout retries automatically
await expect(page.getByTestId('toast')).toBeVisible({ timeout: 5_000 });
```

### Pitfall 2: Asserting on Locators That Don't Retry

The `locator.count()` and `locator.innerText()` methods return immediately without retrying. Use the `expect` assertion form which retries:

```typescript
// Risky: can be a race condition
const count = await page.getByTestId('card').count();
expect(count).toBe(3);

// Safe: retries until the count matches or times out
await expect(page.getByTestId('card')).toHaveCount(3);
```

### Pitfall 3: Not Isolating Tests Properly

If one test leaves state behind (e.g., a form half-filled), the next test may fail for mysterious reasons. Always navigate to a clean URL at the start of each test or use `beforeEach`:

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/contact');
});
```

### Pitfall 4: Relying on Visual Position

Selectors like "the third button" or `nth-child(3)` break whenever the layout changes. Use role + name selectors or `data-testid` attributes. They are resilient to DOM structure changes.

### Pitfall 5: Ignoring Mobile Viewports

If you're only running tests on Desktop Chrome, you're not catching mobile layout bugs. The Mobile Chrome project in your config costs almost nothing extra in CI time and catches real issues. Don't skip it.

### Pitfall 6: Not Handling `async`/`await` Correctly

Playwright is entirely async. Forgetting `await` before an assertion or action produces no error — it just silently passes or behaves unexpectedly:

```typescript
// Wrong: assertion is never awaited, test passes regardless
expect(page.getByText('Hello')).toBeVisible();

// Correct: always await Playwright assertions
await expect(page.getByText('Hello')).toBeVisible();
```

Add `eslint-plugin-playwright` to catch these automatically:

```bash
npm install -D eslint-plugin-playwright
```

```json
{
  "plugins": ["playwright"],
  "extends": ["plugin:playwright/recommended"]
}
```

---

## 13. Conclusion

After two years of writing Playwright tests, I can say without hesitation that it's the best E2E testing tool I've used. The auto-waiting architecture eliminates an entire class of flaky tests. The cross-browser support is genuine, not an afterthought. The debugging tools — trace viewer, UI mode, Inspector — make diagnosing failures almost enjoyable. And the TypeScript experience is first-class throughout.

For my Astro + React portfolio, 66 tests across three browsers run in around 90 seconds locally with 2 workers. The same suite runs on GitHub Actions in under 3 minutes with browser caching. Every deploy is verified. Every pull request gets feedback. And when something breaks, I have a trace file that shows me exactly what happened.

If you're still fighting Selenium timeouts or running into Cypress's architectural limits, give Playwright a serious look. Start with the smoke tests — they take 30 minutes to write and immediately give you confidence in your deploy pipeline. Then layer in tier1 and tier2 tests as your app grows.

The investment pays off quickly. I promise.

---

*All code examples in this post use Playwright v1.44+ and TypeScript 5.x. The full test suite for this portfolio is available in the repository if you want to browse real examples.*
