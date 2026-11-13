import katex from 'katex';

const KNOWN_TEX_CMD_RE =
  /\\(?:bowtie|int|oint|iint|sum|prod|sqrt|frac|dfrac|tfrac|binom|lim|sup|inf|max|min|log|ln|exp|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|sinh|cosh|tanh|infty|partial|nabla|forall|exists|nexists|in|notin|subseteq|subset|supseteq|supset|cup|cap|setminus|emptyset|times|div|cdot|pm|mp|le|ge|leq|geq|ll|gg|ne|neq|approx|equiv|sim|simeq|cong|propto|to|mapsto|rightarrow|leftarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow|implies|iff|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega|mathcal|mathbb|mathrm|mathbf|mathit|mathsf|mathtt|operatorname|text|textbf|textit|lvert|rvert|lVert|rVert|lfloor|rfloor|lceil|rceil|left|right|big|Big|bigg|Bigg|mid|nmid|parallel|perp|angle|triangledown|begin|end)\b/;

// Matches any backslash-letter command of >=2 letters (catches uncommon TeX commands like \bowtie, \oplus, etc.)
const GENERIC_TEX_CMD_RE = /\\[A-Za-z]{2,}/;

function lineOfOffset(source, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source.charCodeAt(i) === 10) line++;
  }
  return line;
}

/**
 * Replace matched span with spaces/newlines preserving exact line numbers.
 */
function maskPreservingNewlines(text) {
  return text.replace(/[^\r\n]/g, ' ');
}

/**
 * Strip fenced code blocks and MDX JSX comments while preserving line numbers.
 */
export function maskCodeAndComments(source) {
  let out = source.replace(/^```[\s\S]*?^```/gm, maskPreservingNewlines);
  out = out.replace(/\{\/\*[\s\S]*?\*\/\}/g, maskPreservingNewlines);
  return out;
}

/**
 * Parse a quoted string literal starting at `quoteChar` (' or " or `).
 * When `raw` is true (or `evaluateEscapes` is false for JSX string attributes),
 * backslashes are preserved verbatim.
 */
function readStringLiteral(src, start, { evaluateEscapes = true } = {}) {
  const quote = src[start];
  let i = start + 1;
  let value = '';
  let inMath = false;
  const unescapedTexInJsString = [];

  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\' && evaluateEscapes) {
      if (i + 1 >= src.length) break;
      const next = src[i + 1];
      if (next === 'n') value += '\n';
      else if (next === 'r') value += '\r';
      else if (next === 't') {
        if (inMath) unescapedTexInJsString.push('\\t' + (src[i + 2] || ''));
        value += '\t';
      } else if (next === 'b') {
        if (inMath) unescapedTexInJsString.push('\\b' + (src[i + 2] || ''));
        value += '\b';
      } else if (next === 'f') {
        if (inMath) unescapedTexInJsString.push('\\f' + (src[i + 2] || ''));
        value += '\f';
      } else if (next === 'v') value += '\v';
      else if (next === '0') value += '\0';
      else if (next === 'x' && /^[0-9a-fA-F]{2}/.test(src.slice(i + 2, i + 4))) {
        value += String.fromCharCode(parseInt(src.slice(i + 2, i + 4), 16));
        i += 2;
      } else if (next === 'u' && /^[0-9a-fA-F]{4}/.test(src.slice(i + 2, i + 6))) {
        value += String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16));
        i += 4;
      } else if (next === '\n') {
        // line continuation
      } else {
        if (inMath && /[A-Za-z,;]/.test(next)) {
          unescapedTexInJsString.push('\\' + src.slice(i + 1, i + 6).match(/^[A-Za-z,;]+/)?.[0]);
        }
        value += next;
      }
      i += 2;
      continue;
    }
    if (ch === '$' && evaluateEscapes && src[i - 1] !== '\\') {
      inMath = !inMath;
    }
    if (quote === '`' && ch === '$' && src[i + 1] === '{') {
      // Unresolved template interpolation
      return null;
    }
    if (ch === quote) {
      return { value, end: i + 1, unescapedTexInJsString };
    }
    value += ch;
    i++;
  }
  return null;
}

