import { expect, test } from '@playwright/test';

test('lesson disclosures use unified .lu-disclosure chevrons, vertical content flow, and zero global reveal anti-features', async ({ page }) => {
  await page.goto('/lessons/database-systems/recovery-and-logging.html', { waitUntil: 'networkidle' });

  // Hallucinated global exam-review button must not exist anywhere on the page
  await expect(page.locator('#toggle-solutions-btn')).toHaveCount(0);

  // Raw un-migrated <details> in prose must not exist
  const rawDetails = page.locator(
    '#lesson-container article.prose details:not(.diagram-source):not(.exercise-hint):not(.exercise-solution):not(.math-proof)'
  );
  await expect(rawDetails).toHaveCount(0);

  // Verify exercise solution and hint disclosures have proper flex layout, chevron, and vertical flow
  const exerciseDisclosures = page.locator(
    '#lesson-container article.prose details.exercise-solution, #lesson-container article.prose details.exercise-hint'
  );
  await expect(exerciseDisclosures).not.toHaveCount(0);

  const exerciseResult = await exerciseDisclosures.evaluateAll((elements) => elements.map((details) => {
    details.open = true;
    const summary = details.querySelector(':scope > summary');
    const chevron = summary?.querySelector('.lu-chevron');
    const content = [...details.children].find((child) => child !== summary);
    const summaryStyle = getComputedStyle(summary);
    const summaryBox = summary.getBoundingClientRect();
    const contentBox = content?.getBoundingClientRect();

    return {
      display: summaryStyle.display,
      listStyle: summaryStyle.listStyleType,
      hasChevron: Boolean(chevron),
      contentBelowSummary: !contentBox || contentBox.top >= summaryBox.bottom - 1,
    };
  }));

  for (const disclosure of exerciseResult) {
    expect(disclosure.display).toBe('flex');
    expect(disclosure.listStyle).toBe('none');
    expect(disclosure.hasChevron).toBe(true);
    expect(disclosure.contentBelowSummary).toBe(true);
  }
});
