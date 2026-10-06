import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const A11Y_ROUTES = [
  { name: 'main home', url: 'http://127.0.0.1:4321/' },
  { name: 'architecture hazard model', url: 'http://127.0.0.1:4321/lessons/computer-architecture/hazards-and-branches.html' },
  { name: 'database query model', url: 'http://127.0.0.1:4321/lessons/database-systems/query-plans.html' },
  { name: 'OS scheduler model', url: 'http://127.0.0.1:4321/lessons/operating-systems/cpu-scheduling.html' },
  { name: 'learning path', url: 'http://127.0.0.1:4321/careers/systems-foundations.html' },
  { name: 'main About page', url: 'http://127.0.0.1:4321/about.html' },
];

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING_IMPACTS = new Set(['critical', 'serious']);

function formatViolations(violations) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.slice(0, 5).map((node) => ({
      target: node.target,
      summary: node.failureSummary,
    })),
  }));
}

test.describe('automated accessibility checks', () => {
  for (const route of A11Y_ROUTES) {
    test(`${route.name} has no serious axe violations`, async ({ page }, testInfo) => {
      const response = await page.goto(route.url, { waitUntil: 'domcontentloaded' });
      expect(response?.ok(), 'An accessible 404 page is not evidence about the requested route').toBe(true);
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

      const scan = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      const blockingViolations = scan.violations.filter((violation) => BLOCKING_IMPACTS.has(violation.impact));

      await testInfo.attach(`${route.name} axe results`, {
        body: JSON.stringify(formatViolations(scan.violations), null, 2),
        contentType: 'application/json',
      });

      expect(formatViolations(blockingViolations)).toEqual([]);
    });
  }
});
