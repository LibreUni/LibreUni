import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCourseStructure } from '../src/lib/courseStructure.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultActiveCourses = ['calculus-intro', 'computer-architecture', 'operating-systems', 'database-systems'];

export const stripNonLessonText = (html) =>
  html
    .replace(/<details\b[^>]*class=["'][^"']*\bdiagram-source\b[^"']*["'][^>]*>[\s\S]*?<\/details>/gi, ' ')
    .replace(/<(script|style|pre|code|svg|annotation)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(?:"[^"]*"|'[^']*'|[^>"'])*>/g, ' ')
    .replace(/&(?:lt|gt|amp|quot|#\d+|#x[\da-f]+);/gi, ' ');

// Catches ANY leaked TeX command (\bowtie, \int, \sum, etc.), unrendered $...$ spans,
// lone $ before math syntax, or malformed arithmetic currency-prefix splits like "$1,000+",
// while still permitting standalone currency such as "transfer $100".
const rawTex =
  /\\[A-Za-z]{2,}\b|(?<!\\)\$(?=[A-Za-z_\\[({])|(?<!\\)\$\d[\d,]*(?:\.\d+)?[+\-*/^_=|]|(?<!\\)\$[^$\n]+(?<!\\)\$/;

const katexErrorRe = /class=["'][^"']*\bkatex-error\b[^"']*["']/i;
const diagramErrorRe = /(?:Diagram Rendering Error|TikZ Rendering Error|Python Diagram Error|PlantUML Rendering Error|PlantUML Error)/i;
const leakedBacktickRe = /`[^`\n]+`/;

function extractElementIds(html) {
  const cleaned = html
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const ids = new Set();
  for (const m of cleaned.matchAll(/(?<![a-zA-Z0-9_-])id=["']([^"']+)["']/g)) {
    ids.add(m[1]);
  }
  return ids;
}

function validateRenderedLinks(html, file, idCache) {
  const errors = [];
  const getIdsForFile = (targetFile) => {
    const resolved = path.resolve(targetFile);
    if (!idCache.has(resolved)) {
      idCache.set(resolved, extractElementIds(fs.readFileSync(resolved, 'utf8')));
    }
    return idCache.get(resolved);
  };

  for (const m of html.matchAll(/<a\b([^>]*)\bhref=["']([^"']+)["']([^>]*)>/gi)) {
    const attrs = `${m[1]} ${m[3]}`;
    const href = m[2];
    if (/^(?:https?:|mailto:|javascript:|data:)/i.test(href)) continue;

    if (/#[^"']*\.html(?:$|[?#])/i.test(href)) {
      errors.push(`${file}: link href has mangled .html after hash fragment (${href})`);
      continue;
    }

    const isRefLink = /\blu-ref\b|\bdata-ref-id=/.test(attrs);
    if (!isRefLink) continue;

    const [rawPath, rawHash] = href.split('#');
    let targetFile = file;
    if (rawPath) {
      const cleanPath = rawPath.split('?')[0];
      targetFile = path.resolve(path.dirname(file), cleanPath);
      if (!fs.existsSync(targetFile) || !fs.statSync(targetFile).isFile()) {
        errors.push(`${file}: <Ref> target file does not exist (${href})`);
        continue;
      }
    }
    if (rawHash) {
      const targetIds = getIdsForFile(targetFile);
      const decodedHash = decodeURIComponent(rawHash);
      if (!targetIds.has(decodedHash)) {
        errors.push(`${file}: <Ref> anchor #${decodedHash} missing in ${path.basename(targetFile)} (${href})`);
      }
    }
  }

  return errors;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function decodeAstroValue(node) {
  if (!Array.isArray(node) || node.length < 2) return node;
  const [kind, payload] = node;
  if (kind === 0) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const out = {};
      for (const [k, v] of Object.entries(payload)) out[k] = decodeAstroValue(v);
      return out;
    }
    return payload;
  }
  if (kind === 1 && Array.isArray(payload)) {
    return payload.map(decodeAstroValue);
  }
  return payload;
}

function validateHtmlTables(html, file) {
  const errors = [];
  const cleaned = html
    .replace(/<(script|style|pre|code|svg)\b[\s\S]*?<\/\1>/gi, ' ');
  const tables = cleaned.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi);
  let tableIdx = 0;

  for (const tableMatch of tables) {
    tableIdx++;
    const rows = [...tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (rows.length === 0) continue;

    let expectedCols = null;
    rows.forEach((rowMatch, rowIdx) => {
      const cells = [...rowMatch[1].matchAll(/<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/gi)];
      if (cells.length === 0) return;

      let colTotal = 0;
      for (const cell of cells) {
        const attrs = cell[1] || '';
        const spanMatch = attrs.match(/\bcolspan=["']?(\d+)/i);
        colTotal += spanMatch ? Math.max(1, Number(spanMatch[1])) : 1;

        const cellText = stripNonLessonText(cell[2]);
        if (rawTex.test(cellText)) {
          errors.push(
            `${file}: table #${tableIdx} row ${rowIdx + 1} contains raw TeX or unrendered math (${JSON.stringify(cellText.trim().slice(0, 60))})`
          );
        }
        if (leakedBacktickRe.test(cellText)) {
          errors.push(
            `${file}: table #${tableIdx} row ${rowIdx + 1} contains unformatted Markdown backticks (${JSON.stringify(cellText.trim().slice(0, 60))})`
          );
        }
      }

      if (expectedCols === null) {
        expectedCols = colTotal;
      } else if (colTotal !== expectedCols) {
        errors.push(
          `${file}: table #${tableIdx} row ${rowIdx + 1} has ${colTotal} column(s), expected ${expectedCols}`
        );
      }
    });
  }

  return errors;
}

function validateExerciseIslands(html, file) {
  const errors = [];
  const islands = html.matchAll(/<astro-island\b([^>]*)>/gi);

  for (const island of islands) {
    const attrs = island[1];
    const urlMatch = attrs.match(/\bcomponent-url=["']([^"']+)["']/i);
    const propsMatch = attrs.match(/\bprops=["']([^"']+)["']/i);
    if (!urlMatch || !propsMatch) continue;

    const compUrl = urlMatch[1];
    const isFillIn = /FillInExercise/i.test(compUrl);
    const isCodeEx = /CodeExercise/i.test(compUrl);
    if (!isFillIn && !isCodeEx) continue;

    let decodedProps;
    try {
      const rawJson = JSON.parse(decodeHtmlEntities(propsMatch[1]));
      decodedProps = decodeAstroValue([0, rawJson]);
    } catch {
      continue;
    }

    const answers = Array.isArray(decodedProps.answers) ? decodedProps.answers : [];
    const sourceText = isFillIn
      ? decodedProps.prompt || decodedProps.text || decodedProps.statement || ''
      : decodedProps.code || '';
    if (typeof sourceText !== 'string') continue;

    const blanks = sourceText.split(/(?:\[!blank!]|_{3,})/).length - 1;
    if (blanks > 0 && answers.length !== blanks) {
      errors.push(
        `${file}: ${isFillIn ? 'FillInExercise' : 'CodeExercise'} has ${blanks} blank(s) but serialized ${answers.length} answer slot(s)`
      );
    }
  }

  return errors;
}

export function validateRenderedLessons(root = defaultRoot, activeCourses = defaultActiveCourses) {
  const failures = [];
  const pages = [];
  const idCache = new Map();

  for (const courseId of activeCourses) {
    let structure;
    try {
      structure = loadCourseStructure(courseId, { root });
    } catch (err) {
      failures.push(`Failed loading structure for ${courseId}: ${err.message}`);
      continue;
    }

    for (const page of structure.pages) {
      const slug = page.slug;
      const file = path.join(root, 'dist', 'lessons', courseId, `${slug}.html`);
      if (!fs.existsSync(file)) {
        failures.push(`${file}: rendered active lesson page is missing`);
        continue;
      }
      if (fs.statSync(file).size === 0) {
        failures.push(`${file}: rendered active lesson page is empty`);
        continue;
      }
      pages.push(file);

      const html = fs.readFileSync(file, 'utf8');
      idCache.set(path.resolve(file), extractElementIds(html));
      const visibleText = stripNonLessonText(html);

      if (rawTex.test(visibleText)) {
        failures.push(`${file}: raw TeX leaked into visible lesson text`);
      }
      if (leakedBacktickRe.test(visibleText)) {
        failures.push(`${file}: unformatted Markdown backtick span leaked into visible lesson text`);
      }
      if (katexErrorRe.test(html)) {
        failures.push(`${file}: renderer emitted a KaTeX error placeholder`);
      }
      if (diagramErrorRe.test(html)) {
        failures.push(`${file}: diagram renderer emitted an error placeholder`);
      }

      failures.push(...validateHtmlTables(html, file));
      failures.push(...validateExerciseIslands(html, file));
      failures.push(...validateRenderedLinks(html, file, idCache));
    }
  }

  return { failures, pages };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { failures, pages } = validateRenderedLessons();
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
  }
  console.log(`Rendered lesson validation passed for ${pages.length} active page(s).`);
}
