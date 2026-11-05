import { expect, test } from '@playwright/test';

const TEST_ROUTES = [
  { name: 'Calculus Limits', url: '/lessons/calculus-intro/limits.html' },
  { name: 'Architecture Hazards', url: '/lessons/computer-architecture/hazards-and-branches.html' },
  { name: 'Database Query Plans', url: '/lessons/database-systems/query-plans.html' },
  { name: 'Database SQL Lab', url: '/lessons/database-systems/sql-lab.html' },
  { name: 'OS CPU Scheduling', url: '/lessons/operating-systems/cpu-scheduling.html' },
  { name: 'OS Scheduler Lab', url: '/lessons/operating-systems/scheduler-lab.html' },
  { name: 'Systems Foundations Career', url: '/careers/systems-foundations.html' },
];

test.describe('Buttons, Cursors, and Theme Color Contrast', () => {
  for (const route of TEST_ROUTES) {
    test(`${route.name}: all enabled buttons and summaries must have cursor: pointer`, async ({ page }) => {
      await page.goto(route.url, { waitUntil: 'networkidle' });

      const nonPointerElements = await page.evaluate(() => {
        const clickable = document.querySelectorAll(
          'button:not(:disabled), [role="button"]:not([aria-disabled="true"]):not(:disabled), [role="radio"]:not([aria-disabled="true"]):not(:disabled), summary, input[type="button"]:not(:disabled), input[type="submit"]:not(:disabled)',
        );
        const bad = [];
        for (const el of clickable) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          if (style.cursor !== 'pointer') {
            bad.push({
              tag: el.tagName,
              text: el.innerText?.trim().slice(0, 30) || el.getAttribute('aria-label') || 'no-label',
              cursor: style.cursor,
              className: el.className.slice(0, 50),
            });
          }
        }
        return bad;
      });

      expect(
        nonPointerElements,
        `Found elements without pointer cursor on ${route.name}: ${JSON.stringify(nonPointerElements)}`,
      ).toEqual([]);
    });
  }

  for (const mode of ['light', 'dark']) {
    test(`Quiz component in ${mode} mode: Correct/Incorrect buttons have pointer cursors and valid contrast`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ colorScheme: mode });
      const page = await context.newPage();
      try {
        await page.goto('/lessons/calculus-intro/limits.html', { waitUntil: 'networkidle' });

        const quiz = page.locator('[data-component="Quiz"]').first();
        await expect(quiz).toBeVisible();

        const correctBtn = quiz.locator('button:has-text("Correct")').first();
        const incorrectBtn = quiz.locator('button:has-text("Incorrect")').first();

        await expect(correctBtn).toBeVisible();
        await expect(incorrectBtn).toBeVisible();

        // Check cursor
        const cCursor = await correctBtn.evaluate((el) => window.getComputedStyle(el).cursor);
        const iCursor = await incorrectBtn.evaluate((el) => window.getComputedStyle(el).cursor);
        expect(cCursor).toBe('pointer');
        expect(iCursor).toBe('pointer');

        // Click Correct and verify active state
        await correctBtn.click();
        await page.waitForTimeout(200);

        expect(await correctBtn.getAttribute('aria-pressed')).toBe('true');

        // Check active style colors
        const activeStyles = await correctBtn.evaluate((el) => {
          const s = window.getComputedStyle(el);
          return { color: s.color, bg: s.backgroundColor };
        });
        expect(activeStyles.color).not.toBe(activeStyles.bg);

        // Verify button is enabled
        const verifyBtn = quiz.locator('button:has-text("Verify answers")');
        await expect(verifyBtn).toBeEnabled();

        // Submit and check feedback
        await verifyBtn.click();
        await page.waitForTimeout(100);

        const feedback = quiz.locator('.feedback-success, .feedback-diagnostic').first();
        await expect(feedback).toBeVisible();
      } finally {
        await context.close();
      }
    });

    test(`CaseStudy component in ${mode} mode: radio buttons have pointer cursors and visible selected state`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ colorScheme: mode });
      const page = await context.newPage();
      try {
        await page.goto('/lessons/computer-architecture/hazards-and-branches.html', {
          waitUntil: 'networkidle',
        });

        const caseStudy = page.locator('[data-component="CaseStudy"]').first();
        await expect(caseStudy).toBeVisible();

        const radios = caseStudy.locator('[role="radio"]');
        const count = await radios.count();
        expect(count).toBeGreaterThanOrEqual(2);

        const firstRadio = radios.first();
        const rCursor = await firstRadio.evaluate((el) => window.getComputedStyle(el).cursor);
        expect(rCursor).toBe('pointer');

        await firstRadio.click();
        await page.waitForTimeout(150);

        expect(await firstRadio.getAttribute('aria-checked')).toBe('true');

        const evaluateBtn = caseStudy.locator('button:has-text("Evaluate engineering trade-offs")');
        await expect(evaluateBtn).toBeEnabled();
      } finally {
        await context.close();
      }
    });
  }
});
