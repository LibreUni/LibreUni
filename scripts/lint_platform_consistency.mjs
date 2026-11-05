#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = process.cwd();
const LESSONS_DIR = path.join(ROOT, 'src/content/lessons');
const COMPONENTS_DIR = path.join(ROOT, 'src/components');

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
  '<CodeRunner',
  '<SqlRunner',
  'Playground',
];

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

  for (const field of ['title', 'course', 'description', 'assessment']) {
    if (typeof fm[field] !== 'string' || fm[field].trim().length < 3) {
      errors.push(`[LINT-00] ${rel}: Missing or empty required frontmatter field '${field}'.`);
    }
  }
  for (const listField of ['prerequisites', 'outcomes', 'omissions']) {
    if (!Array.isArray(fm[listField]) || fm[listField].length === 0) {
      errors.push(`[LINT-00] ${rel}: Frontmatter list '${listField}' must be a non-empty array.`);
    }
  }
  if (typeof fm.estimatedMinutes !== 'number' || fm.estimatedMinutes <= 0) {
    errors.push(`[LINT-00] ${rel}: Frontmatter 'estimatedMinutes' must be a positive integer.`);
  }

  const body = raw.slice(fmMatch[0].length);
  const codeFreeBody = stripFencedCode(body);
  const lines = codeFreeBody.split(/\r?\n/);

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
  });

  const hasInteractive = INTERACTIVE_TAGS.some((tag) => codeFreeBody.includes(tag));
  if (!hasInteractive) {
    errors.push(`[LINT-04] ${rel}: Lesson has 0 interactive components (Quiz, CaseStudy, CodeExercise, CodeRunner, SqlRunner, or Playground).`);
  }

  if (!codeFreeBody.includes('<ExerciseSolution')) {
    errors.push(`[LINT-04] ${rel}: Lesson has 0 <ExerciseSolution> self-check exercises.`);
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