function skipWsAndComments(src, pos) {
  let i = pos;
  while (i < src.length) {
    if (/\s/.test(src[i])) {
      i++;
    } else if (src.startsWith('//', i)) {
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl + 1;
    } else if (src.startsWith('/*', i)) {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
    } else {
      break;
    }
  }
  return i;
}

const UNRESOLVED = Symbol('UNRESOLVED');

function parseJsLiteral(src, pos, warnings = []) {
  let i = skipWsAndComments(src, pos);
  if (i >= src.length) return { value: UNRESOLVED, end: i };

  const ch = src[i];
  if (ch === '"' || ch === "'" || ch === '`') {
    const res = readStringLiteral(src, i, { evaluateEscapes: true });
    if (res?.unescapedTexInJsString?.length) {
      warnings.push(...res.unescapedTexInJsString);
    }
    return res ? { value: res.value, end: res.end } : { value: UNRESOLVED, end: i + 1 };
  }

  if (src.startsWith('String.raw`', i)) {
    const tickStart = i + 'String.raw'.length;
    const res = readStringLiteral(src, tickStart, { evaluateEscapes: false });
    return res ? { value: res.value, end: res.end } : { value: UNRESOLVED, end: tickStart + 1 };
  }

  if (ch === '[') {
    const arr = [];
    i++;
    while (i < src.length) {
      i = skipWsAndComments(src, i);
      if (src[i] === ']') return { value: arr, end: i + 1 };
      const item = parseJsLiteral(src, i, warnings);
      if (item.value === UNRESOLVED) return { value: UNRESOLVED, end: item.end };
      arr.push(item.value);
      i = skipWsAndComments(src, item.end);
      if (src[i] === ',') i++;
      else if (src[i] === ']') return { value: arr, end: i + 1 };
      else return { value: UNRESOLVED, end: i };
    }
    return { value: UNRESOLVED, end: i };
  }

  if (ch === '{') {
    const obj = {};
    i++;
    while (i < src.length) {
      i = skipWsAndComments(src, i);
      if (src[i] === '}') return { value: obj, end: i + 1 };
      let key;
      if (src[i] === '"' || src[i] === "'") {
        const k = readStringLiteral(src, i, { evaluateEscapes: true });
        if (!k) return { value: UNRESOLVED, end: i + 1 };
        key = k.value;
        i = k.end;
      } else {
        const keyMatch = src.slice(i).match(/^([A-Za-z_$][A-Za-z0-9_$]*)/);
        if (!keyMatch) return { value: UNRESOLVED, end: i };
        key = keyMatch[1];
        i += key.length;
      }
      i = skipWsAndComments(src, i);
      if (src[i] !== ':') return { value: UNRESOLVED, end: i };
      i++;
      const val = parseJsLiteral(src, i, warnings);
      if (val.value === UNRESOLVED) return { value: UNRESOLVED, end: val.end };
      obj[key] = val.value;
      i = skipWsAndComments(src, val.end);
      if (src[i] === ',') i++;
      else if (src[i] === '}') return { value: obj, end: i + 1 };
      else return { value: UNRESOLVED, end: i };
    }
    return { value: UNRESOLVED, end: i };
  }

  const kwMatch = src.slice(i).match(/^(true|false|null)\b/);
  if (kwMatch) {
    const kw = kwMatch[1];
    return {
      value: kw === 'true' ? true : kw === 'false' ? false : null,
      end: i + kw.length,
    };
  }

  const numMatch = src.slice(i).match(/^-?\d+(?:\.\d+)?/);
  if (numMatch) {
    return { value: Number(numMatch[0]), end: i + numMatch[0].length };
  }

  return { value: UNRESOLVED, end: i };
}

