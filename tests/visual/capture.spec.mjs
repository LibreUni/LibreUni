import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve(process.cwd(), 'reports/visual');

const captures = [
  { name: 'home-monochrome-dark', url: '/', theme: 'monochrome', mode: 'dark', viewport: { width: 1440, height: 1000 } },
  { name: 'catalog-monochrome-desktop', url: '/courses.html', theme: 'monochrome', mode: 'light', viewport: { width: 1440, height: 1000 } },
  { name: 'course-overview-monochrome-dark', url: '/courses/database-systems.html', theme: 'monochrome', mode: 'dark', viewport: { width: 1440, height: 1000 } },
  { name: 'career-path-monochrome-light', url: '/careers/systems-foundations.html', theme: 'monochrome', mode: 'light', viewport: { width: 1440, height: 1000 } },
  { name: 'career-path-monochrome-dark-mobile', url: '/careers/systems-foundations.html', theme: 'monochrome', mode: 'dark', viewport: { width: 390, height: 844 } },
  { name: 'development-monochrome-light', url: '/development.html', theme: 'monochrome', mode: 'light', viewport: { width: 1440, height: 1000 } },
  { name: 'about-monochrome-light', url: '/about.html', theme: 'monochrome', mode: 'light', viewport: { width: 1440, height: 1000 } },
  { name: 'about-monochrome-light-mobile', url: '/about.html', theme: 'monochrome', mode: 'light', viewport: { width: 390, height: 844 } },
  { name: 'lesson-monochrome-light-mobile', url: '/lessons/database-systems/relational-model.html', theme: 'monochrome', mode: 'light', viewport: { width: 390, height: 844 } },
  { name: 'theme-menu-monochrome-dark', url: '/', theme: 'monochrome', mode: 'dark', viewport: { width: 1440, height: 1000 }, openThemeMenu: true },
  { name: 'catalog-modern-mobile', url: '/courses.html', theme: 'modern', mode: 'light', viewport: { width: 390, height: 844 } },
  { name: 'catalog-scholar-dark', url: '/courses.html', theme: 'scholar', mode: 'dark', viewport: { width: 1440, height: 1000 } },
  { name: 'course-overview-scholar-dark', url: '/courses/computer-architecture.html', theme: 'scholar', mode: 'dark', viewport: { width: 1440, height: 1000 } },
  { name: 'course-overview-modern-mobile', url: '/courses/operating-systems.html', theme: 'modern', mode: 'light', viewport: { width: 390, height: 844 } },
  { name: 'lesson-monochrome-dark', url: '/lessons/computer-architecture/pipelining.html', theme: 'monochrome', mode: 'dark', viewport: { width: 1440, height: 1000 } },
  { name: 'lesson-modern-mobile', url: '/lessons/operating-systems/cpu-scheduling.html', theme: 'modern', mode: 'dark', viewport: { width: 390, height: 844 } },
  { name: 'db-query-plan-monochrome-light', url: '/lessons/database-systems/query-plans.html', theme: 'monochrome', mode: 'light', viewport: { width: 1200, height: 900 }, target: '.interactive-playground' },
  { name: 'db-isolation-monochrome-dark-mobile', url: '/lessons/database-systems/transactions-and-isolation.html', theme: 'monochrome', mode: 'dark', viewport: { width: 390, height: 844 }, target: '.interactive-playground' },
  { name: 'os-overview-scholar-light', url: '/courses/operating-systems.html', theme: 'scholar', mode: 'light', viewport: { width: 1440, height: 1000 } },
  { name: 'os-overview-modern-dark-mobile', url: '/courses/operating-systems.html', theme: 'modern', mode: 'dark', viewport: { width: 390, height: 844 } },
  { name: 'os-m1-system-call-monochrome-light', url: '/lessons/operating-systems/traps-interrupts-system-calls.html', theme: 'monochrome', mode: 'light', viewport: { width: 1200, height: 900 }, target: '.interactive-playground' },
  { name: 'os-m2-scheduler-monochrome-dark', url: '/lessons/operating-systems/cpu-scheduling.html', theme: 'monochrome', mode: 'dark', viewport: { width: 1200, height: 900 }, target: '.interactive-playground' },
  { name: 'os-m3-waiting-scholar-light', url: '/lessons/operating-systems/condition-variables-and-semaphores.html', theme: 'scholar', mode: 'light', viewport: { width: 1200, height: 900 }, target: '.interactive-playground' },
  { name: 'os-m4-translation-modern-dark', url: '/lessons/operating-systems/page-tables-and-tlbs.html', theme: 'modern', mode: 'dark', viewport: { width: 1200, height: 900 }, target: '.interactive-playground' },
  { name: 'os-m5-io-monochrome-light', url: '/lessons/operating-systems/device-io-interrupts-dma.html', theme: 'monochrome', mode: 'light', viewport: { width: 1200, height: 900 }, target: '.interactive-playground' },
  { name: 'os-m6-recovery-monochrome-dark', url: '/lessons/operating-systems/crash-consistency-and-journaling.html', theme: 'monochrome', mode: 'dark', viewport: { width: 1200, height: 900 }, target: '.interactive-playground' },
  { name: 'os-m7-scalability-modern-light-mobile', url: '/lessons/operating-systems/multicore-scalability-observability.html', theme: 'modern', mode: 'light', viewport: { width: 390, height: 844 }, target: '.interactive-playground' },
  { name: 'arch-m1-representation-monochrome-light-mobile', url: '/lessons/computer-architecture/digital-representation.html', theme: 'monochrome', mode: 'light', viewport: { width: 390, height: 844 }, target: '.interactive-playground' },
  { name: 'arch-m2-pipeline-monochrome-light', url: '/lessons/computer-architecture/hazards-and-branches.html', theme: 'monochrome', mode: 'light', viewport: { width: 1200, height: 900 }, target: '.interactive-playground' },
  { name: 'arch-m3-memory-modern-dark-mobile', url: '/lessons/computer-architecture/cache-hierarchies.html', theme: 'modern', mode: 'dark', viewport: { width: 390, height: 844 }, target: '.interactive-playground' },
  { name: 'arch-m4-amdahl-monochrome-light', url: '/lessons/computer-architecture/performance-models.html', theme: 'monochrome', mode: 'light', viewport: { width: 1200, height: 900 }, target: '.interactive-playground' },
  { name: 'arch-m5-assessment-monochrome-dark-mobile', url: '/lessons/computer-architecture/architecture-assessment.html', theme: 'monochrome', mode: 'dark', viewport: { width: 390, height: 844 } },
  { name: 'db-m1-algebra-scholar-light', url: '/lessons/database-systems/relational-algebra.html', theme: 'scholar', mode: 'light', viewport: { width: 1200, height: 900 }, target: '.interactive-playground' },
  { name: 'db-m2-fd-monochrome-dark-mobile', url: '/lessons/database-systems/functional-dependencies.html', theme: 'monochrome', mode: 'dark', viewport: { width: 390, height: 844 }, target: '.interactive-playground' },
  { name: 'db-m4-recovery-modern-light', url: '/lessons/database-systems/recovery-and-logging.html', theme: 'modern', mode: 'light', viewport: { width: 1200, height: 900 }, target: '.interactive-playground' },
  { name: 'db-m5-quorum-monochrome-dark-mobile', url: '/lessons/database-systems/distributed-data.html', theme: 'monochrome', mode: 'dark', viewport: { width: 390, height: 844 }, target: '.interactive-playground' },
];

test('capture representative visual states', async ({ context }) => {
  test.setTimeout(240_000);
  await fs.mkdir(outputDir, { recursive: true });

  for (const capture of captures) {
    const page = await context.newPage();
    await page.setViewportSize(capture.viewport);
    await page.addInitScript(({ theme, mode }) => {
      localStorage.setItem('theme', theme);
      localStorage.setItem('color-mode', mode);
    }, { theme: capture.theme, mode: capture.mode });
    await page.goto(`http://127.0.0.1:4321${capture.url}`, { waitUntil: 'networkidle' });
    if (capture.openThemeMenu) await page.getByRole('button', { name: /choose theme and appearance/i }).click();
    if (capture.target) {
      await page.locator(capture.target).first().screenshot({ path: path.join(outputDir, `${capture.name}.png`) });
    } else {
      await page.screenshot({ path: path.join(outputDir, `${capture.name}.png`), fullPage: true });
    }
    await page.close();
  }
});
