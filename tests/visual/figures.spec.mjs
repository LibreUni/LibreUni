import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve(process.cwd(), 'reports/visual');
const contactSheetPath = path.resolve(process.cwd(), 'reports/figures/index.html');

test('capture figure contact sheet and individual figures', async ({ page }) => {
  test.setTimeout(120_000);
  await fs.mkdir(outputDir, { recursive: true });

  try {
    await fs.access(contactSheetPath);
  } catch {
    // If contact sheet doesn't exist yet, skip
    return;
  }

  // 1. Desktop capture (1440px)
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`file://${contactSheetPath}`, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(outputDir, 'figures-contact-desktop.png'), fullPage: true });

  // 2. Mobile width capture (360px)
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: path.join(outputDir, 'figures-contact-mobile.png'), fullPage: true });

  // 3. Capture individual figure cards and assert no overlapping text elements
  const cards = await page.locator('.figure-card').all();
  for (const card of cards) {
    const id = await card.getAttribute('id');
    if (id) {
      await card.screenshot({ path: path.join(outputDir, `fig-${id}.png`) });
    }

    const overlaps = await card.evaluate((cardEl) => {
      const svgs = cardEl.querySelectorAll('svg');
      const collisions = [];
      svgs.forEach((svg) => {
        const textNodes = Array.from(svg.querySelectorAll('text'));
        const boxes = textNodes.map((t) => {
          const rect = t.getBoundingClientRect();
          return {
            text: t.textContent.trim(),
            minX: rect.left,
            maxX: rect.right,
            minY: rect.top,
            maxY: rect.bottom,
          };
        });
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i];
            const b = boxes[j];
            const xOverlap = a.minX < b.maxX && a.maxX > b.minX;
            const yOverlap = a.minY < b.maxY && a.maxY > b.minY;
            if (xOverlap && yOverlap) {
              collisions.push(`"${a.text}" overlaps with "${b.text}"`);
            }
          }
        }
      });
      return collisions;
    });

    expect(overlaps, `Figure ${id} has overlapping text in browser: ${overlaps.join(', ')}`).toEqual([]);
  }
});
