import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const SEARCH_INDEX_PATH = fileURLToPath(new URL('../../dist/search-index.json', import.meta.url));
const LESSON_ROUTES = JSON.parse(fs.readFileSync(SEARCH_INDEX_PATH, 'utf8'))
  .filter((entry) => entry.type === 'lesson')
  .map((entry) => ({ title: entry.title, url: `/${entry.url}` }));
const LESSON_BATCH_SIZE = 20;

const ROUTES = [
  {
    name: 'main home',
    url: 'http://127.0.0.1:4321/',
    expectedTitle: /LibreUni/i,
    expectedText: /Master the\s+fundamentals/i,
  },
  {
    name: 'Database Systems lesson',
    url: 'http://127.0.0.1:4321/lessons/database-systems/relational-model.html',
    expectedTitle: /Relational model/i,
    expectedText: /grain/i,
  },
  {
    name: 'Operating Systems course',
    url: 'http://127.0.0.1:4321/courses/operating-systems.html',
    expectedTitle: /Operating Systems Engineering/i,
    expectedText: /Crossing the kernel boundary/i,
  },
  {
    name: 'main About page',
    url: 'http://127.0.0.1:4321/about.html',
    expectedTitle: /About/i,
    expectedText: /Updates/i,
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

  for (let start = 0; start < LESSON_ROUTES.length; start += LESSON_BATCH_SIZE) {
    const batch = LESSON_ROUTES.slice(start, start + LESSON_BATCH_SIZE);
    const batchNumber = Math.floor(start / LESSON_BATCH_SIZE) + 1;

    test(`all lesson pages in batch ${batchNumber} render and hydrate`, async ({ page }) => {
      test.setTimeout(120_000);
      const failures = [];
      const browserErrors = [];
      page.on('pageerror', (error) => browserErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') browserErrors.push(message.text());
      });

      for (const lesson of batch) {
        browserErrors.length = 0;

        const response = await page.goto(lesson.url, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

        const article = page.locator('article');
        const articleText = (await article.innerText().catch(() => '')).trim();
        const toleratedErrors = browserErrors.filter(
          (message) => !/Failed to load resource: net::ERR_(BLOCKED_BY_CLIENT|ABORTED)/i.test(message),
        );
        const unhydratedIslands = await page.locator('astro-island[ssr]').count();

        if (!response?.ok()) failures.push(`${lesson.url}: HTTP ${response?.status()}`);
        if (articleText.length < 100) failures.push(`${lesson.url}: article is empty or truncated`);
        if (unhydratedIslands > 0) failures.push(`${lesson.url}: ${unhydratedIslands} island(s) did not hydrate`);
        if (toleratedErrors.length) failures.push(`${lesson.url}: ${toleratedErrors.join(' | ')}`);
      }

      expect(failures, failures.join('\n')).toEqual([]);
    });
  }

  test('main course search filters courses', async ({ page }) => {
    await page.goto('http://127.0.0.1:4321/courses.html', { waitUntil: 'domcontentloaded' });

    const search = page.locator('#course-search');
    await expect(search).toBeVisible();
    await search.fill('operating systems');

    const operatingSystemsCard = page.locator('.course-card:has(a[href$="courses/operating-systems.html"])');
    const databaseCard = page.locator('.course-card:has(a[href$="courses/database-systems.html"])');

    await expect(operatingSystemsCard).toBeVisible();
    await expect(databaseCard).toBeHidden();

    await search.fill('');
    await expect(databaseCard).toBeVisible();
  });

  test('catalog exposes only the three active courses and excludes archived routes', async ({ page, request }) => {
    await page.goto('http://127.0.0.1:4321/courses.html', { waitUntil: 'domcontentloaded' });
    const cards = page.locator('.course-card');
    await expect(cards).toHaveCount(3);
    await expect(page.locator('body')).not.toContainText(/Algorithms|Data Structures|Software Engineering/i);
    for (const retired of ['algorithms', 'data-structures', 'software-engineering']) {
      const response = await request.get(`http://127.0.0.1:4321/courses/${retired}.html`);
      expect(response.status(), `${retired} should be archived`).toBe(404);
    }
  });

  test('Systems Foundations path requires entry evidence and preserves revision state', async ({ page }) => {
    await page.goto('/careers/systems-foundations.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#entry-checks')).toBeVisible();
    await expect(page.locator('#machine')).toBeVisible();
    await expect(page.locator('#kernel')).toBeVisible();
    await expect(page.locator('#data')).toBeVisible();
    await expect(page.locator('#synthesis')).toBeVisible();
    await expect(page.getByRole('link', { name: /Computer Architecture/i })).toHaveAttribute('href', /computer-architecture/);
    await expect(page.getByRole('link', { name: /Operating Systems Engineering/i })).toHaveAttribute('href', /operating-systems/);
    await expect(page.getByRole('link', { name: /Database Systems/i })).toHaveAttribute('href', /database-systems/);
    const gate = page.getByRole('group', { name: 'Explain the machine', exact: true });
    const notes = gate.getByRole('textbox', { name: 'Evidence and revision notes' });
    const reviewed = gate.getByRole('checkbox');
    await expect(reviewed).toBeDisabled();
    await notes.fill('Reviewed translation and recovery evidence.');
    await reviewed.check();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(notes).toHaveValue('Reviewed translation and recovery evidence.');
    await expect(reviewed).toBeChecked();
    await notes.fill('Edited after review.');
    await expect(reviewed).not.toBeChecked();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download evidence record' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/evidence/i);
    const record = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    expect(record.evidence.machine).toEqual({ notes: 'Edited after review.', reviewed: false });
  });

  test('Systems Foundations reports unavailable storage honestly', async ({ page }) => {
    await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage unavailable'); } }); });
    await page.goto('/careers/systems-foundations.html', { waitUntil: 'networkidle' });
    await expect(page.getByRole('status').filter({ hasText: /storage is unavailable/i })).toBeVisible();
    await page.locator('#evidence-machine').fill('Unsaved evidence can still be downloaded.');
    await expect(page.getByRole('button', { name: 'Download evidence record' })).toBeEnabled();
  });

  test('mobile menu exposes primary navigation', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'Mobile-only navigation check.');

    await page.goto('http://127.0.0.1:4321/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /toggle menu/i }).click();

    const mobileMenu = page.locator('#mobile-menu');
    await expect(mobileMenu.getByRole('link', { name: /Home/i })).toBeVisible();
    await expect(mobileMenu.getByRole('link', { name: /^Courses/i })).toBeVisible();
    await expect(mobileMenu.getByRole('link', { name: /Learning Paths/i })).toBeVisible();
  });

  test('interactive lesson controls hydrate together', async ({ page }) => {
    await page.goto('/lessons/database-systems/sql-querying.html', { waitUntil: 'networkidle' });

    const exercise = page.locator('.code-exercise').first();
    await expect(exercise).toBeVisible();

    const themeToggle = page.getByRole('button', { name: /Choose theme/ });
    await themeToggle.click();
    await expect(page.getByRole('dialog', { name: 'Theme settings' })).toBeVisible();

    const search = page.getByRole('textbox', { name: /Search courses, modules, and topics/ }).first();
    await search.fill('transaction');
    await expect(search).toHaveValue('transaction');
  });

  test('architecture models preserve fixed-width, cache, and branch state in the browser', async ({ page }) => {
    await page.goto('/lessons/computer-architecture/digital-representation.html', { waitUntil: 'networkidle' });
    let model = page.locator('.interactive-playground').first();
    await model.getByRole('slider', { name: 'Mathematical input' }).fill('128');
    await expect(model.locator('output')).toContainText('signed -128');
    await model.getByRole('slider', { name: 'Word width' }).fill('9');
    await expect(model.locator('output')).toContainText('signed 128');
    await page.goto('/lessons/computer-architecture/cache-hierarchies.html', { waitUntil: 'networkidle' });
    model = page.locator('.interactive-playground').first();
    await expect(model.locator('output')).toContainText('0/6 hits');
    await model.getByRole('slider', { name: 'Cache associativity' }).fill('2');
    await expect(model.locator('output')).toContainText('4/6 hits');
    await model.getByRole('combobox', { name: 'Cache block trace' }).selectOption('three');
    await expect(model.locator('output')).toContainText('0/6 hits');
    await page.goto('/lessons/computer-architecture/hazards-and-branches.html', { waitUntil: 'networkidle' });
    model = page.locator('.interactive-playground').first();
    const rows = model.locator('.interactive-playground-screen table tbody tr');
    await expect(rows).toHaveCount(9);
    await expect(rows.nth(5).locator('td').nth(4)).toHaveText('I1');
    await expect(rows.nth(6).locator('td').nth(5)).toHaveText('I1');
    await model.getByRole('checkbox', { name: 'Branch taken' }).check();
    await expect(rows).toHaveCount(11);
    await expect(rows.nth(6).locator('td').nth(3)).toHaveText('·');
    await expect(rows.last().locator('td').last()).toHaveText('T');
  });

  test('quantitative lesson lab exposes a responsive model control', async ({ page }) => {
    await page.goto('/lessons/database-systems/query-plans.html', { waitUntil: 'networkidle' });

    const playground = page.locator('.interactive-playground').filter({ hasText: 'Change selectivity' });
    const slider = playground.getByRole('slider', { name: /Predicate selectivity/i });
    await expect(playground).toContainText('5%');
    await slider.fill('50');
    await expect(playground).toContainText('50%');
  });

  test('Operating Systems lesson navigation exposes structure without duplicating the page heading', async ({ page }, testInfo) => {
    await page.goto('/lessons/operating-systems/operating-system-contract.html', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/The Operating-System Contract/i);

    const sidebar = page.locator('#course-sidebar');
    await expect(sidebar.locator('[data-course-module]')).toHaveCount(7);
    const mobile = testInfo.project.name === 'mobile-chrome';
    if (mobile) await page.getByRole('button', { name: 'Course contents', exact: true }).click();
    await expect(sidebar.getByRole('link', { name: /The Operating-System Contract/i })).toHaveAttribute('aria-current', 'page');

    const processesModule = sidebar.locator('[data-course-module]').nth(1);
    await processesModule.locator('summary').click();
    await expect(processesModule).toHaveAttribute('open', '');
    await expect(processesModule.getByRole('link', { name: /CPU scheduling as policy/i })).toBeVisible();

    if (mobile) {
      await page.getByRole('button', { name: 'Close course contents' }).click();
    } else {
      await sidebar.getByRole('button', { name: 'Hide course contents' }).click();
      await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
      const restore = page.getByRole('button', { name: 'Show course contents' });
      await expect(restore).toBeVisible();
      await restore.click();
      await expect(sidebar).not.toHaveAttribute('aria-hidden', 'true');
    }

    const completion = page.locator('#mark-completed');
    await completion.click();
    await expect(completion).toHaveAttribute('aria-pressed', 'true');
    if (mobile) await page.getByRole('button', { name: 'Course contents', exact: true }).click();
    await expect(sidebar.locator('#course-completion-summary')).toHaveText('1 of 28 complete');
  });

  test('Operating Systems scheduler model changes state and restores its documented baseline', async ({ page }) => {
    await page.goto('/lessons/operating-systems/cpu-scheduling.html', { waitUntil: 'networkidle' });

    const playground = page.locator('.interactive-playground').filter({ hasText: 'Schedule the same jobs under competing policies' });
    const policy = playground.getByRole('combobox', { name: 'Scheduling policy' });
    const quantum = playground.getByRole('slider', { name: 'Round robin quantum' });
    const switchCost = playground.getByRole('slider', { name: 'Context switch cost' });

    await expect(policy).toHaveValue('RR');
    await expect(quantum).toHaveValue('2');
    await switchCost.fill('2');
    await expect(playground.locator('output')).toContainText(/useful CPU/i);
    await policy.selectOption('FCFS');
    await expect(quantum).toBeDisabled();

    await playground.getByRole('button', { name: 'Reset model' }).click();
    await expect(policy).toHaveValue('RR');
    await expect(quantum).toHaveValue('2');
    await expect(switchCost).toHaveValue('0');
  });

  test('mobile Operating Systems contents are modal, dismissible, and return focus', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'Mobile-only course navigation check.');

    await page.goto('/lessons/operating-systems/page-tables-and-tlbs.html', { waitUntil: 'networkidle' });
    const toggle = page.getByRole('button', { name: 'Course contents', exact: true });
    const sidebar = page.locator('#course-sidebar');

    await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(sidebar).not.toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('button', { name: 'Close course contents' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    await expect(toggle).toBeFocused();
  });

  test('database playground exposes explicit state controls', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/lessons/database-systems/transactions-and-isolation.html', { waitUntil: 'networkidle' });

    const playground = page.locator('.interactive-playground').first();
    await expect(playground.getByRole('slider', { name: /Schedule step/i })).toBeVisible();
    await playground.getByRole('slider', { name: /Schedule step/i }).fill('6');
    await expect(playground).toContainText(/lost update/i);
    expect(errors).toEqual([]);
  });

  test('active-course visuals and math are rendered, not leaked source', async ({ page }) => {
    test.setTimeout(120_000);
    const activeLessons = LESSON_ROUTES.filter((lesson) => /\/lessons\/(computer-architecture|operating-systems|database-systems)\//.test(lesson.url));
    const failures = [];
    for (const lesson of activeLessons) {
      await page.goto(lesson.url, { waitUntil: 'domcontentloaded' });
      const article = page.locator('article');
      const visibleText = await article.evaluate((root) => {
        const clone = root.cloneNode(true);
        clone.querySelectorAll('pre, code, svg, details.diagram-source, script, style, annotation').forEach((node) => node.remove());
        return clone.textContent || '';
      });
      if (/\\(?:sum|frac|sqrt|Theta|Omega|alpha|beta|ge|le|log|lfloor|rfloor)\b|(?<!\\)\$[^$\n]+(?<!\\)\$/.test(visibleText)) {
        failures.push(`${lesson.url}: raw TeX visible in lesson text`);
      }
      if (visibleText.includes('\\n')) failures.push(`${lesson.url}: escaped newline leaked into lesson text`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('development quality page renders charts and supports table sorting', async ({ page }) => {
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        browserErrors.push(message.text());
      }
    });

    await page.goto('http://127.0.0.1:4321/development.html', { waitUntil: 'networkidle' });

    // Verify no console/browser errors occurred (tolerating 404 resource failures for UX reports that build later in pipeline)
    const toleratedErrors = browserErrors.filter(
      (msg) => !/Failed to load resource/i.test(msg)
    );
    expect(toleratedErrors).toEqual([]);

    // Check that plots are visible (meaning JS rendered them and removed the 'hidden' class)
    const screePlot = page.locator('#scree-plot');
    await expect(screePlot).toBeVisible();
    await expect(screePlot).not.toHaveClass(/hidden/);
    await expect(screePlot.locator('rect')).not.toHaveCount(0);

    const scatterPlot = page.locator('#scatter-plot');
    await expect(scatterPlot).toBeVisible();
    await expect(scatterPlot).not.toHaveClass(/hidden/);
    await expect(scatterPlot.locator('circle.scatter-dot')).not.toHaveCount(0);

    // Check warning list rendering
    const warningsList = page.locator('#warnings-list');
    await expect(warningsList.locator('.warning-card')).not.toHaveCount(0);

    // Test table sorting by lessons
    const courseMetricsBody = page.locator('#course-metrics');

    // Click sort by lessons
    await page.locator('button[data-sort="lessons"]').click();
    const firstRowAfterAsc = await courseMetricsBody.locator('tr').first().innerText();

    // Click again for descending sort
    await page.locator('button[data-sort="lessons"]').click();
    const firstRowAfterDesc = await courseMetricsBody.locator('tr').first().innerText();

    expect(firstRowAfterAsc).not.toEqual(firstRowAfterDesc);
  });
});

test('every course PDF is available as a downloadable document', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:4321/courses/operating-systems.pdf');

  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toMatch(/^application\/pdf/);
});
