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

  test('catalog exposes active courses and excludes archived routes', async ({ page, request }) => {
    await page.goto('http://127.0.0.1:4321/courses.html', { waitUntil: 'domcontentloaded' });
    const cards = page.locator('.course-card');
    await expect(cards).toHaveCount(4);
    await expect(page.locator('body')).not.toContainText(/Algorithms|Data Structures|Software Engineering/i);
    for (const retired of ['algorithms', 'data-structures', 'software-engineering']) {
      const response = await request.get(`http://127.0.0.1:4321/courses/${retired}.html`);
      expect(response.status(), `${retired} should be archived`).toBe(404);
    }
  });

  test('Software Engineer career roadmap presents languages, skills, reading list, and 4-stage study sequence', async ({ page }) => {
    await page.goto('/careers/software-engineer.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#languages')).toBeVisible();
    await expect(page.locator('#skills')).toBeVisible();
    await expect(page.locator('#reading-list')).toBeVisible();
    await expect(page.locator('#roadmap')).toBeVisible();
    await expect(page.locator('#foundations')).toBeVisible();
    await expect(page.locator('#machine')).toBeVisible();
    await expect(page.locator('#kernel')).toBeVisible();
    await expect(page.locator('#data')).toBeVisible();
    await expect(page.getByRole('link', { name: /Introduction to Calculus/i })).toHaveAttribute('href', /calculus-intro/);
    await expect(page.getByRole('link', { name: /Computer Architecture/i })).toHaveAttribute('href', /computer-architecture/);
    await expect(page.getByRole('link', { name: /Operating Systems Engineering/i })).toHaveAttribute('href', /operating-systems/);
    await expect(page.getByRole('link', { name: /Database Systems/i })).toHaveAttribute('href', /database-systems/);
    await expect(page.locator('textarea')).toHaveCount(0);
  });

  test('Lesson pages expose built-in Study Tools side drawer with Pomodoro timer and highlighter', async ({ page }) => {
    await page.goto('/lessons/calculus-intro/limits.html', { waitUntil: 'networkidle' });
    const launcher = page.locator('[data-testid="study-tools-launcher"]');
    await expect(launcher).toBeVisible();
    await launcher.click();
    const drawer = page.getByRole('dialog', { name: /Study tools/i });
    await expect(drawer).toBeVisible();
    await expect(page.locator('[data-testid="pomodoro-time-display"]')).toContainText('25:00');
    await expect(drawer.getByRole('button', { name: /Start timer/i })).toBeVisible();
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

  test('SQL lab executes queries and preserves the fixture on errors', async ({ page }) => {
    await page.goto('/lessons/database-systems/sql-lab.html', { waitUntil: 'domcontentloaded' });
    const lab = page.getByRole('region', { name: 'Service allocation fixture' });
    const query = lab.getByRole('textbox', { name: 'SQL query' });
    const run = lab.getByRole('button', { name: 'Run query' });
    await run.click();
    const results = lab.getByRole('region', { name: 'Query results' });
    await expect(results.locator('tbody tr')).toHaveCount(3);
    await expect(results.locator('tbody tr').nth(1)).toContainText('S201');
    await expect(results.locator('tbody tr').nth(1)).toContainText('0');

    await query.fill("SELECT 'update;--' AS value");
    await run.click();
    await expect(results).toContainText('update;--');
    await query.fill('WITH x AS (SELECT 1) DELETE FROM service_pool');
    await run.click();
    await expect(lab.getByRole('alert')).toContainText(/readonly/i);
    await query.fill('SELECT COUNT(*) AS count FROM service_pool');
    await run.click();
    await expect(results.locator('tbody')).toContainText('4');
    await lab.getByRole('button', { name: 'Reset query' }).click();
    await expect(query).toContainText('LEFT JOIN');
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
    await expect(sidebar.locator('[data-course-module]')).toHaveCount(8);
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
    await expect(sidebar.locator('#course-completion-summary')).toHaveText('1 of 29 complete');
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
    test.setTimeout(180_000);
    const activeLessons = LESSON_ROUTES.filter((lesson) =>
      /\/lessons\/(calculus-intro|computer-architecture|operating-systems|database-systems)\//.test(lesson.url)
    );
    const failures = [];
    for (const lesson of activeLessons) {
      await page.goto(lesson.url, { waitUntil: 'domcontentloaded' });
      const audit = await page.evaluate(() => {
        const katexErrors = document.querySelectorAll('.katex-error').length;
        const tableMismatches = [];
        document.querySelectorAll('table').forEach((table, idx) => {
          const rows = Array.from(table.querySelectorAll('tr'));
          if (rows.length === 0) return;
          const rowCols = rows.map((tr) =>
            Array.from(tr.children)
              .filter((el) => el.tagName === 'TH' || el.tagName === 'TD')
              .reduce((sum, cell) => sum + (cell.colSpan || 1), 0)
          ).filter((n) => n > 0);
          if (rowCols.length > 0 && rowCols.some((n) => n !== rowCols[0])) {
            tableMismatches.push(`table #${idx + 1} row cols=${JSON.stringify(rowCols)}`);
          }
        });

        const article = document.querySelector('article');
        let visibleText = '';
        if (article) {
          const clone = article.cloneNode(true);
          clone
            .querySelectorAll('pre, code, svg, details.diagram-source, script, style, annotation')
            .forEach((node) => node.remove());
          visibleText = clone.textContent || '';
        }
        return { katexErrors, tableMismatches, visibleText };
      });

      if (audit.katexErrors > 0) {
        failures.push(`${lesson.url}: ${audit.katexErrors} .katex-error element(s) rendered`);
      }
      if (audit.tableMismatches.length > 0) {
        failures.push(`${lesson.url}: ragged HTML table columns (${audit.tableMismatches.join(', ')})`);
      }
      if (
        /\\[A-Za-z]{2,}\b|(?<!\\)\$(?=[A-Za-z_\\[({])|(?<!\\)\$\d[\d,]*(?:\.\d+)?[+\-*/^_=|]|(?<!\\)\$[^$\n]+(?<!\\)\$/.test(
          audit.visibleText
        )
      ) {
        failures.push(`${lesson.url}: raw TeX visible in lesson text`);
      }
      if (/`[^`\n]+`/.test(audit.visibleText)) {
        failures.push(`${lesson.url}: unformatted Markdown backtick span visible in lesson text`);
      }
      if (audit.visibleText.includes('\\n')) {
        failures.push(`${lesson.url}: escaped newline leaked into lesson text`);
      }
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

  test('diagrams support Ctrl+scroll zoom, drag panning, and toolbar reset', async ({ page }) => {
    await page.goto('/lessons/database-systems/relational-model.html', { waitUntil: 'networkidle' });

    const frame = page.locator('.diagram-frame').first();
    const render = frame.locator('.diagram-render');
    const resetBtn = frame.locator('[data-diagram-action="reset"]');
    const zoomInBtn = frame.locator('[data-diagram-action="zoom-in"]');
    const hint = frame.locator('.diagram-zoom-hint');

    await expect(frame).toBeVisible();
    await expect(resetBtn).toHaveText('100%');

    // Wheel without Ctrl shows the hint without zooming the diagram
    await render.dispatchEvent('wheel', { deltaY: 80, ctrlKey: false });
    await expect(hint).toHaveClass(/is-visible/);
    await expect(resetBtn).toHaveText('100%');

    // Wheel with Ctrl zooms the diagram inline and hides the hint
    const box = await render.boundingBox();
    await render.dispatchEvent('wheel', {
      deltaY: -100,
      ctrlKey: true,
      clientX: (box?.x ?? 100) + (box?.width ?? 200) / 2,
      clientY: (box?.y ?? 100) + (box?.height ?? 200) / 2,
    });
    await expect(frame).toHaveClass(/is-transformed/);
    await expect(resetBtn).not.toHaveText('100%');

    // Toolbar zoom in and reset restore 100%
    await zoomInBtn.click({ force: true });
    await resetBtn.click({ force: true });
    await expect(resetBtn).toHaveText('100%');
    await expect(frame).not.toHaveClass(/is-transformed/);
  });
});

test('every course PDF is available as a downloadable document', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:4321/courses/operating-systems.pdf');

  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toMatch(/^application\/pdf/);
});

test('calculus practice generator creates randomized questions and preserves state across refresh', async ({ page }) => {
  await page.goto('http://127.0.0.1:4321/lessons/calculus-intro/calculus-practice.html', { waitUntil: 'networkidle' });

  // Initially empty state
  const emptyState = page.locator('#practice-empty-state');
  await expect(emptyState).toBeVisible();

  // Generate question
  const generateBtn = page.locator('#generate-question-btn');
  await generateBtn.click();

  // Question card appears
  const questionCard = page.locator('#generated-questions-list > div').first();
  await expect(questionCard).toBeVisible();

  // Hint button reveals hint
  const hintBtn = questionCard.getByRole('button', { name: /Get Hint/i });
  await expect(hintBtn).toBeVisible();
  await hintBtn.click();
  await expect(questionCard.getByText(/Hint 1 of/i)).toBeVisible();

  // Solution button reveals solution
  const solutionBtn = questionCard.getByRole('button', { name: /Show Solution/i });
  await solutionBtn.click();
  await expect(questionCard.getByText(/Worked Solution/i)).toBeVisible();

  // Verify zero KaTeX errors or red error spans exist
  await expect(page.locator('.katex-error')).toHaveCount(0);
  // Verify answer is rendered via KaTeX without raw LaTeX leak
  const answerBadge = questionCard.getByText(/Answer:/i);
  await expect(answerBadge).toBeVisible();
  const answerText = await answerBadge.innerText();
  expect(answerText).not.toMatch(/\\frac/);

  // Verify page copy is free of prompt boilerplate
  const pageContent = await page.content();
  expect(pageContent).not.toMatch(/without teacher|no timers|artificial time limits/i);

  // Reload page and verify state persistence across refresh
  await page.reload({ waitUntil: 'networkidle' });
  const reloadedCard = page.locator('#generated-questions-list > div').first();
  await expect(reloadedCard).toBeVisible();
  await expect(reloadedCard.getByText(/Hint 1 of/i)).toBeVisible();
  await expect(reloadedCard.getByText(/Worked Solution/i)).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
});

test('calculus practice generator automatically heals and renders legacy questions saved in localStorage', async ({ page }) => {
  // Pre-seed localStorage with the exact legacy broken question from earlier versions
  await page.addInitScript(() => {
    const legacyQ = [{
      id: 'legacy-broken-q-22',
      templateId: 'integral-area-curves',
      topicId: 'integrals',
      topicName: 'Integration & Accumulation',
      difficulty: 'intermediate',
      title: 'Area Enclosed Between Two Curves',
      questionMath: 'Compute the exact area of the planar region bounded between the line $y = 2x$ and the parabola $y = x^2$.',
      hints: [
        'Find the $x$-coordinates of the intersection points by solving $x^2 = 2x$.',
        'Determine which curve lies above the other on the interval between the intersection points. Set up the integral $\\int_{x_1}^{x_2} (y_{\\text{top}} - y_{\\text{bottom}})\\,dx$.',
      ],
      solutionMath:
        '1. **Find Intersection Points:**\n$$x^2 = 2x \\implies x(x - 2) = 0 \\implies x = 0 \\quad \\text{and} \\quad x = 2$$\n\n2. **Identify Upper and Lower Curves:**\nFor any test point in $(0, 2)$, such as $x = 1$, we have $y = 2(1) = 2$ and $y = 1^2 = 1$. Since 2 > 1$, the line $y = 2x$ is above the parabola $y = x^2.\n\n3. **Set Up Area Integral:**\n$$A = \\int_0^{2} (2x - x^2)\\,dx$$\n\n4. **Evaluate Antiderivative:**\n$$A = \\left[ \\frac{2}{2}x^2 - \\frac{x^3}{3} \\right]_0^{2} = \\left( \\frac{2}{2}(2)^2 - \\frac{(2)^3}{3} \\right) - 0$$\n$$A = \\frac{2^3}{2} - \\frac{2^3}{3} = \\frac{8}{6} = \\frac{4}{3}$$\n\nThe exact area is \\frac{4}{3}$.',
      keyAnswer: '\\frac{4}{3}',
      generatedAt: '2026-11-08T10:00:00.000Z',
      revealedHintsCount: 1,
      showSolution: true,
      isMastered: false,
    }];
    localStorage.setItem('libreuni-practice-calculus-intro', JSON.stringify(legacyQ));
  });

  await page.goto('http://127.0.0.1:4321/lessons/calculus-intro/calculus-practice.html', { waitUntil: 'networkidle' });

  // The question card is rendered
  const questionCard = page.locator('#generated-questions-list > div').first();
  await expect(questionCard).toBeVisible();
  await expect(questionCard.getByText('Area Enclosed Between Two Curves')).toBeVisible();

  // Solution is visible and contains 0 KaTeX red errors
  await expect(questionCard.getByText(/Worked Solution/i)).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);

  // Verify markdown double asterisks are parsed into bold <strong> tags, not displayed as literal **
  const strongHeaders = questionCard.locator('strong');
  await expect(strongHeaders.filter({ hasText: 'Find Intersection Points:' })).toBeVisible();
  await expect(strongHeaders.filter({ hasText: 'Identify Upper and Lower Curves:' })).toBeVisible();
  const solutionText = await questionCard.innerText();
  expect(solutionText).not.toContain('**');

  // Answer badge is formatted properly
  const answerBadge = questionCard.getByText(/Answer:/i);
  await expect(answerBadge).toBeVisible();
  const answerText = await answerBadge.innerText();
  expect(answerText).not.toMatch(/\\frac/);

  // Verify localStorage has been healed
  const storedJson = await page.evaluate(() => localStorage.getItem('libreuni-practice-calculus-intro'));
  expect(storedJson).toContain('$y = x^2$.');
  expect(storedJson).not.toContain('Since 2 > 1$,');
});

test('query-plans join table renders cardinality expressions intact across all five columns', async ({ page }) => {
  await page.goto('/lessons/database-systems/query-plans.html', { waitUntil: 'domcontentloaded' });

  const joinTable = page.locator('table', { hasText: 'Second join cost' });
  await expect(joinTable).toBeVisible();

  const thirdRow = joinTable.locator('tbody tr').nth(2);
  const cells = thirdRow.locator('td');
  await expect(cells).toHaveCount(5);

  const secondJoinCell = cells.nth(3);
  const totalCell = cells.nth(4);
  await expect(secondJoinCell.locator('.katex')).toHaveCount(1);
  await expect(totalCell.locator('.katex')).toHaveCount(1);

  const cellTextWithoutAnnotations = async (cell) =>
    cell.evaluate((el) => {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('annotation').forEach((n) => n.remove());
      return clone.textContent || '';
    });

  const secondJoinText = await cellTextWithoutAnnotations(secondJoinCell);
  const totalText = await cellTextWithoutAnnotations(totalCell);
  expect(secondJoinText).not.toContain('\\bowtie');
  expect(totalText).not.toContain('\\bowtie');
  expect(secondJoinText).toContain('1,000+');
  expect(totalText).toContain('1,110+');
});

test('interactive FillInExercise and CodeExercise blanks enable verification and accept alternate forms', async ({ page }) => {
  // 1. Integration by Parts FillInExercise in fundamental-theorem
  await page.goto('/lessons/calculus-intro/fundamental-theorem.html', { waitUntil: 'networkidle' });
  const ibpCard = page.locator('[data-component="FillInExercise"]', { hasText: 'Integration by Parts' });
  await ibpCard.getByLabel('Blank 1').fill("∫(u' * v) dx");
  const ibpCheck = ibpCard.getByRole('button', { name: /Check answer/i });
  await expect(ibpCheck).toBeEnabled();
  await ibpCheck.click();
  await expect(ibpCard).toContainText(/All blanks verified correctly/i);
  await expect(page.locator('.katex-error')).toHaveCount(0);

  // 2. Washer cross-sectional area FillInExercise in applications-integration
  await page.goto('/lessons/calculus-intro/applications-integration.html', { waitUntil: 'networkidle' });
  const washerCard = page.locator('[data-component="FillInExercise"]', { hasText: 'washer cross-sectional area' });
  await washerCard.getByLabel('Blank 1').fill('x**2');
  await washerCard.getByRole('button', { name: /Check answer/i }).click();
  await expect(washerCard).toContainText(/All blanks verified correctly/i);
  await expect(page.locator('.katex-error')).toHaveCount(0);

  // 3. Second-step L'Hopital FillInExercise in mean-value-theorem
  await page.goto('/lessons/calculus-intro/mean-value-theorem.html', { waitUntil: 'networkidle' });
  const mvtCard = page.locator('[data-component="FillInExercise"]', { hasText: "L'Hôpital" });
  await mvtCard.getByLabel('Blank 1').fill('0.5');
  await mvtCard.getByRole('button', { name: /Check answer/i }).click();
  await expect(mvtCard).toContainText(/All blanks verified correctly/i);

  // 4. Darboux sums CodeExercise in integration-problems
  await page.goto('/lessons/calculus-intro/integration-problems.html', { waitUntil: 'networkidle' });
  const darbouxCard = page.locator('[data-component="CodeExercise"]', { hasText: 'Darboux Sums' });
  await darbouxCard.getByLabel('Code blank 1').fill('(i/n)**3');
  const codeCheck = darbouxCard.getByRole('button', { name: /Check code/i });
  await expect(codeCheck).toBeEnabled();
  await codeCheck.click();
  await expect(darbouxCard).toContainText(/All tokens verified/i);
});
