#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { getBlockById } from '../src/utils/statementRegistry.mjs';
import { loadCourseStructure } from '../src/lib/courseStructure.mjs';
import { lintMdxSourceContent } from './lib/mdx_lint_rules.mjs';

const ROOT = process.cwd();
const LESSONS_DIR = path.join(ROOT, 'src/content/lessons');
const COMPONENTS_DIR = path.join(ROOT, 'src/components');
const FIGURES_DIR = path.join(ROOT, 'src/figures');

function walkFiles(dir, exts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results.sort();
}

function stripFencedCode(body) {
  return body
    .replace(/^```[\s\S]*?^```/gm, (match) => '\n'.repeat(match.split('\n').length - 1))
    .replace(/\{`[\s\S]*?`\}/g, (match) => '\n'.repeat(match.split('\n').length - 1));
}

const INTERACTIVE_TAGS = [
  '<Quiz',
  '<CaseStudy',
  '<CodeExercise',
  '<FillInExercise',
  '<CodeRunner',
  '<SqlRunner',
  'Playground',
];

function isCodeAllComments(code) {
  if (!code || typeof code !== 'string') return true;
  const lines = code.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return true;
  let inBlock = false;
  for (const line of lines) {
    if (inBlock) {
      if (line.includes('*/') || line.includes('-->')) inBlock = false;
      continue;
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlock = true;
      continue;
    }
    if (line.startsWith('<!--')) {
      if (!line.includes('-->')) inBlock = true;
      continue;
    }
    if (
      line.startsWith('#') ||
      line.startsWith('//') ||
      line.startsWith('--') ||
      line.startsWith(';') ||
      line.startsWith('%') ||
      line.startsWith('*')
    ) {
      continue;
    }
    return false;
  }
  return true;
}

const BANNED_COMPONENT_PATTERNS = [
  { pattern: /libreuni:exam-review/, reason: 'Hallucinated exam-review event bus is forbidden (D-0005)' },
  { pattern: /toggle-solutions-btn/, reason: 'Global reveal-all button is forbidden (D-0005)' },
  { pattern: /Quick review:\s*(Reveal|View)/i, reason: 'One-click reveal bypass button is forbidden (D-0005)' },
  { pattern: /Skip retrieval/i, reason: 'Skip-retrieval button is forbidden (D-0005)' },
  { pattern: /\brounded-3xl\b/, reason: 'Arcade rounded-3xl token is forbidden in components; use .lu-card-tier* (rounded-xl)' },
  { pattern: /\brounded-\[2rem\]/, reason: 'Oversized rounded-[2rem] token is forbidden in components; use .lu-card-tier* (rounded-xl)' },
  { pattern: /\bhover:scale-105\b/, reason: 'Arcade hover:scale-105 button animation is forbidden in components' },
];

const errors = [];
const warnings = [];
const assessmentsByLesson = new Map();

// Index all defined figures under src/figures/<course>/<id>.mjs
const definedFiguresByCourse = new Map();
const figureFiles = walkFiles(FIGURES_DIR, ['.mjs']);
for (const figPath of figureFiles) {
  const relFig = path.relative(FIGURES_DIR, figPath);
  const parts = relFig.split(path.sep);
  if (parts.length === 2) {
    const cId = parts[0];
    const figId = parts[1].replace(/\.mjs$/, '');
    if (!definedFiguresByCourse.has(cId)) definedFiguresByCourse.set(cId, new Set());
    definedFiguresByCourse.get(cId).add(figId);
  }
}
const usedFigureIdsByCourse = new Map();

