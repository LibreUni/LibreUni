#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import Color from 'colorjs.io';

const ROOT = process.cwd();
const GLOBAL_CSS_PATH = path.join(ROOT, 'src/styles/global.css');

function parseCssThemes(css) {
  const blocks = [
    { name: 'default:light', selector: ':root', regex: /:root\s*\{([^}]+)\}/ },
    { name: 'scholar:light', selector: "html[data-theme='scholar']", regex: /html\[data-theme='scholar'\]\s*\{([^}]+)\}/ },
    { name: 'monochrome:light', selector: "html[data-theme='monochrome']", regex: /html\[data-theme='monochrome'\]\s*\{([^}]+)\}/ },
    { name: 'scholar:dark', selector: "html.dark[data-theme='scholar']", regex: /html\.dark\[data-theme='scholar'\]\s*\{([^}]+)\}/ },
    { name: 'monochrome:dark', selector: "html.dark[data-theme='monochrome']", regex: /html\.dark\[data-theme='monochrome'\]\s*\{([^}]+)\}/ },
  ];

  const themes = [];
  for (const block of blocks) {
    const match = css.match(block.regex);
    if (!match) continue;
    const props = {};
    const lines = match[1].split(';');
    for (const line of lines) {
      const [key, val] = line.split(':').map((s) => s.trim());
      if (key && val && key.startsWith('--')) {
        props[key] = val;
      }
    }
    themes.push({ name: block.name, props });
  }
  return themes;
}

function parseRgbProp(val) {
  if (!val) return null;
  const parts = val.split(/\s+/).map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  return new Color('srgb', [parts[0] / 255, parts[1] / 255, parts[2] / 255]);
}

function runAudit() {
  const css = fs.readFileSync(GLOBAL_CSS_PATH, 'utf-8');
  const themes = parseCssThemes(css);
  const errors = [];

  for (const theme of themes) {
    const { name, props } = theme;

    // Check primary contrast
    const primaryRgb = parseRgbProp(props['--primary-rgb']);
    const primaryFgRgb = parseRgbProp(props['--primary-foreground-rgb']);
    if (primaryRgb && primaryFgRgb) {
      const contrast = primaryRgb.contrast(primaryFgRgb, 'WCAG21');
      if (contrast < 4.5) {
        errors.push(`${name}: Primary contrast ratio (${contrast.toFixed(2)}:1) between --primary-rgb and --primary-foreground-rgb is below 4.5:1`);
      }
    }

    // Check light theme text contrast
    if (name.includes('light')) {
      const bg = parseRgbProp(props['--light-bg-rgb']);
      const text = parseRgbProp(props['--light-text-rgb']);
      if (bg && text) {
        const contrast = bg.contrast(text, 'WCAG21');
        if (contrast < 4.5) {
          errors.push(`${name}: Body text contrast (${contrast.toFixed(2)}:1) between --light-bg-rgb and --light-text-rgb is below 4.5:1`);
        }
      }
      if (bg && bg.luminance < 0.5) {
        errors.push(`${name}: Light mode background luminance (${bg.luminance.toFixed(3)}) is too dark (< 0.5)`);
      }
    }

    // Check dark theme text contrast
    if (name.includes('dark')) {
      const bg = parseRgbProp(props['--dark-bg-rgb']) || parseRgbProp(props['--light-bg-rgb']);
      const text = parseRgbProp(props['--dark-text-rgb']) || parseRgbProp(props['--light-text-rgb']);
      if (bg && text) {
        const contrast = bg.contrast(text, 'WCAG21');
        if (contrast < 4.5) {
          errors.push(`${name}: Dark body text contrast (${contrast.toFixed(2)}:1) between background and text is below 4.5:1`);
        }
      }
    }
  }

  // Check utility rules for assessment-action
  const assessmentActionMatch = css.match(/@utility assessment-action\s*\{([^}]+)\}/);
  if (assessmentActionMatch) {
    const body = assessmentActionMatch[1];
    if (body.includes('disabled:bg-light-border')) {
      errors.push("Utility @utility assessment-action must not use 'disabled:bg-light-border' because border tokens can resolve to dark colors (e.g. monochrome theme)");
    }
  }

  if (errors.length > 0) {
    console.error(`Theme Token Linter: Found ${errors.length} error(s):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`Theme Token Linter: All theme token contracts passed across ${themes.length} themes.`);
}

runAudit();
