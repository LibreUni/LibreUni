import fs from 'node:fs';
import path from 'node:path';

/**
 * Strip fenced code blocks for prose-only checks while preserving line structure
 * for accurate line reporting.
 */
function stripFencedCodePreserveLines(body) {
  const lines = body.split(/\r?\n/);
  const out = [];
  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;

  for (const line of lines) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (!inFence && m) {
      inFence = true;
      fenceChar = m[1][0];
      fenceLen = m[1].length;
      out.push('');
      continue;
    }
    if (inFence) {
      const close = line.match(/^\s*(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fenceChar && close[1].length >= fenceLen) {
        inFence = false;
        fenceChar = '';
        fenceLen = 0;
      }
      out.push('');
      continue;
    }
    out.push(line);
  }
  return out;
}

/**
 * Strip MDX `{/* ... * /}` comments from already-fenced-stripped lines while
 * preserving line offsets.
 */
function stripMdxCommentsPreserveLines(lines) {
  const joined = lines.join('\n').replace(/\{\/\*[\s\S]*?\*\/\}/g, (match) =>
    '\n'.repeat(match.split('\n').length - 1)
  );
  return joined.split('\n');
}

const BANNED_D0017_PATTERNS = [
  { regex: /\bstudents?\b/gi, label: 'student(s)' },
  { regex: /\bprofessors?\b/gi, label: 'professor(s)' },
  { regex: /\binstructors?\b/gi, label: 'instructor(s)' },
  { regex: /\bsemesters?\b/gi, label: 'semester(s)' },
  { regex: /\bregistrars?\b/gi, label: 'registrar(s)' },
  { regex: /\bdeans?\b/gi, label: 'dean(s)' },
  { regex: /\bsyllabuses\b|\bsyllabi\b/gi, label: 'syllabus/syllabi' },
  { regex: /\btuition\b/gi, label: 'tuition' },
  { regex: /\bgradebooks?\b/gi, label: 'gradebook(s)' },
  { regex: /\bregistration\s+report\b/gi, label: 'registration report' },
  { regex: /\bregistration\/offering\b/gi, label: 'registration/offering' },
  { regex: /\bRegistration\s+split\b/g, label: 'Registration split' },
  { regex: /\benrollments?\b/gi, label: 'enrollment(s)' },
  { regex: /\bcourse_code\b/g, label: 'course_code' },
  { regex: /\boffering_id\b/g, label: 'offering_id' },
  { regex: /\boffice\s+hours\b/gi, label: 'office hours' },
  { regex: /\bteaching\s+assistants?\b/gi, label: 'teaching assistant(s)' },
  { regex: /\bgrading\s+rubrics?\b/gi, label: 'grading rubric(s)' },
  { regex: /\boral\s+defenses?\b/gi, label: 'oral defense(s)' },
  { regex: /\bpassing\s+grades?\b/gi, label: 'passing grade(s)' },
  { regex: /\bclassmates?\b/gi, label: 'classmate(s)' },
  { regex: /\bhonor\s+code\b/gi, label: 'honor code' },
];

const TABLE_SEP_RE = /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const TOP_LEVEL_BLOCK_JSX_RE =
  /^<(?:Figure|PlantUML|TikZ|Quiz|Callout|CaseStudy|MathStatement|ExerciseSet|SqlRunner|CodeRunner)\b/;
const INDENTED_LIST_ITEM_RE = /^\s{2,}(?:[-*]|\d+\.)\s+/;

/**
 * Split a single GFM table row into cell strings without breaking inside inline
 * code or math delimiters.
 */
function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);

  const cells = [];
  let current = '';
  let inCode = false;
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (ch === '\\' && trimmed[i + 1] === '|') {
      current += trimmed.slice(i, i + 2);
      i += 1;
      continue;
    }
    if (ch === '`') {
      inCode = !inCode;
      current += ch;
      continue;
    }
    if (ch === '|' && !inCode) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

/**
 * Validate GFM table header rows so no empty header cells are abused as
 * banner/layout labels (LINT-16 extension).
 */
function checkTableHeaders(relPath, lines, errors) {
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (!TABLE_ROW_RE.test(lines[i]) || !TABLE_SEP_RE.test(lines[i + 1])) continue;
    const headerCells = splitTableRow(lines[i]);
    if (headerCells.length < 2) continue;
    const blankIndexes = headerCells
      .map((cell, idx) => (cell.trim() === '' ? idx + 1 : null))
      .filter((v) => v !== null);
    const isMatrixCornerOnly =
      blankIndexes.length === 1 && blankIndexes[0] === 1;
    if (blankIndexes.length > 0 && !isMatrixCornerOnly) {
      errors.push(
        `[LINT-16] ${relPath}:${i + 1}: Markdown table header has empty column cell(s) at column ${blankIndexes.join(', ')}; split side-by-side relations into separate tables or place captions outside the table header.`
      );
    }
  }
}

/**
 * Enforce D-0017 autonomous digital learning terminology outside fenced code
 * blocks (LINT-19).
 */
