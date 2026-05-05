import { expect, test } from '@playwright/test';

const ROUTES = [
  {
    name: 'main home',
    url: 'http://127.0.0.1:4321/',
    expectedTitle: /LibreUni/i,
    expectedText: /Master the\s+fundamentals/i,
  },
  {
    name: 'main Python lesson',
    url: 'http://127.0.0.1:4321/lessons/python/intro.html',
    expectedTitle: /Python/i,
    expectedText: /Python/i,
  },
  {
    name: 'language app',
    url: 'http://127.0.0.1:4322/',
    expectedTitle: /LibreUni Languages/i,
    expectedText: /Language tracks/i,
  },
  {
    name: 'history app',
    url: 'http://127.0.0.1:4323/',
    expectedTitle: /HISTORIA/i,
    expectedText: /Interactive Historical Atlas/i,
  },
];

test.describe('production smoke checks', () => {
  for (const route of ROUTES) {
    test(`${route.name} renders without hard browser errors`, async ({ page }, testInfo) => {
      const browserErrors = [];
      page.on('pageerror', (error) => browserErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') {
          browserErrors.push(message.text());
        }
      });

      const response = await page.goto(route.url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

      expect(response?.ok(), `${route.url} should return a 2xx response`).toBe(true);
      await expect(page.locator('body')).toBeVisible();
      await expect(page).toHaveTitle(route.expectedTitle);
      await expect(page.locator('body')).toContainText(route.expectedText);
      await expect(page.locator('body')).not.toContainText(/Not found|Internal Server Error/i);

      const toleratedExternalNoise = browserErrors.filter(
        (message) => !/Failed to load resource: net::ERR_(BLOCKED_BY_CLIENT|ABORTED)/i.test(message),
      );
      await testInfo.attach(`${route.name} browser errors`, {
        body: JSON.stringify(toleratedExternalNoise, null, 2),
        contentType: 'application/json',
      });
      expect(toleratedExternalNoise).toEqual([]);
    });
  }

  test('main course search filters tracks', async ({ page }) => {
    await page.goto('http://127.0.0.1:4321/', { waitUntil: 'domcontentloaded' });

    const search = page.locator('#course-search');
    await expect(search).toBeVisible();
    await search.fill('python');

    const pythonCard = page.locator('.course-card[href$="courses/python.html"]');
    const machineLearningCard = page.locator('.course-card[href$="courses/machine-learning.html"]');

    await expect(pythonCard).toBeVisible();
    await expect(machineLearningCard).toBeHidden();

    await search.fill('');
    await expect(machineLearningCard).toBeVisible();
  });

  test('mobile menu exposes primary navigation', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'Mobile-only navigation check.');

    await page.goto('http://127.0.0.1:4321/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /toggle menu/i }).click();

    await expect(page.getByRole('link', { name: /Home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Tracks/i })).toBeVisible();
  });
});