// 1. Audit all lesson MDX files
const lessonFiles = walkFiles(LESSONS_DIR, ['.mdx', '.md']);
for (const file of lessonFiles) {
  const rel = path.relative(ROOT, file);
  const raw = fs.readFileSync(file, 'utf-8');
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!fmMatch) {
    errors.push(`[LINT-00] ${rel}: Missing YAML frontmatter block.`);
    continue;
  }

  let fm;
  try {
    fm = YAML.parse(fmMatch[1]) || {};
  } catch (err) {
    errors.push(`[LINT-00] ${rel}: Invalid YAML frontmatter (${err.message}).`);
    continue;
  }

  const kind = fm.kind || 'lesson';
  if (!['lesson', 'lab', 'problems', 'recap', 'practice'].includes(kind)) {
    errors.push(`[LINT-00] ${rel}: Invalid kind '${kind}'.`);
  }

  for (const field of ['title', 'course', 'description']) {
    if (typeof fm[field] !== 'string' || fm[field].trim().length < 3) {
      errors.push(`[LINT-00] ${rel}: Missing or empty required frontmatter field '${field}'.`);
    }
  }
  if (typeof fm.estimatedMinutes !== 'number' || fm.estimatedMinutes <= 0) {
    errors.push(`[LINT-00] ${rel}: Frontmatter 'estimatedMinutes' must be a positive integer.`);
  }

  if (kind === 'lesson' || kind === 'lab') {
    if (typeof fm.assessment !== 'string' || fm.assessment.trim().length < 3) {
      errors.push(`[LINT-00] ${rel}: Missing or empty required frontmatter field 'assessment'.`);
    }
    for (const listField of ['prerequisites', 'outcomes', 'omissions']) {
      if (!Array.isArray(fm[listField]) || fm[listField].length === 0) {
        errors.push(`[LINT-00] ${rel}: Frontmatter list '${listField}' must be a non-empty array.`);
      }
    }
  } else if (kind === 'problems') {
    if (!Array.isArray(fm.covers) || fm.covers.length === 0) {
      errors.push(`[LINT-00] ${rel}: Frontmatter list 'covers' must be a non-empty array for kind 'problems'.`);
    }
    if (!Array.isArray(fm.outcomes) || fm.outcomes.length === 0) {
      errors.push(`[LINT-00] ${rel}: Frontmatter list 'outcomes' must be a non-empty array for kind 'problems'.`);
    }
  } else if (kind === 'recap') {
    if (!Array.isArray(fm.covers) || fm.covers.length === 0) {
      errors.push(`[LINT-00] ${rel}: Frontmatter list 'covers' must be a non-empty array for kind 'recap'.`);
    }
  } else if (kind === 'practice') {
    if (!Array.isArray(fm.covers) || fm.covers.length === 0) {
      errors.push(`[LINT-00] ${rel}: Frontmatter list 'covers' must be a non-empty array for kind 'practice'.`);
    }
  }

  const body = raw.slice(fmMatch[0].length);
  const bodyStartLine = fmMatch[0].split(/\r?\n/).length;
  errors.push(
    ...lintMdxSourceContent({
      relPath: rel,
      body,
      frontmatter: fm,
      bodyStartLine,
    })
  );
  const codeFreeBody = stripFencedCode(body);
  const lines = codeFreeBody.split(/\r?\n/);

  // LINT-09: Ban function graphs in TikZ (both prop and children syntaxes)
  const tikzSources = [
    ...[...body.matchAll(/<TikZ\b[^>]*\bcode=\{\s*(?:String\.raw)?`([\s\S]*?)`\s*\}/g)].map((m) => m[1]),
    ...[...body.matchAll(/<TikZ\b[^>]*\bcode=["']([\s\S]*?)["']/g)].map((m) => m[1]),
    ...[...body.matchAll(/<TikZ\b[^>]*>([\s\S]*?)<\/TikZ>/g)].map((m) => m[1]),
  ];
  for (const tikzCode of tikzSources) {
    if (
      /\bplot\b/.test(tikzCode) ||
      /\bcontrols\b/.test(tikzCode) ||
      (/\baxis\b/.test(tikzCode) && /\bcoordinates\b/.test(tikzCode))
    ) {
      errors.push(`[LINT-09] ${rel}: <TikZ> contains function graph code (plot/controls/coordinates). Function graphs must use <Figure>.`);
    }
  }

  // LINT-10: MathStatement only on lesson or lab
  if (kind !== 'lesson' && kind !== 'lab') {
    if (/<MathStatement\b/.test(codeFreeBody)) {
      errors.push(`[LINT-10] ${rel}: <MathStatement> is forbidden on pages of kind '${kind}'. Only 'lesson' and 'lab' pages may declare statements; use <Ref> instead.`);
    }
  }

  let seenProseOrHeading = false;
  const importedSymbols = new Set();
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('{/*')) return;

    if (/^import\s+/.test(trimmed)) {
      if (seenProseOrHeading) {
        errors.push(`[LINT-02] ${rel} (body line ${lineNum}): 'import' statement appears after heading or prose.`);
      }
      const symMatch = trimmed.match(/^import\s+([A-Za-z0-9_{},\s*]+)\s+from\s+/);
      if (symMatch) {
        const sym = symMatch[1].trim();
        if (importedSymbols.has(sym)) {
          errors.push(`[LINT-02] ${rel} (body line ${lineNum}): Duplicate import for '${sym}'.`);
        }
        importedSymbols.add(sym);
      }
      return;
    }

    seenProseOrHeading = true;

    if (/^#\s+/.test(line)) {
      errors.push(`[LINT-03] ${rel} (body line ${lineNum}): Redundant top-level '# H1' heading in MDX body; title comes from frontmatter.`);
    }
    if (/^---\s*$/.test(line)) {
      errors.push(`[LINT-03] ${rel} (body line ${lineNum}): Markdown horizontal rule '---' is forbidden in lesson body.`);
    }
    if (/<details\b/i.test(line) || /<summary\b/i.test(line)) {
      errors.push(`[LINT-01] ${rel} (body line ${lineNum}): Raw <details>/<summary> is forbidden; use <ExerciseSolution> or <MathProof>.`);
    }
    if (/<MathStatement\b[^>]*\bnumber=(?:["'][^"']+["']|\{\s*[^}]+\s*\})/.test(line)) {
      errors.push(`[LINT-06] ${rel} (body line ${lineNum}): Hardcoded number prop on <MathStatement> is forbidden (D-0013); numbers are generated dynamically.`);
    }
    if (/<(Exercise|Problem|Figure)\b[^>]*\bnumber=(?:["'][^"']+["']|\{\s*[^}]+\s*\})/.test(line)) {
      errors.push(`[LINT-08] ${rel} (body line ${lineNum}): Hardcoded number prop on <Exercise>, <Problem>, or <Figure> is forbidden (D-0013); numbers are generated dynamically.`);
    }

    const refMatches = line.matchAll(/<Ref\s+[^>]*\bid=["']([^"']+)["']/g);
    for (const refMatch of refMatches) {
      const refId = refMatch[1].trim();
      if (!getBlockById(refId)) {
        errors.push(`[LINT-07] ${rel} (body line ${lineNum}): Unresolved <Ref id="${refId}"> (block does not exist in registry).`);
      }
    }

    // LINT-11: Figure id resolution
    const figMatches = line.matchAll(/<Figure\s+[^>]*\bid=["']([^"']+)["']/g);
    for (const figMatch of figMatches) {
      const figId = figMatch[1].trim();
      const courseFigs = definedFiguresByCourse.get(fm.course);
      if (!courseFigs || !courseFigs.has(figId)) {
        errors.push(`[LINT-11] ${rel} (body line ${lineNum}): Unresolved <Figure id="${figId}"> (spec does not exist under src/figures/${fm.course}/).`);
      }
      if (!usedFigureIdsByCourse.has(fm.course)) usedFigureIdsByCourse.set(fm.course, new Set());
      usedFigureIdsByCourse.get(fm.course).add(figId);
    }

    // LINT-13: Forbid <Ref or JSX component tags inside string attributes like hint="..."
    const attrComponentMatch = line.match(/\b(hint|title|hintTitle|explanation|question)=["'][^"']*?<(Ref|Figure|MathStatement)\b[^"']*?["']/);
    if (attrComponentMatch) {
      errors.push(`[LINT-13] ${rel} (body line ${lineNum}): JSX tag <${attrComponentMatch[2]}> inside string attribute '${attrComponentMatch[1]}="..."' will render as escaped literal text; use a named slot (e.g. <p slot="hint">...</p>) or plain text.`);
    }

    // LINT-15: Forbid leaked editorial/internal notes in visible prose
    if (/\(In book\/PDF output\b/i.test(line) || /\bAll inputs:\s*define\b/i.test(line)) {
      errors.push(`[LINT-15] ${rel} (body line ${lineNum}): Leaked internal editorial/prompt note in visible lesson prose.`);
    }
  });

  // LINT-14: Forbid unescaped single-backslash LaTeX commands inside JS string literals in options={[...]}
  const optionsExprMatches = codeFreeBody.matchAll(/\boptions=\{\[([\s\S]*?)\]\}/g);
  for (const om of optionsExprMatches) {
    const block = om[1];
    const strMatches = block.matchAll(/(?:text|explanation|label):\s*('(?:\\'|[^'])*'|"(?:\\"|[^"])*")/g);
    for (const sm of strMatches) {
      const strLit = sm[1];
      const badEscapes = [...strLit.matchAll(/(?<!\\)\\([a-zA-Z{}[\]]+)/g)]
        .map((m) => `\\${m[1]}`)
        .filter((esc) => !["\\'", '\\"', '\\n', '\\t'].includes(esc));
      if (badEscapes.length > 0) {
        errors.push(`[LINT-14] ${rel}: Unescaped single-backslash LaTeX command(s) (${badEscapes.join(', ')}) inside JS string literal in options={[...]}; double-escape as \\\\ in JS expressions.`);
      }
    }
  }

  if (kind === 'lesson' || kind === 'lab') {
    const hasInteractive = INTERACTIVE_TAGS.some((tag) => codeFreeBody.includes(tag));
    if (!hasInteractive) {
      errors.push(`[LINT-04] ${rel}: Lesson has 0 interactive components (Quiz, CaseStudy, CodeExercise, CodeRunner, SqlRunner, or Playground).`);
    }

    if (!codeFreeBody.includes('<ExerciseSolution')) {
      errors.push(`[LINT-04] ${rel}: Lesson has 0 <ExerciseSolution> self-check exercises.`);
    }
  }

  // LINT-12: CodeExercise with all-comment code is forbidden
  const codeExerciseMatches = body.matchAll(/<CodeExercise\b([\s\S]*?)\/>/g);
  for (const match of codeExerciseMatches) {
    const block = match[1];
    const codeMatch = block.match(/\bcode=\{?(?:String\.raw)?`([\s\S]*?)`\}?|\bcode=\{['"]([\s\S]*?)['"]\}/);
    if (codeMatch) {
      const rawCode = codeMatch[1] ?? codeMatch[2] ?? '';
      if (isCodeAllComments(rawCode)) {
        errors.push(`[LINT-12] ${rel}: <CodeExercise> anti-pattern: 'code' consists entirely of comments. Use <FillInExercise> for non-code fill-in practice instead.`);
      }
    }
  }

  // Record assessments for exercise-pattern auditing
  const lessonAssessments = [];
  const quizMatches = body.matchAll(/<Quiz\b([\s\S]*?)\/>/g);
  for (const qm of quizMatches) {
    const block = qm[1];
    const objMatches = [...block.matchAll(/\{\s*id:\s*['"][^'"]+['"],\s*text:\s*(?:['"]([^'"]+)['"]|`([^`]+)`)[^}]*?isCorrect:\s*(true|false)/g)];
    let options = [];
    if (objMatches.length >= 2) {
      options = objMatches.map((m) => ({
        text: m[1] || m[2] || '',
        isCorrect: m[3] === 'true',
      }));
    } else {
      const strArrMatch = block.match(/\boptions\s*=\s*\{\s*(\[[^\]]*?\])\s*\}/);
      const idxMatch = block.match(/\b(?:correctIndex|answer)\s*=\s*\{(\d+)\}/);
      if (strArrMatch && idxMatch) {
        try {
          const arr = JSON.parse(strArrMatch[1].replace(/'/g, '"'));
          const cIdx = parseInt(idxMatch[1], 10);
          options = arr.map((opt, i) => ({ text: opt, isCorrect: i === cIdx }));
        } catch {}
      }
    }

    if (options.length >= 2) {
      const corrects = options.filter((o) => o.isCorrect);
      const distractors = options.filter((o) => !o.isCorrect);
      if (corrects.length > 0 && distractors.length > 0) {
        const correctLens = corrects.map((o) => o.text.trim().split(/\s+/).filter(Boolean).length);
        const distractorLens = distractors.map((o) => o.text.trim().split(/\s+/).filter(Boolean).length);
        const maxDistractor = Math.max(...distractorLens);
        const maxCorrect = Math.max(...correctLens);
        const isLengthCue = correctLens.some((l) => l >= maxDistractor * 1.5 && l - maxDistractor >= 3);
        lessonAssessments.push({
          component: 'Quiz',
          isSingleCorrect: corrects.length === 1,
          isLengthCue,
          correctWords: maxCorrect,
          distractorMaxWords: maxDistractor,
        });
      }
    }
  }
  const lessonSlug = path.basename(file, path.extname(file));
  assessmentsByLesson.set(`${fm.course}/${lessonSlug}`, lessonAssessments);
}

// LINT-11: Check for unused figure specs
for (const [courseId, defSet] of definedFiguresByCourse.entries()) {
  const usedSet = usedFigureIdsByCourse.get(courseId) || new Set();
  for (const defId of defSet) {
    if (!usedSet.has(defId)) {
      errors.push(`[LINT-11] src/figures/${courseId}/${defId}.mjs: Unused figure spec (never referenced by any <Figure id="${defId}"> in course ${courseId}).`);
    }
  }
}

// 2. Audit all component files for banned design tokens & anti-features
const componentFiles = walkFiles(COMPONENTS_DIR, ['.astro', '.tsx']);
for (const file of componentFiles) {
  const rel = path.relative(ROOT, file);
  const raw = fs.readFileSync(file, 'utf-8');
  for (const rule of BANNED_COMPONENT_PATTERNS) {
    if (rule.pattern.test(raw)) {
      errors.push(`[LINT-05] ${rel}: ${rule.reason}`);
    }
  }
}

// 3. Evaluate exercise type and distractor anti-patterns across modules
const activeCourses = ['calculus-intro', 'computer-architecture', 'operating-systems', 'database-systems'];
for (const courseId of activeCourses) {
  let structure;
  try {
    structure = loadCourseStructure(courseId, { root: ROOT });
  } catch {
    continue;
  }
  for (const mod of structure.modules) {
    const modLessons = mod.pages.map((p) => assessmentsByLesson.get(`${courseId}/${p.slug}`) || []);
    const modAssessments = modLessons.flat();
    const modMC = modAssessments.filter((a) => a.component === 'Quiz');
    const singleCorrectCount = modMC.filter((a) => a.isSingleCorrect).length;
    const lengthCueCount = modAssessments.filter((a) => a.isLengthCue).length;

    if (modMC.length >= 3 && singleCorrectCount / modMC.length >= 0.8) {
      warnings.push(
        `[WARN-EXERCISE-TYPE] ${courseId} / Module '${mod.title}': ${singleCorrectCount}/${modMC.length} multiple-choice exercises have only one correct answer (suggests wrong exercise type choice; consider multi-claim evaluation or FillInExercise).`
      );
    }
    if (
      modAssessments.length >= 2 &&
      lengthCueCount >= 2 &&
      (lengthCueCount / modAssessments.length >= 0.4 || lengthCueCount >= 3)
    ) {
      warnings.push(
        `[WARN-LENGTH-CUE] ${courseId} / Module '${mod.title}': ${lengthCueCount}/${modAssessments.length} exercises have conspicuously longest correct answers (suggests answer-length cueing anti-pattern).`
      );
    }
  }
}

if (warnings.length > 0) {
  console.warn(`\n⚠️  Platform Consistency Linter reported ${warnings.length} exercise pattern warning(s):\n`);
  for (const warn of warnings) {
    console.warn(`  • ${warn}`);
  }
}

if (errors.length > 0) {
  console.error(`\n❌ Platform Consistency Linter found ${errors.length} violation(s):\n`);
  for (const err of errors.slice(0, 80)) {
    console.error(`  • ${err}`);
  }
  if (errors.length > 80) {
    console.error(`  ... and ${errors.length - 80} more violation(s).`);
  }
  process.exit(1);
} else {
  console.log(
    `✅ Platform Consistency Linter passed (${lessonFiles.length} lessons, ${componentFiles.length} components verified).`
  );
}