function findMatchingBraceEnd(src, braceStart) {
  let depth = 0;
  let i = braceStart;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (src.startsWith('//', i)) {
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl + 1;
      continue;
    }
    if (src.startsWith('/*', i)) {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return src.length;
}

function parseTagAttributes(attrSrc) {
  const props = {};
  const jsEscapeWarnings = [];
  let i = 0;
  while (i < attrSrc.length) {
    i = skipWsAndComments(attrSrc, i);
    if (i >= attrSrc.length) break;
    const nameMatch = attrSrc.slice(i).match(/^([A-Za-z_:][A-Za-z0-9_.:-]*)/);
    if (!nameMatch) {
      i++;
      continue;
    }
    const name = nameMatch[1];
    i += name.length;
    i = skipWsAndComments(attrSrc, i);
    if (attrSrc[i] !== '=') {
      props[name] = true;
      continue;
    }
    i++;
    i = skipWsAndComments(attrSrc, i);
    const valStart = attrSrc[i];
    if (valStart === '"' || valStart === "'") {
      // MDX/JSX string literal attributes do NOT evaluate JS backslash escapes.
      const res = readStringLiteral(attrSrc, i, { evaluateEscapes: false });
      if (res) {
        props[name] = res.value;
        i = res.end;
      } else {
        i++;
      }
    } else if (valStart === '{') {
      const braceEnd = findMatchingBraceEnd(attrSrc, i);
      const expr = attrSrc.slice(i + 1, braceEnd - 1);
      const propWarnings = [];
      const parsed = parseJsLiteral(expr, 0, propWarnings);
      if (propWarnings.length > 0 && name !== 'code') {
        jsEscapeWarnings.push({ prop: name, escapes: propWarnings });
      }
      if (parsed.value !== UNRESOLVED) {
        props[name] = parsed.value;
      }
      i = braceEnd;
    } else {
      i++;
    }
  }
  return { props, jsEscapeWarnings };
}

/**
 * Scan known MDX component opening / self-closing tags and parse static props.
 * Also returns masked source with component opening tags replaced by whitespace/newlines
 * so Markdown table & prose scanners do not inspect JSX prop source as prose.
 */
export function extractJsxComponentTags(maskedSource) {
  const tags = [];
  const pieces = [];
  let cursor = 0;

  const startRe = /(?:^|[\s>])<([A-Z][A-Za-z0-9]*)(?=[\s/>])/gm;
  let match;
  while ((match = startRe.exec(maskedSource)) !== null) {
    const tagName = match[1];
    const ltOffset = match.index + match[0].indexOf('<');
    if (ltOffset < cursor) continue;

    // Scan from after `<TagName` to matching top-level `>` or `/>`
    let i = ltOffset + 1 + tagName.length;
    let foundEnd = -1;
    while (i < maskedSource.length) {
      const ch = maskedSource[i];
      if (ch === '"' || ch === "'") {
        const res = readStringLiteral(maskedSource, i, { evaluateEscapes: false });
        i = res ? res.end : i + 1;
        continue;
      }
      if (ch === '{') {
        i = findMatchingBraceEnd(maskedSource, i);
        continue;
      }
      if (ch === '/' && maskedSource[i + 1] === '>') {
        foundEnd = i + 2;
        break;
      }
      if (ch === '>') {
        foundEnd = i + 1;
        break;
      }
      i++;
    }

    if (foundEnd === -1) continue;

    const tagSource = maskedSource.slice(ltOffset, foundEnd);
    const isSelfClosing = tagSource.endsWith('/>');
    const attrSlice = tagSource.slice(
      1 + tagName.length,
      isSelfClosing ? -2 : -1
    );

    const { props, jsEscapeWarnings } = parseTagAttributes(attrSlice);
    tags.push({
      name: tagName,
      line: lineOfOffset(maskedSource, ltOffset),
      start: ltOffset,
      end: foundEnd,
      props,
      jsEscapeWarnings,
    });

    pieces.push(maskedSource.slice(cursor, ltOffset));
    pieces.push(maskPreservingNewlines(tagSource));
    cursor = foundEnd;
    startRe.lastIndex = foundEnd;
  }

  pieces.push(maskedSource.slice(cursor));
  return {
    tags,
    proseWithoutTags: pieces.join(''),
  };
}

function countUnescapedSingleDollars(text) {
  // Remove inline code spans first so `$foo` inside code is ignored
  const withoutCode = text.replace(/`[^`\n]*`/g, '');
  let single = 0;
  let dbl = 0;
  let i = 0;
  while (i < withoutCode.length) {
    if (withoutCode[i] === '\\') {
      i += 2;
      continue;
    }
    if (withoutCode[i] === '$') {
      if (withoutCode[i + 1] === '$') {
        dbl++;
        i += 2;
        continue;
      }
      single++;
    }
    i++;
  }
  return { single, dbl, withoutCode };
}

function isStandaloneCurrencyLine(withoutCode) {
  // Only allow unescaped `$` in prose when it is an unambiguous single currency amount
  // (e.g. "transfer $100") with no TeX commands or arithmetic suffixes (+, -, =, ^, _, |).
  const dollars = [...withoutCode.matchAll(/(?<!\\)\$/g)];
  if (dollars.length !== 1) return false;
  if (GENERIC_TEX_CMD_RE.test(withoutCode)) return false;
  const idx = dollars[0].index ?? 0;
  const after = withoutCode.slice(idx);
  return /^\$\d[\d,]*(?:\.\d+)?(?=$|\s|[,.;:!?)"”’])/.test(after);
}

/**
 * Strip balanced inline code spans and $...$ / $$...$$ math spans from text,
 * validating every math span with strict KaTeX (`throwOnError: true`).
 */
export function validateMathAndExtractPlainText(text, contextLabel, { allowSingleCurrency = false } = {}) {
  const issues = [];
  if (typeof text !== 'string' || !text) return issues;

  // Detect control chars that commonly indicate missing `\\` in JS template literals (e.g., \frac -> \f, \to -> \t, \beta -> \b)
  if (/[\x07\x08\x0b\x0c]/.test(text)) {
    issues.push(
      `${contextLabel}: control character found in string (likely an unescaped LaTeX command such as \\frac, \\beta, or \\vec inside a JS string/template literal; double backslashes with \\\\).`
    );
  }

  if (/\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/.test(text.replace(/`[^`\n]*`/g, ''))) {
    issues.push(`${contextLabel}: use $...$ or $$...$$ instead of \\(...\\) or \\[...\\] LaTeX delimiters.`);
  }

  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const { single, withoutCode } = countUnescapedSingleDollars(line);
    if (single % 2 === 1) {
      if (!allowSingleCurrency || !isStandaloneCurrencyLine(withoutCode)) {
        issues.push(`${contextLabel}: unpaired $ delimiter on line "${line.trim().slice(0, 100)}".`);
      }
    }
  });

  // Tokenize code spans first, then $$...$$ and $...$ math spans
  const tokenRegex = /(`[^`\n]+?`|\$\$[\s\S]+?\$\$|(?<!\\)\$(?:\\.|[^$\\\n])+?\$)/g;
  let lastIndex = 0;
  let plain = '';

  for (const match of text.matchAll(tokenRegex)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) plain += text.slice(lastIndex, idx);
    const tok = match[0];
    if (tok.startsWith('$$') && tok.endsWith('$$')) {
      const tex = tok.slice(2, -2);
      if (/\t/.test(tex)) {
        issues.push(`${contextLabel}: literal TAB inside $$...$$ (likely unescaped \\text or \\to in template literal).`);
      }
      try {
        katex.renderToString(tex, { displayMode: true, throwOnError: true });
      } catch (err) {
        issues.push(`${contextLabel}: invalid KaTeX display math ${tok.slice(0, 60)} (${err.message}).`);
      }
    } else if (tok.startsWith('$') && tok.endsWith('$')) {
      const tex = tok.slice(1, -1);
      if (/\t/.test(tex)) {
        issues.push(`${contextLabel}: literal TAB inside $...$ (likely unescaped \\text or \\to in template literal).`);
      }
      try {
        katex.renderToString(tex, { displayMode: false, throwOnError: true });
      } catch (err) {
        issues.push(`${contextLabel}: invalid KaTeX inline math ${tok.slice(0, 60)} (${err.message}).`);
      }
    }
    lastIndex = idx + tok.length;
  }
  if (lastIndex < text.length) plain += text.slice(lastIndex);

  // Outside code and math, flag leaked TeX commands
  const texLeak = plain.match(KNOWN_TEX_CMD_RE) || plain.match(GENERIC_TEX_CMD_RE);
  if (texLeak) {
    // Allow literal escaped `\n` or punctuation in non-latex contexts, flag TeX words
    const cmd = texLeak[0];
    if (!['\\n', '\\r', '\\t'].includes(cmd) && !plain.includes('http')) {
      issues.push(`${contextLabel}: raw TeX command "${cmd}" outside $...$ math delimiters.`);
    }
  }

  return issues;
}

/**
 * Split a Markdown GFM table row into cells respecting escaped pipes (`\|`)
 * while preserving unescaped pipes (`|`) as cell separators—mirroring remark-gfm.
 */
export function splitGfmTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) trimmed = trimmed.slice(0, -1);

  const cells = [];
  let current = '';
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '\\' && i + 1 < trimmed.length) {
      current += ch + trimmed[i + 1];
      i++;
      continue;
    }
    if (ch === '|') {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

const GFM_SEPARATOR_LINE_RE =
  /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*(?::?-{3,}:?\s*\|?)?\s*$|^\s*\|\s*:?-{3,}:?\s*\|\s*$/;

function isPipeRow(line) {
  return /^\s*\|.*\|/.test(line) || /\|/.test(line.trim());
}

function hasUnescapedPipeInMath(line) {
  const withoutCode = line.replace(/`[^`\n]*`/g, '');
  const mathSpans = withoutCode.matchAll(/(?<!\\)\$(?:\\.|[^$\\\n])+?\$/g);
  for (const m of mathSpans) {
    const tex = m[0].slice(1, -1);
    for (let i = 0; i < tex.length; i++) {
      if (tex[i] === '\\') {
        i++;
        continue;
      }
      if (tex[i] === '|') return m[0];
    }
  }
  return null;
}

