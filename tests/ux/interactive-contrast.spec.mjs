import { expect, test } from '@playwright/test';
import Color from 'colorjs.io';

const THEMES = ['modern', 'scholar', 'monochrome'];
const MODES = ['light', 'dark'];

const INIT_SCRIPT = `
  function getEffectiveBackground(element) {
    const layers = [];
    let current = element;
    while (current && current !== document.documentElement) {
      const s = window.getComputedStyle(current);
      const bg = s.backgroundColor;
      if (bg && bg !== 'transparent' && !/^rgba?\\(0,\\s*0,\\s*0,\\s*0\\)$/i.test(bg)) {
        layers.push(bg);
      }
      current = current.parentElement;
    }
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    layers.push(bodyBg && bodyBg !== 'transparent' ? bodyBg : (document.documentElement.classList.contains('dark') ? 'rgb(17, 24, 39)' : 'rgb(255, 255, 255)'));
    layers.reverse();
    return layers;
  }

  window.__inspectElementColors = function(element) {
    const s = window.getComputedStyle(element);
    return {
      text: element.innerText?.trim() || element.getAttribute('aria-label') || '',
      color: s.color,
      bgColor: s.backgroundColor,
      bgLayers: getEffectiveBackground(element),
      disabled: element.disabled || element.getAttribute('aria-disabled') === 'true',
      opacity: s.opacity,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight
    };
  };
`;

function compositeLayers(layers) {
  if (!layers || layers.length === 0) return new Color('white');

  let current = null;
  for (const layerStr of layers) {
    try {
      const rawColor = new Color(layerStr);
      // Ensure we are working in sRGB coordinate space for proper alpha compositing
      const layerColor = rawColor.to('srgb');
      if (!current) {
        current = layerColor;
      } else {
        const alpha = layerColor.alpha ?? 1;
        if (alpha >= 0.999) {
          current = layerColor;
        } else {
          const r = layerColor.coords[0] * alpha + current.coords[0] * (1 - alpha);
          const g = layerColor.coords[1] * alpha + current.coords[1] * (1 - alpha);
          const b = layerColor.coords[2] * alpha + current.coords[2] * (1 - alpha);
          current = new Color('srgb', [r, g, b]);
        }
      }
    } catch (e) {
      // Ignore unparseable colors
    }
  }
  return current ? current.to('srgb') : new Color('white');
}

function calculateContrast(textColorStr, bgLayers) {
  const bg = compositeLayers(bgLayers);
  const text = new Color(textColorStr).to('srgb');
  const contrast = bg.contrast(text, 'WCAG21');
  return {
    contrast,
    bgHex: bg.toString({ format: 'hex' }),
    textHex: text.toString({ format: 'hex' }),
    bgLuminance: bg.luminance,
  };
}

