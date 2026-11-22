import { expect, test } from '@playwright/test';

const PAGES = [
  {
    name: 'OS: Traps and System Calls (xv6)',
    url: '/lessons/operating-systems/traps-interrupts-system-calls.html',
  },
  {
    name: 'OS: Condition Variables',
    url: '/lessons/operating-systems/condition-variables-and-semaphores.html',
  },
  {
    name: 'OS: Crash Consistency',
    url: '/lessons/operating-systems/crash-consistency-and-journaling.html',
  },
  {
    name: 'OS: CPU Scheduling',
    url: '/lessons/operating-systems/cpu-scheduling.html',
  },
  {
    name: 'OS: Disk Scheduling',
    url: '/lessons/operating-systems/storage-devices-and-io-scheduling.html',
  },
  {
    name: 'OS: Isolation Boundary',
    url: '/lessons/operating-systems/containers-and-resource-control.html',
  },
  {
    name: 'Database: Recovery and Logging',
    url: '/lessons/database-systems/recovery-and-logging.html',
  },
  {
    name: 'Database: Transactions and Isolation',
    url: '/lessons/database-systems/transactions-and-isolation.html',
  },
  {
    name: 'Database: Distributed Data (Replication Quorum)',
    url: '/lessons/database-systems/distributed-data.html',
  },
  {
    name: 'Architecture: Cache Hierarchies',
    url: '/lessons/computer-architecture/cache-hierarchies.html',
  },
  {
    name: 'Architecture: Digital Representation',
    url: '/lessons/computer-architecture/digital-representation.html',
  },
  {
    name: 'Calculus: Limits (Epsilon-Delta)',
    url: '/lessons/calculus-intro/limits.html',
  },
];

