import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function findHtmlPages(dir) {
  const pages = [];
  function walk(current) {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.html')) {
        pages.push(full);
      }
    }
  }
  walk(dir);
  return pages;
}

const allDistPages = findHtmlPages('dist');

// Dynamically discover all pages globally that contain <fieldset or CodeExercise
const fieldsetPages = allDistPages.filter((p) => {
  const content = fs.readFileSync(p, 'utf8');
  return content.includes('<fieldset');
});

const codeExercisePages = allDistPages.filter((p) => {
  const content = fs.readFileSync(p, 'utf8');
  return content.includes('code-exercise-shell') || content.includes('data-component="CodeExercise"');
});

test.describe('Global Layout Integrity: Fieldset Legends and Controls', () => {
  test('discovers fieldset pages globally across the build', () => {
    expect(
      fieldsetPages.length,
      'Build must contain pages with <fieldset> to test fieldset layout globally',
    ).toBeGreaterThan(0);
  });

  for (const pagePath of fieldsetPages) {
    const route = '/' + path.relative('dist', pagePath).replace(/\\/g, '/');

    test(`${route}: fieldset legends (and inline code/badges) must not overlap following controls`, async ({
      page,
    }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      const fieldsets = page.locator('fieldset');
      const count = await fieldsets.count();
      expect(count, `Expected at least one fieldset on ${route}`).toBeGreaterThan(0);

      const violations = await fieldsets.evaluateAll((elements) => {
        const issues = [];
        for (const fieldset of elements) {
          const legend = fieldset.querySelector('legend');
          if (!legend) continue;

          // Measure bounding rects of legend and all its descendants (e.g. code, badges, spans)
          const legendRect = legend.getBoundingClientRect();
          let maxLegendBottom = legendRect.bottom;
          const legendElements = [legend, ...legend.querySelectorAll('*')];
          for (const el of legendElements) {
            const r = el.getBoundingClientRect();
            if (r.height > 0 && r.width > 0 && r.bottom > maxLegendBottom) {
              maxLegendBottom = r.bottom;
            }
          }

          // Check visible controls inside the fieldset following the legend
          const controls = fieldset.querySelectorAll(
            'button, input, select, textarea, label, [role="button"], [role="radio"]',
          );
          for (const control of controls) {
            if (legend.contains(control)) continue;
            const style = window.getComputedStyle(control);
            if (style.display === 'none' || style.visibility === 'hidden') continue;

            const cRect = control.getBoundingClientRect();
            if (cRect.width === 0 || cRect.height === 0) continue;

            // Check if control is positioned under or alongside the legend with vertical collision
            const xOverlap =
              Math.max(0, Math.min(legendRect.right, cRect.right) - Math.max(legendRect.left, cRect.left));
            if (xOverlap > 0 || cRect.top <= maxLegendBottom) {
              const overlapY = maxLegendBottom - cRect.top;
              if (overlapY > 0.5) {
                issues.push({
                  legendText: legend.textContent?.trim().slice(0, 40),
                  controlText:
                    control.textContent?.trim().slice(0, 40) ||
                    control.getAttribute('aria-label') ||
                    control.tagName,
                  maxLegendBottom: Number(maxLegendBottom.toFixed(2)),
                  controlTop: Number(cRect.top.toFixed(2)),
                  overlapPx: Number(overlapY.toFixed(2)),
                });
              }
            }
          }
        }
        return issues;
      });

      expect(
        violations,
        `Found legend overlapping controls on ${route}: ${JSON.stringify(violations, null, 2)}`,
      ).toEqual([]);
    });
  }
});

test.describe('Global Layout Integrity: CodeExercise Container and Codeframe Styling', () => {
  test('discovers code exercise pages globally across the build', () => {
    expect(
      codeExercisePages.length,
      'Build must contain pages with CodeExercise to test code exercises globally',
    ).toBeGreaterThan(0);
  });

  for (const pagePath of codeExercisePages) {
    const route = '/' + path.relative('dist', pagePath).replace(/\\/g, '/');

    test(`${route}: code exercises must not have nested double borders or mismatched pre border-radius`, async ({
      page,
    }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      const exercises = page.locator('.code-exercise, [data-component="CodeExercise"]');
      const count = await exercises.count();
      expect(count, `Expected at least one CodeExercise on ${route}`).toBeGreaterThan(0);

      const violations = await exercises.evaluateAll((elements) => {
        const issues = [];
        for (const exercise of elements) {
          const shell = exercise.querySelector('.code-exercise-shell');
          const codeframe = exercise.querySelector('pre.code-exercise-codeframe');
          if (!shell || !codeframe) continue;

          const shellStyle = window.getComputedStyle(shell);
          const frameStyle = window.getComputedStyle(codeframe);
          if (shellStyle.display === 'none' || frameStyle.display === 'none') continue;

          const frameBorderWidth = parseFloat(frameStyle.borderTopWidth) || 0;
          const frameBorderRadius = parseFloat(frameStyle.borderTopLeftRadius) || 0;
          const shellBorderWidth = parseFloat(shellStyle.borderTopWidth) || 0;
          const shellBorderRadius = parseFloat(shellStyle.borderTopLeftRadius) || 0;

          // The shell has its own border. The inner pre should NOT have an inner border.
          const hasInnerBorder =
            frameBorderWidth > 0 && frameStyle.borderTopStyle !== 'none' && shellBorderWidth > 0;
          // The inner pre should NOT have large mismatched border-radius (e.g. 24px when shell is 8px)
          const hasMismatchedRadius = frameBorderRadius > shellBorderRadius && frameBorderRadius > 8;

          if (hasInnerBorder || hasMismatchedRadius) {
            issues.push({
              title:
                exercise.querySelector('h3')?.textContent?.trim().slice(0, 40) || 'Code Exercise',
              hasInnerBorder,
              frameBorder: `${frameStyle.borderTopWidth} ${frameStyle.borderTopStyle} ${frameStyle.borderTopColor}`,
              shellBorder: `${shellStyle.borderTopWidth} ${shellStyle.borderTopStyle} ${shellStyle.borderTopColor}`,
              frameBorderRadius: frameStyle.borderTopLeftRadius,
              shellBorderRadius: shellStyle.borderTopLeftRadius,
            });
          }
        }
        return issues;
      });

      expect(
        violations,
        `Found code exercise border/radius glitches on ${route}: ${JSON.stringify(violations, null, 2)}`,
      ).toEqual([]);
    });
  }
});