function checkD0017Terminology(relPath, lines, frontmatter, errors) {
  const fmStrings = [];
  for (const key of ['title', 'description', 'assessment']) {
    if (typeof frontmatter?.[key] === 'string') {
      fmStrings.push({ field: key, text: frontmatter[key] });
    }
  }
  for (const listKey of ['outcomes', 'prerequisites', 'omissions']) {
    if (Array.isArray(frontmatter?.[listKey])) {
      frontmatter[listKey].forEach((entry, idx) => {
        if (typeof entry === 'string') {
          fmStrings.push({ field: `${listKey}[${idx}]`, text: entry });
        }
      });
    }
  }

  for (const { field, text } of fmStrings) {
    for (const { regex, label } of BANNED_D0017_PATTERNS) {
      regex.lastIndex = 0;
      if (regex.test(text)) {
        errors.push(
          `[LINT-19] ${relPath}: frontmatter.${field} uses D-0017 banned academic terminology (${label}).`
        );
      }
    }
  }

  lines.forEach((line, idx) => {
    for (const { regex, label } of BANNED_D0017_PATTERNS) {
      regex.lastIndex = 0;
      if (regex.test(line)) {
        errors.push(
          `[LINT-19] ${relPath}:${idx + 1}: body uses D-0017 banned academic terminology (${label}).`
        );
      }
    }
  });
}

/**
 * Check structural integrity of MDX blocks: ExerciseSet presence on lessons/labs
 * and preventing top-level JSX tags from splitting indented Markdown lists
 * (LINT-20).
 */
function checkBlockStructure(relPath, lines, frontmatter, errors) {
  const kind = frontmatter?.kind || 'lesson';
  const codeFreeBody = lines.join('\n');
  if ((kind === 'lesson' || kind === 'lab') && !/<ExerciseSet\b/.test(codeFreeBody)) {
    errors.push(
      `[LINT-20] ${relPath}: kind '${kind}' must include at least one <ExerciseSet> with <Exercise> blocks instead of bare prose review exercises.`
    );
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (/^\*\*Review exercise\.\*\*/.test(lines[i].trim())) {
      errors.push(
        `[LINT-20] ${relPath}:${i + 1}: Replace bare "**Review exercise.**" prose with structured <ExerciseSet> and <Exercise>.`
      );
    }

    if (!TOP_LEVEL_BLOCK_JSX_RE.test(lines[i])) continue;
    let prev = i - 1;
    while (prev >= 0 && !lines[prev].trim()) prev -= 1;
    let next = i + 1;
    while (next < lines.length && !lines[next].trim()) next += 1;

    if (prev >= 0 && next < lines.length) {
      if (INDENTED_LIST_ITEM_RE.test(lines[prev]) && INDENTED_LIST_ITEM_RE.test(lines[next])) {
        errors.push(
          `[LINT-20] ${relPath}:${i + 1}: Unindented JSX block (${lines[i].trim().slice(0, 48)}) splits an indented Markdown list; place it after the list or end the parent item cleanly.`
        );
      }
    }
  }
}

/**
 * Audit extended MDX content rules (LINT-16 empty table headers, LINT-19
 * D-0017 terminology, LINT-20 ExerciseSet and list-splitting JSX structure).
 */
export function auditExtendedMdxContent({ relPath, body, frontmatter = {} }) {
  const errors = [];
  const lines = stripFencedCodePreserveLines(body);
  const proseLines = stripMdxCommentsPreserveLines(lines);

  checkTableHeaders(relPath, lines, errors);
  checkD0017Terminology(relPath, proseLines, frontmatter, errors);
  checkBlockStructure(relPath, lines, frontmatter, errors);

  return errors;
}

/**
 * Audit metadata consistency across pages and data manifests (for example,
 * ensuring the homepage counts only public lessons and development.astro tracks
 * all active lesson components).
 */
export function auditSiteStructureConsistency(rootDir) {
  const errors = [];
  const indexPath = path.join(rootDir, 'src/pages/index.astro');
  if (fs.existsSync(indexPath)) {
    const src = fs.readFileSync(indexPath, 'utf8');
    // Check that total lessons displayed on the homepage excludes draft courses.
    const countsRawLessonsLength =
      /const\s+lessons\s*=\s*await\s+getCollection\(['"]lessons['"]\)/.test(src) &&
      !src.includes('publicCourseIds') &&
      src.includes('{lessons.length}');
    if (countsRawLessonsLength) {
      errors.push(
        '[SITE-01] src/pages/index.astro: Displays unfiltered {lessons.length} across draft courses; filter lessons by publicCourses.'
      );
    }
  }

  const devPath = path.join(rootDir, 'src/pages/development.astro');
  if (fs.existsSync(devPath)) {
    const src = fs.readFileSync(devPath, 'utf8');
    const compMatch = src.match(/const\s+COMPONENTS\s*=\s*\[([^\]]+)\]/);
    if (compMatch) {
      const tracked = new Set(
        [...compMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1])
      );
      const requiredActive = ['FillInExercise', 'SqlRunner', 'PracticeGenerator', 'Exercise', 'Problem', 'Figure', 'MathStatement'];
      const missing = requiredActive.filter((name) => !tracked.has(name));
      if (missing.length > 0) {
        errors.push(
          `[SITE-02] src/pages/development.astro: COMPONENTS coverage list omits active lesson components: ${missing.join(', ')}.`
        );
      }
    }
  }

  return errors;
}