test.describe('Interactive Exercise UX: Stepped Sliders and Layout Stability', () => {
  for (const pageInfo of PAGES) {
    test(`${pageInfo.name}: stepped sliders must have obvious visual stage indicators`, async ({ page }) => {
      await page.goto(pageInfo.url, { waitUntil: 'networkidle' });

      const sliders = page.locator('.interactive-playground input[type="range"]');
      const count = await sliders.count();

      for (let i = 0; i < count; i++) {
        const slider = sliders.nth(i);
        const min = Number(await slider.getAttribute('min') ?? '0');
        const max = Number(await slider.getAttribute('max') ?? '100');
        const step = Number(await slider.getAttribute('step') ?? '1');
        const label = (await slider.getAttribute('aria-label')) || `slider ${i}`;

        const totalSteps = Math.round((max - min) / step);

        // Sliders with <= 20 discrete steps/stages should make their stages obvious
        if (totalSteps <= 20 && totalSteps >= 1) {
          const listId = await slider.getAttribute('list');
          const hasDatalist = Boolean(listId && (await page.locator(`datalist#${listId}`).count()) > 0);

          // Check if parent or container has tick marks / stage markers or if datalist exists
          const hasVisibleTicks = await slider.evaluate((el) => {
            const parent = el.closest('label') || el.parentElement;
            const container = el.closest('.interactive-playground-controls') || parent;
            const hasTicksEl = container?.querySelector('.slider-ticks, .slider-stages, [data-slider-ticks]') !== null;
            const hasDatalistEl = Boolean(el.list && el.list.options && el.list.options.length > 0);
            return hasTicksEl || hasDatalistEl;
          });

          expect(
            hasDatalist || hasVisibleTicks,
            `Slider "${label}" has ${totalSteps} stages (min=${min}, max=${max}) but lacks visual stage indicators or ticks. It should not look continuous.`,
          ).toBe(true);
        }
      }
    });

    test(`${pageInfo.name}: sliding through steps must not cause sudden layout jumps in exercise UI`, async ({ page }) => {
      await page.goto(pageInfo.url, { waitUntil: 'networkidle' });

      const playgrounds = page.locator('figure.interactive-playground');
      const pgCount = await playgrounds.count();

      for (let p = 0; p < pgCount; p++) {
        const playground = playgrounds.nth(p);
        const sliders = playground.locator('input[type="range"]');
        const sliderCount = await sliders.count();
        if (sliderCount === 0) continue;

        for (let s = 0; s < sliderCount; s++) {
          const slider = sliders.nth(s);
          const min = Number(await slider.getAttribute('min') ?? '0');
          const max = Number(await slider.getAttribute('max') ?? '100');
          const step = Number(await slider.getAttribute('step') ?? '1');
          const label = (await slider.getAttribute('aria-label')) || `slider ${s}`;

          const totalSteps = Math.round((max - min) / step);
          if (totalSteps > 30) continue; // Skip very fine-grained continuous sliders for step scrubbing

          const heights = [];
          const sectionHeights = [];

          for (let val = min; val <= max; val += step) {
            await slider.fill(String(val));
            await slider.dispatchEvent('input');
            await slider.dispatchEvent('change');
            await page.waitForTimeout(40);

            const box = await playground.boundingBox();
            if (box) heights.push(box.height);

            // Also check inner sections (like transition/invariant cards or details)
            const innerSectionHeights = await playground.evaluate((pg) => {
              const sections = Array.from(pg.querySelectorAll('section, [class*="rounded-xl border"]'));
              return sections.map((sec) => sec.getBoundingClientRect().height);
            });
            sectionHeights.push(innerSectionHeights);
          }

          if (heights.length > 1) {
            const minH = Math.min(...heights);
            const maxH = Math.max(...heights);
            const heightDiff = maxH - minH;

            // Sudden jump: if height changes by more than 16px between steps or overall,
            // the exercise UI and everything below it jumps up and down.
            expect(
              heightDiff,
              `Playground with slider "${label}" jumps by ${heightDiff.toFixed(1)}px (min ${minH.toFixed(1)}px, max ${maxH.toFixed(1)}px) while scrubbing stages. The layout should be stable.`,
            ).toBeLessThanOrEqual(16);
          }

          // Check inner sections: no section should shrink by > 40% (let alone 80%!)
          if (sectionHeights.length > 1) {
            const numSections = Math.min(...sectionHeights.map((arr) => arr.length));
            for (let secIdx = 0; secIdx < numSections; secIdx++) {
              const vals = sectionHeights.map((arr) => arr[secIdx]).filter((h) => h > 0);
              if (vals.length > 1) {
                const minSecH = Math.min(...vals);
                const maxSecH = Math.max(...vals);
                const shrinkRatio = (maxSecH - minSecH) / maxSecH;

                expect(
                  shrinkRatio,
                  `Section ${secIdx} inside playground "${label}" shrinks by ${(shrinkRatio * 100).toFixed(1)}% (from ${maxSecH.toFixed(1)}px to ${minSecH.toFixed(1)}px), causing UI jumps.`,
                ).toBeLessThan(0.4);
              }
            }
          }
        }
      }
    });
  }

  test('Quiz: multi-claim classification matrix evaluates inline without container collapse', async ({ page }) => {
    await page.goto('/lessons/database-systems/normalization.html', { waitUntil: 'networkidle' });

    const quiz = page.locator('section.quiz-container').first();
    await expect(quiz).toBeVisible();

    const initialBox = await quiz.boundingBox();
    expect(initialBox).not.toBeNull();

    // Evaluate options using the upfront Correct/Incorrect controls
    const claimGroups = quiz.locator('[role="group"]');
    const count = await claimGroups.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await claimGroups.nth(0).getByRole('button', { name: 'Correct', exact: true }).click();
    for (let i = 1; i < count; i++) {
      await claimGroups.nth(i).getByRole('button', { name: 'Incorrect', exact: true }).click();
    }

    const verifyButton = quiz.locator('button:has-text("Verify answers")');
    await verifyButton.click();
    await page.waitForTimeout(50);

    const evaluateBox = await quiz.boundingBox();
    expect(evaluateBox).not.toBeNull();

    // Verify container expanded or maintained height and did not shrink drastically (> 20%)
    const heightDrop = (initialBox.height - evaluateBox.height) / initialBox.height;
    expect(
      heightDrop,
      `Quiz container shrank drastically by ${(heightDrop * 100).toFixed(1)}% on verification, causing page jump.`,
    ).toBeLessThan(0.2);
  });

  test('CaseStudy: selecting a decision option and evaluating trade-offs remains layout-stable', async ({ page }) => {
    await page.goto('/lessons/computer-architecture/digital-representation.html', { waitUntil: 'networkidle' });

    const caseStudy = page.locator('section.case-study-container').first();
    await expect(caseStudy).toBeVisible();

    const initialBox = await caseStudy.boundingBox();
    expect(initialBox).not.toBeNull();

    await caseStudy.locator('[role="radio"]').first().click();

    const evaluateBtn = caseStudy.locator('button:has-text("Evaluate engineering trade-offs")');
    await evaluateBtn.click();
    await page.waitForTimeout(50);

    const revealedBox = await caseStudy.boundingBox();
    expect(revealedBox).not.toBeNull();
    expect(revealedBox.height).toBeGreaterThanOrEqual(initialBox.height * 0.9);

    const reviseBtn = caseStudy.locator('button:has-text("Reset")');
    await reviseBtn.click();
    await page.waitForTimeout(50);

    const revisedBox = await caseStudy.boundingBox();
    expect(revisedBox).not.toBeNull();
    expect(Math.abs(revisedBox.height - initialBox.height)).toBeLessThanOrEqual(24);
  });
});

