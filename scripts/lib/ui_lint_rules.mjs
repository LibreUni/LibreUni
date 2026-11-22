import fs from 'node:fs';
import path from 'node:path';

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

/**
 * Extract the full opening tag `<tagName ...>` while balancing quotes and `{...}`
 * JSX expressions so `=>` arrows inside attributes do not terminate the tag early.
 */
function findButtonOpeningTags(content) {
  const results = [];
  const startRe = /<button(?=[\s/>])/g;

  for (const m of content.matchAll(startRe)) {
    let i = m.index + '<button'.length;
    let quote = null;
    let braceDepth = 0;

    while (i < content.length) {
      const ch = content[i];
      if (quote) {
        if (ch === '\\' && i + 1 < content.length) {
          i += 2;
          continue;
        }
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch;
      } else if (ch === '{') {
        braceDepth += 1;
      } else if (ch === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
      } else if (ch === '>' && braceDepth === 0) {
        results.push({ index: m.index, attrs: content.slice(m.index + '<button'.length, i) });
        break;
      }
      i += 1;
    }
  }
  return results;
}

function findMissingButtonTypes(relPath, content, errors) {
  for (const { index, attrs } of findButtonOpeningTags(content)) {
    if (!/\btype\s*=/.test(attrs)) {
      const ln = lineNumberAt(content, index);
      errors.push(
        `[UI-LINT-01] ${relPath}:${ln}: <button> element lacks explicit type="button" | "submit" | "reset".`
      );
    }
  }

  // Flag clickable <div id="...-btn" aria-label=...> without button semantics (e.g. devThemer.ts)
  for (const m of content.matchAll(/<div\b([^>]*\bid=["'][^"']*btn[^"']*["'][^>]*)>/gi)) {
    if (!/\brole\s*=/.test(m[1])) {
      const ln = lineNumberAt(content, m.index);
      errors.push(
        `[UI-LINT-01] ${relPath}:${ln}: Clickable <div ...btn...> control lacks <button type="button"> semantics.`
      );
    }
  }
}

/**
 * Read the RHS expression of an assignment starting at `startIndex` up to the
 * next top-level statement-terminating semicolon (respecting nested braces,
 * quotes, and template literals).
 */
function readStatementRhs(content, startIndex) {
  let i = startIndex;
  let quote = null;
  const braceStack = [];

  while (i < content.length) {
    const ch = content[i];
    if (quote) {
      if (ch === '\\' && i + 1 < content.length) {
        i += 2;
        continue;
      }
      if (quote === '`' && ch === '$' && content[i + 1] === '{') {
        braceStack.push('`');
        quote = null;
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
    } else if (ch === '{') {
      braceStack.push('{');
    } else if (ch === '}') {
      const top = braceStack.pop();
      if (top === '`') {
        quote = '`';
      }
    } else if (ch === ';' && braceStack.length === 0) {
      return content.slice(startIndex, i).trim();
    }
    i += 1;
  }
  return content.slice(startIndex).trim();
}

/**
 * Recursively collect every leaf `${...}` expression inside template literals
 * in `exprSource` (handling nested `.map(x => `...${x.y}...`)` cleanly).
 */
function collectAllTemplateInterpolations(source) {
  const leafExprs = [];

  const scanTemplate = (startIdx) => {
    let i = startIdx;
    while (i < source.length) {
      const ch = source[i];
      if (ch === '\\' && i + 1 < source.length) {
        i += 2;
        continue;
      }
      if (ch === '`') {
        return i + 1;
      }
      if (ch === '$' && source[i + 1] === '{') {
        const exprStart = i + 2;
        let depth = 1;
        let j = exprStart;
        while (j < source.length && depth > 0) {
          const c = source[j];
          if (c === "'" || c === '"') {
            j += 1;
            while (j < source.length && source[j] !== c) {
              if (source[j] === '\\') j += 1;
              j += 1;
            }
            j += 1;
            continue;
          }
          if (c === '`') {
            j = scanTemplate(j + 1);
            continue;
          }
          if (c === '{') depth += 1;
          else if (c === '}') depth -= 1;
          j += 1;
        }
        const inner = source.slice(exprStart, j - 1).trim();
        if (!inner.includes('`')) {
          leafExprs.push(inner);
        } else {
          // Non-template parts around nested templates don't get skipped either,
          // because the recursive scanTemplate already recorded inner template expressions.
          // If the expression combines a call with an unescaped value outside nested templates, check safely.
          const stripped = inner.replace(/`(?:\\[\s\S]|[^\\`])*`/g, '');
          if (stripped && !/\.map\(|\.filter\(|\.slice\(|\.join\(|\?|:|\|\|/.test(stripped)) {
            leafExprs.push(inner);
          }
        }
        i = j;
        continue;
      }
      i += 1;
    }
    return i;
  };

  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '`') {
      i = scanTemplate(i + 1) - 1;
    }
  }
  return leafExprs;
}

/**
 * Check `.innerHTML =` assignments for unescaped dynamic template expressions
 * (UI-LINT-02). Strings that appear to be plain object/string fields (e.g.
 * `w.course`, `cat`, `COLORS[i]`, etc.) must be wrapped in `escapeHtml(...)`
 * unless strictly numeric expressions.
 */
function checkInnerHtmlSafety(relPath, content, errors) {
  const assignRe = /\.innerHTML\s*[+]?=\s*/g;
  const isSafeExpr = (expr) => {
    if (/^(?:escapeHtml|escapeXml)\([\s\S]+\)$/.test(expr)) return true;
    if (/^(?:Math\.|Number\(|parseInt\(|parseFloat\()/.test(expr)) return true;
    if (/\.toFixed\(|\.length$|\.toLocaleString\(/.test(expr)) return true;
    // Allow ternaries / literals that resolve exclusively to quoted static strings or hex colors
    if (/^'(?:[^'\\]|\\.)*'$|^"(?:[^"\\]|\\.)*"$/.test(expr)) return true;
    if (/^[A-Za-z_$][\w$.]*\s*\?\s*(?:'[^']*'|`[^`]*`|"[^"]*")\s*:\s*(?:'[^']*'|`[^`]*`|"[^"]*")$/.test(expr)) {
      return true;
    }
    // Allow strictly numeric chart metrics/dims or pure numeric arithmetic
    const numVars =
      /\b(?:W|H|P|L|R|T|B|x|y|i|r|rx|ry|cx|cy|x1|y1|x2|y2|lx|ly|tx|ty|midY|dx|dy|plotW|plotH|barW|barH|pct|val|yv|xv|yTick|step|idx|maxVal|count|width|height|offset|row|col|pad|labelX|labelY|legendX|legendY|top|left|bottom|right|size|total|cum|pt\.x|pt\.y)\b/g;
    if (/^[0-9\s+\-*/%().<>?:=!&|]+$/.test(expr.replace(numVars, '1'))) {
      return true;
    }
    return false;
  };

  for (const m of content.matchAll(assignRe)) {
    const rhs = readStatementRhs(content, m.index + m[0].length);
    const ln = lineNumberAt(content, m.index);
    if (rhs === "''" || rhs === '""' || rhs === "'Copied!'" || rhs === 'originalText') continue;

    let inspectedSource = rhs;
    if (/^[A-Za-z_$][\w$.]*$/.test(rhs)) {
      // Look up recent template string assigned to `rhs` (e.g. `let html = ...; html += ...; svg.innerHTML = html;`)
      const escapedName = rhs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const assignMatches = [
        ...content.slice(0, m.index).matchAll(new RegExp(`\\b${escapedName}\\s*[+]?=\\s*`, 'g')),
      ];
      inspectedSource = assignMatches
        .map((am) => readStatementRhs(content, am.index + am[0].length))
        .join('\n');
    }

    const exprs = collectAllTemplateInterpolations(inspectedSource);
    const unsafe = exprs.filter((expr) => !isSafeExpr(expr));
    if (unsafe.length > 0) {
      errors.push(
        `[UI-LINT-02] ${relPath}:${ln}: Unescaped dynamic interpolation in .innerHTML (${unsafe[0].slice(0, 50)}); wrap interpolated strings with escapeHtml(...) or use DOM APIs.`
      );
    }
  }
}

/**
 * Validate Tailwind utility contrast and SVG color contrast rules (UI-LINT-03).
 */
function checkContrastAndThemeClasses(relPath, content, errors) {
  const isUiComponentOrPage =
    relPath.endsWith('.astro') || relPath.endsWith('.tsx');
  if (!isUiComponentOrPage) return;
  const isLightOnlyPrintPage = relPath === 'src/pages/courses/[courseId]/pdf-source.astro';

  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const ln = idx + 1;

    // 1. text-emerald-600 fails WCAG AA 4.5:1 on white/light-surface (use text-emerald-700)
    if (/(?<![:\w-])text-emerald-600\b/.test(line)) {
      errors.push(
        `[UI-LINT-03] ${relPath}:${ln}: "text-emerald-600" fails WCAG AA contrast on light surfaces (~3.77:1); use "text-emerald-700" with dark variant.`
      );
    }

    // 2. text-rose-600 fails WCAG AA on light-surface (#f8fafc, 4.49:1) and rose-100
    if (/(?<![:\w-])text-rose-600\b/.test(line)) {
      errors.push(
        `[UI-LINT-03] ${relPath}:${ln}: "text-rose-600" fails WCAG AA contrast on tinted/surface backgrounds (<4.5:1); use "text-rose-700" with dark variant.`
      );
    }

    // 3. Light-mode text-slate-400 / text-gray-400 without dark: prefix
    if (/(?<![-\w:])text-(?:slate|gray|zinc|neutral)-400\b/.test(line)) {
      // Allow only if line is dark-surface styling or explicit dark: prefix checked above
      if (!/bg-slate-9\d0|bg-zinc-9\d0/.test(line)) {
        errors.push(
          `[UI-LINT-03] ${relPath}:${ln}: Unprefixed "text-slate-400" / "text-gray-400" fails light-mode contrast (~2.56:1); use semantic muted or higher-contrast slate.`
        );
      }
    }

    // 4. text-slate-500 / text-gray-500 without a dark:text-* companion (skip print/light-only pdf-source)
    if (!isLightOnlyPrintPage && /(?<![-\w:])text-(?:slate|gray|zinc|neutral)-500\b/.test(line)) {
      if (!/\bdark:text-/.test(line)) {
        errors.push(
          `[UI-LINT-03] ${relPath}:${ln}: "text-slate-500" / "text-gray-500" without a "dark:text-*" override fails dark-mode contrast (~3.07:1); use "text-light-muted dark:text-dark-muted" or slate-700/dark:slate-300.`
        );
      }
    }

    // 5. Light pastel bg-*-100 without dark:bg-* companion (skip print/light-only pdf-source)
    if (!isLightOnlyPrintPage && /(?<![-\w:])bg-(?:amber|emerald|rose|sky|blue|slate|yellow|red|green)-100\b/.test(line)) {
      if (!/\bdark:bg-/.test(line)) {
        errors.push(
          `[UI-LINT-03] ${relPath}:${ln}: Pastel light background "bg-*-100" without "dark:bg-*" and dark/light text contrast breaks readability in dark mode.`
        );
      }
    }
  });

  // 6. Playground-specific static bare border token check and SVG contrast rules
  if (relPath.includes('src/components/playgrounds/')) {
    for (const m of content.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const raw = m[1] ?? m[2] ?? '';
      if (raw.includes('${')) continue;
      const tokens = raw.split(/\s+/).filter(Boolean);
      const hasBorder = tokens.includes('border');
      const hasBorderColor = tokens.some((t) =>
        /^(?:dark:)?border-(?:light-border|dark-border|primary|secondary|accent|slate|gray|zinc|neutral|emerald|rose|amber|sky|blue|red|green|yellow|indigo|purple|transparent|current|white|black)/.test(t)
      );
      if (hasBorder && !hasBorderColor) {
        const ln = lineNumberAt(content, m.index);
        errors.push(
          `[UI-LINT-03] ${relPath}:${ln}: Standalone "border" class without "border-light-border dark:border-dark-border" (or semantic border color) in "${raw}".`
        );
      }
    }

    // SVG <text> must define fill= so it does not default to black in dark mode
    for (const m of content.matchAll(/<text\b([^>]*)>/g)) {
      if (!/\bfill=/.test(m[1])) {
        const ln = lineNumberAt(content, m.index);
        errors.push(
          `[UI-LINT-03] ${relPath}:${ln}: SVG <text> lacks explicit "fill=" attribute (defaults to black in dark mode); add fill="currentColor" or an explicit high-contrast fill.`
        );
      } else if (/\bfill=(?:["']#3b82f6["']|\{[^}]*#3b82f6)/.test(m[1])) {
        const ln = lineNumberAt(content, m.index);
        errors.push(
          `[UI-LINT-03] ${relPath}:${ln}: SVG <text fill="#3b82f6"> fails WCAG AA contrast on white (~3.68:1); use #2563eb or currentColor.`
        );
      }
    }

    // Light blue fill #dbeafe in theme-inherited SVGs breaks dark mode unless fill text/opacity-safe
    if (/#dbeafe\b/.test(content)) {
      const m = content.match(/#dbeafe\b/);
      const ln = lineNumberAt(content, m.index);
      errors.push(
        `[UI-LINT-03] ${relPath}:${ln}: Hardcoded light SVG highlight "#dbeafe" fails dark-mode contrast; use rgba(37, 99, 235, 0.18) or theme-aware fills.`
      );
    }

    // Light gray #94a3b8 or #3b82f6 circle/rect paired with white SVG text in same SVG
    if (/<text\b[^>]*fill=["']white["']/.test(content)) {
      if (/#94a3b8\b/.test(content)) {
        const m = content.match(/#94a3b8\b/);
        const ln = lineNumberAt(content, m.index);
        errors.push(
          `[UI-LINT-03] ${relPath}:${ln}: SVG shape fill "#94a3b8" combined with white text fails WCAG AA contrast (~2.56:1); use #475569 or dark text.`
        );
      }
      if (/['"]#3b82f6['"]/.test(content)) {
        const m = content.match(/['"]#3b82f6['"]/);
        const ln = lineNumberAt(content, m.index);
        errors.push(
          `[UI-LINT-03] ${relPath}:${ln}: SVG fill "#3b82f6" behind white text fails normal WCAG AA contrast (~3.68:1); use #2563eb (~5.17:1).`
        );
      }
    }
  }
}

/**
 * Validate URL pathname parsing discipline, literal backticks in JSX, and
 * clean class-toggle discipline (UI-LINT-04).
 */
function checkPathAndDomDiscipline(relPath, content, errors) {
  // Hardcoded pathParts[1] assumes base '/'
  for (const m of content.matchAll(/pathname\.split\([^)]+\)(?:\s*\.filter\([^)]+\))?(?:\s*\[\s*1\s*\]|\s*;[\s\S]{0,120}\[\s*1\s*\])/g)) {
    const ln = lineNumberAt(content, m.index);
    errors.push(
      `[UI-LINT-04] ${relPath}:${ln}: Hardcoded pathname segment index [1] breaks if deployed under a non-root base path; parse relative to "/lessons/" or BASE_URL.`
    );
  }

  // Literal backticks inside JSX text (outside template literals / expressions / <pre> / <code>)
  if (relPath.endsWith('.tsx')) {
    for (const m of content.matchAll(/>([^<{}`]*`[^<{}`]+`[^<{}`]*)</g)) {
      const snippet = m[1].trim();
      const ln = lineNumberAt(content, m.index);
      errors.push(
        `[UI-LINT-04] ${relPath}:${ln}: Literal Markdown backtick in JSX prose (${snippet.slice(0, 60)}); use <code>...</code> or plain text.`
      );
    }
  }

  // Active button toggling on button elements that still retain conflicting muted colors
  if (relPath.endsWith('.astro')) {
    const hasMutedButton = findButtonOpeningTags(content).some(({ attrs }) => /\btext-light-muted\b/.test(attrs));
    if (hasMutedButton) {
      const addMatch = content.match(/classList\.add\([^)]*text-emerald-[^)]+\)/);
      if (addMatch && !/classList\.remove\([^)]*text-light-muted/.test(content)) {
        const ln = lineNumberAt(content, addMatch.index);
        errors.push(
          `[UI-LINT-04] ${relPath}:${ln}: classList.add adds active emerald text color without removing conflicting "text-light-muted" / "dark:text-dark-muted".`
        );
      }
    }
  }
}

/**
 * Enforce unified InteractivePlayground chrome and reset contracts across all
 * TSX playground components (UI-LINT-05).
 */
function checkPlaygroundContract(relPath, content, errors) {
  if (!relPath.includes('src/components/playgrounds/') || !relPath.endsWith('.tsx')) {
    return;
  }
  const base = path.basename(relPath);
  if (base === 'plot.tsx') return;

  if (!/<InteractivePlayground\b/.test(content)) {
    errors.push(
      `[UI-LINT-05] ${relPath}: Playground must wrap its UI in <InteractivePlayground>.`
    );
  } else if (!/\bonReset=/.test(content)) {
    errors.push(
      `[UI-LINT-05] ${relPath}: <InteractivePlayground> must supply an onReset handler for unified chrome Reset support.`
    );
  }
}

/**
 * Lint a single UI file (.astro, .tsx, or UI utility .ts).
 */
export function lintUiSourceContent({ relPath, content }) {
  const errors = [];
  findMissingButtonTypes(relPath, content, errors);
  checkInnerHtmlSafety(relPath, content, errors);
  checkContrastAndThemeClasses(relPath, content, errors);
  checkPathAndDomDiscipline(relPath, content, errors);
  checkPlaygroundContract(relPath, content, errors);
  return errors;
}

/**
 * Walk src/ UI directories and lint all Astro pages/layouts, components, and
 * DOM utility scripts.
 */
export function lintAllUiFiles(rootDir) {
  const dirs = ['src/components', 'src/pages', 'src/layouts', 'src/utils'];
  const targets = [];

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(astro|tsx|ts)$/.test(entry.name)) {
        targets.push(full);
      }
    }
  };

  dirs.forEach((d) => walk(path.join(rootDir, d)));
  targets.sort();

  const errors = [];
  for (const fullPath of targets) {
    const relPath = path.relative(rootDir, fullPath).replaceAll('\\', '/');
    const content = fs.readFileSync(fullPath, 'utf8');
    errors.push(...lintUiSourceContent({ relPath, content }));
  }
  return { fileCount: targets.length, errors };
}