/**
 * Validate GFM Markdown tables (LINT-16), prose math/TeX leaks (LINT-17),
 * frontmatter formatting, and JSX exercise props/arity (LINT-17 & LINT-18).
 */
export function lintMdxSourceContent({ relPath, body, frontmatter = {}, bodyStartLine = 1 }) {
  const errors = [];
  const lineOffset = bodyStartLine - 1;

  // 1. Validate frontmatter string arrays rendered cleanly by LessonBrief / pages
  for (const field of ['prerequisites', 'outcomes', 'omissions']) {
    const list = frontmatter[field];
    if (!Array.isArray(list)) continue;
    list.forEach((item, idx) => {
      if (typeof item !== 'string') return;
      const tickCount = (item.match(/`/g) || []).length;
      if (tickCount % 2 === 1) {
        errors.push(`[LINT-17] ${relPath}: Unbalanced backtick in frontmatter.${field}[${idx}].`);
      }
      for (const issue of validateMathAndExtractPlainText(item, `${relPath} frontmatter.${field}[${idx}]`)) {
        errors.push(`[LINT-17] ${issue}`);
      }
    });
  }
  if (typeof frontmatter.assessment === 'string') {
    const tickCount = (frontmatter.assessment.match(/`/g) || []).length;
    if (tickCount % 2 === 1) {
      errors.push(`[LINT-17] ${relPath}: Unbalanced backtick in frontmatter.assessment.`);
    }
    for (const issue of validateMathAndExtractPlainText(frontmatter.assessment, `${relPath} frontmatter.assessment`)) {
      errors.push(`[LINT-17] ${issue}`);
    }
  }

  const maskedBody = maskCodeAndComments(body);
  const { tags, proseWithoutTags } = extractJsxComponentTags(maskedBody);

  // 2. Validate Markdown tables (LINT-16) and prose lines (LINT-17)
  const lines = proseWithoutTags.split(/\r?\n/);
  const tableLineIndices = new Set();

  for (let i = 0; i < lines.length - 1; i++) {
    const header = lines[i];
    const sep = lines[i + 1];
    if (!header.includes('|') || !GFM_SEPARATOR_LINE_RE.test(sep)) continue;

    const headerCells = splitGfmTableRow(header);
    const sepCells = splitGfmTableRow(sep);
    const expectedCols = headerCells.length;
    const tableLine = i + 1 + lineOffset;

    if (sepCells.length !== expectedCols) {
      errors.push(
        `[LINT-16] ${relPath}:${tableLine + 1}: Markdown table separator has ${sepCells.length} columns, header has ${expectedCols}.`
      );
    }

    tableLineIndices.add(i);
    tableLineIndices.add(i + 1);

    const checkTableRow = (rowLine, rowNum) => {
      const pipeInMath = hasUnescapedPipeInMath(rowLine);
      if (pipeInMath) {
        errors.push(
          `[LINT-16] ${relPath}:${rowNum}: Unescaped "|" inside table math (${pipeInMath}) splits GFM cells; use \\lvert ... \\rvert or \\mid instead.`
        );
      }
      const cells = splitGfmTableRow(rowLine);
      if (cells.length !== expectedCols) {
        errors.push(
          `[LINT-16] ${relPath}:${rowNum}: Markdown table row has ${cells.length} cell(s), expected ${expectedCols} (check for unescaped "|" inside math or code).`
        );
      }
      cells.forEach((cell, colIdx) => {
        const { single } = countUnescapedSingleDollars(cell);
        if (single % 2 === 1) {
          errors.push(
            `[LINT-16] ${relPath}:${rowNum}: Unpaired "$" in table column ${colIdx + 1} (${JSON.stringify(cell.trim().slice(0, 60))}).`
          );
        }
        const cellWithoutCode = cell.replace(/`[^`\n]*`/g, '');
        const backtickCount = (cell.match(/`/g) || []).length;
        if (backtickCount % 2 === 1) {
          errors.push(
            `[LINT-16] ${relPath}:${rowNum}: Unbalanced backtick in table column ${colIdx + 1}.`
          );
        }
        for (const issue of validateMathAndExtractPlainText(cellWithoutCode, `${relPath}:${rowNum} col ${colIdx + 1}`)) {
          errors.push(`[LINT-17] ${issue}`);
        }
      });
    };

    checkTableRow(header, tableLine);
    let r = i + 2;
    while (r < lines.length && lines[r].trim().length > 0 && isPipeRow(lines[r])) {
      tableLineIndices.add(r);
      checkTableRow(lines[r], r + 1 + lineOffset);
      r++;
    }
    i = r - 1;
  }

  // Paragraph-level $$ parity (handles blockquotes "> $$" too) and line-level prose math/TeX validation
  let inDisplayMath = false;
  let displayStartLine = 0;
  let displayBuffer = [];

  lines.forEach((line, idx) => {
    const absLine = idx + 1 + lineOffset;
    if (tableLineIndices.has(idx)) return;
    if (/^\s*(?:import|export)\s/.test(line)) return;

    const cleanLine = line.replace(/^\s*(?:>\s*)+/, '');
    const noInlineCode = cleanLine.replace(/`[^`\n]*`/g, '');
    const { dbl } = countUnescapedSingleDollars(noInlineCode);

    if (dbl % 2 === 1) {
      if (!inDisplayMath) {
        inDisplayMath = true;
        displayStartLine = absLine;
        const openerIdx = noInlineCode.indexOf('$$');
        displayBuffer = [noInlineCode.slice(openerIdx + 2)];
      } else {
        const closerIdx = noInlineCode.lastIndexOf('$$');
        displayBuffer.push(noInlineCode.slice(0, closerIdx));
        const tex = displayBuffer.join('\n').trim();
        if (tex) {
          try {
            katex.renderToString(tex, { displayMode: true, throwOnError: true });
          } catch (err) {
            errors.push(`[LINT-17] ${relPath}:${displayStartLine}: invalid KaTeX display math (${err.message}).`);
          }
        }
        inDisplayMath = false;
        displayBuffer = [];
      }
      return;
    }

    if (inDisplayMath) {
      displayBuffer.push(cleanLine);
      return;
    }

    for (const issue of validateMathAndExtractPlainText(line, `${relPath}:${absLine}`, { allowSingleCurrency: true })) {
      errors.push(`[LINT-17] ${issue}`);
    }
  });

  if (inDisplayMath) {
    errors.push(`[LINT-17] ${relPath}:${displayStartLine}: Unclosed "$$" display math block.`);
  }

  // 3. Validate JSX component props & blank-to-answer arity (LINT-17 & LINT-18)
  for (const tag of tags) {
    const absLine = tag.line + lineOffset;
    const p = tag.props;

    for (const warn of tag.jsEscapeWarnings || []) {
      errors.push(
        `[LINT-17] ${relPath}:${absLine} <${tag.name}>.${warn.prop}: single backslash in JS string math (${warn.escapes.join(', ')}) gets eaten by JS escaping; double backslashes with \\\\ or use String.raw.`
      );
    }

    if (tag.name === 'Quiz') {
      for (const k of ['question', 'explanation', 'title']) {
        if (typeof p[k] === 'string') {
          for (const issue of validateMathAndExtractPlainText(p[k], `${relPath}:${absLine} <Quiz>.${k}`)) {
            errors.push(`[LINT-17] ${issue}`);
          }
        }
      }
      if (Array.isArray(p.options)) {
        p.options.forEach((opt, idx) => {
          if (!opt || typeof opt !== 'object') return;
          for (const k of ['text', 'feedback']) {
            if (typeof opt[k] === 'string') {
              for (const issue of validateMathAndExtractPlainText(opt[k], `${relPath}:${absLine} <Quiz>.options[${idx}].${k}`)) {
                errors.push(`[LINT-17] ${issue}`);
              }
            }
          }
        });
      }
    }

    if (tag.name === 'CaseStudy') {
      for (const k of ['scenario', 'question', 'explanation', 'title']) {
        if (typeof p[k] === 'string') {
          for (const issue of validateMathAndExtractPlainText(p[k], `${relPath}:${absLine} <CaseStudy>.${k}`)) {
            errors.push(`[LINT-17] ${issue}`);
          }
        }
      }
      if (Array.isArray(p.options)) {
        p.options.forEach((opt, idx) => {
          if (!opt || typeof opt !== 'object') return;
          for (const k of ['text', 'feedback']) {
            if (typeof opt[k] === 'string') {
              for (const issue of validateMathAndExtractPlainText(opt[k], `${relPath}:${absLine} <CaseStudy>.options[${idx}].${k}`)) {
                errors.push(`[LINT-17] ${issue}`);
              }
            }
          }
        });
      }
    }

    if (tag.name === 'ExerciseSolution') {
      for (const k of ['hint', 'title', 'hintTitle']) {
        if (typeof p[k] === 'string') {
          const tickCount = (p[k].match(/`/g) || []).length;
          if (tickCount % 2 === 1) {
            errors.push(`[LINT-17] ${relPath}:${absLine}: Unbalanced backtick in <ExerciseSolution>.${k}.`);
          }
          for (const issue of validateMathAndExtractPlainText(p[k], `${relPath}:${absLine} <ExerciseSolution>.${k}`)) {
            errors.push(`[LINT-17] ${issue}`);
          }
        }
      }
    }

    if (tag.name === 'FillInExercise') {
      const promptText = p.prompt ?? p.text ?? p.statement;
      if (typeof promptText === 'string') {
        const parts = promptText.split(/(?:\[!blank!]|_{3,})/);
        const blankCount = parts.length - 1;
        if (blankCount < 1) {
          errors.push(`[LINT-18] ${relPath}:${absLine}: <FillInExercise> prompt must contain at least one [!blank!] placeholder.`);
        }
        if (Array.isArray(p.answers) && p.answers.length !== blankCount) {
          errors.push(
            `[LINT-18] ${relPath}:${absLine}: <FillInExercise> has ${blankCount} blank(s) but answers array has ${p.answers.length} slot(s). Wrap multiple variants for one blank in a nested array answers={[[...]]}.`
          );
        }
        parts.forEach((seg, segIdx) => {
          for (const issue of validateMathAndExtractPlainText(seg, `${relPath}:${absLine} <FillInExercise>.prompt segment ${segIdx + 1}`)) {
            errors.push(`[LINT-17] ${issue}`);
          }
          if (segIdx < parts.length - 1) {
            const nextSeg = parts[segIdx + 1];
            if (seg.trimEnd().endsWith('$') && nextSeg.trimStart().startsWith('$')) {
              errors.push(
                `[LINT-18] ${relPath}:${absLine}: <FillInExercise> splits inline math directly across [!blank!] ($...$ [!blank!] $...$); restructure so [!blank!] completes a trailing or standalone expression cleanly.`
              );
            }
          }
        });
        if (Array.isArray(p.answers) && p.answers.length === blankCount) {
          const completedPrompt = parts.reduce((acc, part, idx) => {
            const slot = idx < p.answers.length ? p.answers[idx] : '';
            const primary = Array.isArray(slot) ? slot[0] || '' : slot || '';
            const formatted =
              primary && !String(primary).includes('$') && /(?:\\[A-Za-z,;]+|[\^_{}])/.test(String(primary))
                ? `$${primary}$`
                : primary;
            return acc + part + formatted;
          }, '');
          for (const issue of validateMathAndExtractPlainText(completedPrompt, `${relPath}:${absLine} <FillInExercise> print completion`)) {
            errors.push(`[LINT-17] ${issue}`);
          }
        }
      }
      for (const k of ['explanation', 'title']) {
        if (typeof p[k] === 'string') {
          for (const issue of validateMathAndExtractPlainText(p[k], `${relPath}:${absLine} <FillInExercise>.${k}`)) {
            errors.push(`[LINT-17] ${issue}`);
          }
        }
      }
    }

    if (tag.name === 'CodeExercise') {
      if (typeof p.code === 'string') {
        const parts = p.code.split(/\[!blank!]|_{3,}/);
        const blankCount = parts.length - 1;
        if (blankCount < 1) {
          errors.push(`[LINT-18] ${relPath}:${absLine}: <CodeExercise> code must contain at least one [!blank!] placeholder.`);
        }
        if (Array.isArray(p.answers) && p.answers.length !== blankCount) {
          errors.push(
            `[LINT-18] ${relPath}:${absLine}: <CodeExercise> has ${blankCount} blank(s) but answers array has ${p.answers.length} slot(s). Wrap multiple variants for one blank in a nested array answers={[[...]]}.`
          );
        }
      }
      for (const k of ['description', 'explanation', 'title']) {
        if (typeof p[k] === 'string') {
          for (const issue of validateMathAndExtractPlainText(p[k], `${relPath}:${absLine} <CodeExercise>.${k}`)) {
            errors.push(`[LINT-17] ${issue}`);
          }
        }
      }
    }
  }

  return errors;
}