async function applyThemeAndMode(page, theme, mode) {
  await page.evaluate(({ theme, mode }) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.colorMode = mode;
    localStorage.setItem('theme', theme);
    localStorage.setItem('color-mode', mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, { theme, mode });
  await page.waitForTimeout(60);
}

test.describe('Theme & Interactive States Contrast Matrix', () => {
  for (const theme of THEMES) {
    for (const mode of MODES) {
      const themeLabel = `${theme} [${mode}]`;

      test(`Quiz interactive state lifecycle contrast: ${themeLabel}`, async ({ browser }) => {
        const context = await browser.newContext({ colorScheme: mode });
        const page = await context.newPage();
        try {
          await page.addInitScript({ content: INIT_SCRIPT });
          await page.goto('/lessons/calculus-intro/limits.html', { waitUntil: 'domcontentloaded' });
          await applyThemeAndMode(page, theme, mode);

          const quiz = page.locator('[data-component="Quiz"]').first();
          await expect(quiz).toBeVisible();

          const verifyBtn = quiz.locator('button:has-text("Verify answers")');
          await expect(verifyBtn).toBeVisible();

          // 1. Initial State: Verify answers MUST be disabled with visible, legible contrast (>= 3.0:1)
          await expect(verifyBtn).toBeDisabled();
          const disabledDetails = await verifyBtn.evaluate((el) => window.__inspectElementColors(el));
          const disabledContrast = calculateContrast(disabledDetails.color, disabledDetails.bgLayers);

          expect(
            disabledContrast.contrast,
            `Disabled 'Verify answers' button in ${themeLabel} has illegible contrast ${disabledContrast.contrast.toFixed(2)}:1 (< 3.0:1). Text: ${disabledContrast.textHex}, Bg: ${disabledContrast.bgHex}`,
          ).toBeGreaterThanOrEqual(3.0);

          if (mode === 'light') {
            expect(
              disabledContrast.bgLuminance,
              `Disabled 'Verify answers' in ${themeLabel} has dark background (luminance ${disabledContrast.bgLuminance.toFixed(3)}) on light page! Bg: ${disabledContrast.bgHex}`,
            ).toBeGreaterThan(0.35);
          }

          // Check candidate choice buttons
          const candidateCorrect = quiz.locator('button:has-text("Correct")').first();
          const candDetails = await candidateCorrect.evaluate((el) => window.__inspectElementColors(el));
          const candContrast = calculateContrast(candDetails.color, candDetails.bgLayers);
          expect(
            candContrast.contrast,
            `Candidate 'Correct' button in ${themeLabel} has contrast ${candContrast.contrast.toFixed(2)}:1 (< 3.5:1). Text: ${candContrast.textHex}, Bg: ${candContrast.bgHex}`,
          ).toBeGreaterThanOrEqual(3.5);

          // 2. Selection State: Select an option and check enabled Verify answers button (>= 4.5:1)
          await candidateCorrect.click();
          await page.waitForTimeout(100);

          await expect(verifyBtn).toBeEnabled();
          const enabledDetails = await verifyBtn.evaluate((el) => window.__inspectElementColors(el));
          const enabledContrast = calculateContrast(enabledDetails.color, enabledDetails.bgLayers);

          expect(
            enabledContrast.contrast,
            `Enabled 'Verify answers' button in ${themeLabel} has contrast ${enabledContrast.contrast.toFixed(2)}:1 (< 4.5:1). Text: ${enabledContrast.textHex}, Bg: ${enabledContrast.bgHex}`,
          ).toBeGreaterThanOrEqual(4.5);

          // Reset button contrast
          const resetBtn = quiz.locator('button:has-text("Reset")');
          if (await resetBtn.isVisible()) {
            const resetDetails = await resetBtn.evaluate((el) => window.__inspectElementColors(el));
            const resetContrast = calculateContrast(resetDetails.color, resetDetails.bgLayers);
            expect(
              resetContrast.contrast,
              `Quiz 'Reset' button in ${themeLabel} has contrast ${resetContrast.contrast.toFixed(2)}:1 (< 3.5:1). Text: ${resetContrast.textHex}, Bg: ${resetContrast.bgHex}`,
            ).toBeGreaterThanOrEqual(3.5);
          }

          // 3. Submitted State: Submit and check feedback banner contrast
          await verifyBtn.click();
          await page.waitForTimeout(100);

          const feedback = quiz.locator('.feedback-success, .feedback-diagnostic').first();
          await expect(feedback).toBeVisible();

          const feedbackText = feedback.locator('p, div, span').first();
          if (await feedbackText.isVisible()) {
            const fbDetails = await feedbackText.evaluate((el) => window.__inspectElementColors(el));
            const fbContrast = calculateContrast(fbDetails.color, fbDetails.bgLayers);
            expect(
              fbContrast.contrast,
              `Quiz feedback banner in ${themeLabel} has contrast ${fbContrast.contrast.toFixed(2)}:1 (< 4.5:1). Text: ${fbContrast.textHex}, Bg: ${fbContrast.bgHex}`,
            ).toBeGreaterThanOrEqual(4.5);
          }
        } finally {
          await context.close();
        }
      });

      test(`CaseStudy interactive state lifecycle contrast: ${themeLabel}`, async ({ browser }) => {
        const context = await browser.newContext({ colorScheme: mode });
        const page = await context.newPage();
        try {
          await page.addInitScript({ content: INIT_SCRIPT });
          await page.goto('/lessons/computer-architecture/hazards-and-branches.html', { waitUntil: 'domcontentloaded' });
          await applyThemeAndMode(page, theme, mode);

          const caseStudy = page.locator('[data-component="CaseStudy"]').first();
          await expect(caseStudy).toBeVisible();

          const evaluateBtn = caseStudy.locator('button:has-text("Evaluate engineering trade-offs")');
          await expect(evaluateBtn).toBeVisible();

          // 1. Initial State: Evaluate button is disabled
          await expect(evaluateBtn).toBeDisabled();
          const disabledDetails = await evaluateBtn.evaluate((el) => window.__inspectElementColors(el));
          const disabledContrast = calculateContrast(disabledDetails.color, disabledDetails.bgLayers);

          expect(
            disabledContrast.contrast,
            `Disabled 'Evaluate' button in ${themeLabel} has contrast ${disabledContrast.contrast.toFixed(2)}:1 (< 3.0:1). Text: ${disabledContrast.textHex}, Bg: ${disabledContrast.bgHex}`,
          ).toBeGreaterThanOrEqual(3.0);

          if (mode === 'light') {
            expect(
              disabledContrast.bgLuminance,
              `Disabled 'Evaluate' in ${themeLabel} has dark background (luminance ${disabledContrast.bgLuminance.toFixed(3)}) on light page! Bg: ${disabledContrast.bgHex}`,
            ).toBeGreaterThan(0.35);
          }

          // 2. Select option: Evaluate button becomes enabled
          const firstRadio = caseStudy.locator('[role="radio"]').first();
          await firstRadio.click();
          await page.waitForTimeout(100);

          await expect(evaluateBtn).toBeEnabled();
          const enabledDetails = await evaluateBtn.evaluate((el) => window.__inspectElementColors(el));
          const enabledContrast = calculateContrast(enabledDetails.color, enabledDetails.bgLayers);

          expect(
            enabledContrast.contrast,
            `Enabled 'Evaluate' button in ${themeLabel} has contrast ${enabledContrast.contrast.toFixed(2)}:1 (< 4.5:1). Text: ${enabledContrast.textHex}, Bg: ${enabledContrast.bgHex}`,
          ).toBeGreaterThanOrEqual(4.5);
        } finally {
          await context.close();
        }
      });

      test(`CodeExercise disabled and active action buttons: ${themeLabel}`, async ({ browser }) => {
        const context = await browser.newContext({ colorScheme: mode });
        const page = await context.newPage();
        try {
          await page.addInitScript({ content: INIT_SCRIPT });
          await page.goto('/lessons/operating-systems/scheduler-lab.html', { waitUntil: 'domcontentloaded' });
          await applyThemeAndMode(page, theme, mode);

          const checkBtn = page.locator('button:has-text("Check implementation"), button:has-text("Check code")').first();
          if (await checkBtn.isVisible()) {
            await expect(checkBtn).toBeDisabled();
            const disabledDetails = await checkBtn.evaluate((el) => window.__inspectElementColors(el));
            const disabledContrast = calculateContrast(disabledDetails.color, disabledDetails.bgLayers);

            expect(
              disabledContrast.contrast,
              `Disabled 'Check implementation' in ${themeLabel} has contrast ${disabledContrast.contrast.toFixed(2)}:1 (< 3.0:1). Text: ${disabledContrast.textHex}, Bg: ${disabledContrast.bgHex}`,
            ).toBeGreaterThanOrEqual(3.0);

            if (mode === 'light') {
              expect(
                disabledContrast.bgLuminance,
                `Disabled 'Check implementation' in ${themeLabel} has dark background (luminance ${disabledContrast.bgLuminance.toFixed(3)}) on light page! Bg: ${disabledContrast.bgHex}`,
              ).toBeGreaterThan(0.35);
            }
          }
        } finally {
          await context.close();
        }
      });

      test(`LearningPathEvidence action button: ${themeLabel}`, async ({ browser }) => {
        const context = await browser.newContext({ colorScheme: mode });
        const page = await context.newPage();
        try {
          await page.addInitScript({ content: INIT_SCRIPT });
          await page.goto('/careers/systems-foundations.html', { waitUntil: 'domcontentloaded' });
          await applyThemeAndMode(page, theme, mode);

          const dlBtn = page.locator('button:has-text("Download evidence record")');
          if (await dlBtn.isVisible()) {
            const details = await dlBtn.evaluate((el) => window.__inspectElementColors(el));
            const contrast = calculateContrast(details.color, details.bgLayers);

            expect(
              contrast.contrast,
              `'Download evidence record' in ${themeLabel} has contrast ${contrast.contrast.toFixed(2)}:1 (< 4.5:1). Text: ${contrast.textHex}, Bg: ${contrast.bgHex}`,
            ).toBeGreaterThanOrEqual(4.5);
          }
        } finally {
          await context.close();
        }
      });
    }
  }
});
