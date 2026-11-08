import fs from 'node:fs';
import path from 'node:path';
import katex from 'katex';
import { loadCourseStructure } from '../lib/courseStructure.mjs';

let cachedRegistry = null;

export const STATEMENT_KINDS = [
  'definition',
  'theorem',
  'lemma',
  'proposition',
  'corollary',
  'invariant',
  'example',
  'remark',
  'convention',
  'warning',
];

export const BLOCK_KINDS = [
  ...STATEMENT_KINDS,
  'exercise',
  'problem',
  'figure',
  'question',
];

export const KIND_DISPLAY_NAMES = {
  definition: 'Definition',
  theorem: 'Theorem',
  lemma: 'Lemma',
  proposition: 'Proposition',
  corollary: 'Corollary',
  invariant: 'Invariant',
  example: 'Example',
  remark: 'Remark',
  convention: 'Convention',
  warning: 'Warning',
  exercise: 'Exercise',
  problem: 'Problem',
  figure: 'Figure',
  question: 'Question',
};

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderPreviewHtml(raw) {
  if (!raw) return '';
  const clean = raw
    .replace(/^---[\s\S]*?---\s*/, '')
    .replace(/import\s+[\s\S]*?;\s*/g, '')
    .replace(/<[A-Z][A-Za-z0-9]*\b[\s\S]*?<\/[A-Z][A-Za-z0-9]*>/g, '')
    .replace(/<[A-Z][A-Za-z0-9]*\b[^>]*\/>/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();

  const paragraphs = clean.split(/\n\s*\n/).filter((p) => p.trim());
  let excerpt = paragraphs.slice(0, 2).join(' ').trim();
  if (excerpt.length > 320) {
    excerpt = excerpt.slice(0, 320).replace(/\s+\S*$/, '') + '…';
  }

  const parts = [];
  const mathRegex = /\$\$([\s\S]*?)\$\$|\$([^$]+?)\$/g;
  let lastIndex = 0;
  let match;

  while ((match = mathRegex.exec(excerpt)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeHtml(excerpt.slice(lastIndex, match.index)));
    }
    const tex = (match[1] || match[2]).trim();
    try {
      const rendered = katex.renderToString(tex, {
        displayMode: false,
        throwOnError: false,
      });
      parts.push(rendered);
    } catch {
      parts.push(escapeHtml(tex));
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < excerpt.length) {
    parts.push(escapeHtml(excerpt.slice(lastIndex)));
  }

  return parts.join('');
}

export function cleanPreviewText(text) {
  if (!text) return '';
  return text
    .replace(/^---[\s\S]*?---\s*/, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/\\left|\\right/g, '')
    .replace(/\\mathbb\{R\}/g, 'ℝ')
    .replace(/\\mathbb\{Q\}/g, 'ℚ')
    .replace(/\\mathbb\{Z\}/g, 'ℤ')
    .replace(/\\mathbb\{N\}/g, 'ℕ')
    .replace(/\\epsilon/g, 'ε')
    .replace(/\\delta/g, 'δ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\to/g, '→')
    .replace(/\\implies/g, '⟹')
    .replace(/\\subseteq/g, '⊆')
    .replace(/\\setminus/g, '∖')
    .replace(/\\forall/g, '∀')
    .replace(/\\exists/g, '∃')
    .replace(/\\in/g, '∈')
    .replace(/\\notin/g, '∉')
    .replace(/\\le\b/g, '≤')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\ne\b/g, '≠')
    .replace(/\\cdot/g, '·')
    .replace(/\\min\b/g, 'min')
    .replace(/\\max\b/g, 'max')
    .replace(/\\quad/g, ' ')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/_\{([^}]+)\}/g, '_$1')
    .replace(/\\lim_\{([^}]+)\}/g, 'lim($1)')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\$+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

export function buildStatementRegistry(customRoot) {
  const root = customRoot || process.cwd();
  const manifestDir = path.join(root, 'src/data/course-manifests');

  const registry = new Map();
  const byCourse = new Map();
  const statementsByCourse = new Map();

  if (!fs.existsSync(manifestDir)) {
    cachedRegistry = { registry, byCourse, statementsByCourse };
    return cachedRegistry;
  }

  const manifestFiles = fs.readdirSync(manifestDir)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .sort();

  for (const file of manifestFiles) {
    const courseId = path.basename(file, path.extname(file));
    let structure;
    try {
      structure = loadCourseStructure(courseId, { root });
    } catch {
      continue;
    }

    const courseBlocks = [];
    const courseStatements = [];

    for (const page of structure.pages) {
      const fullPath = path.isAbsolute(page.file) ? page.file : path.join(root, page.file);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf8');

      let statementItemIndex = 1;
      let exerciseItemIndex = 1;
      let problemItemIndex = 1;
      let figureItemIndex = 1;
      let questionItemIndex = 1;

      // 1. MathStatement
      const statementRegex = /<MathStatement\s+([^>]*?)>([\s\S]*?)<\/MathStatement>/g;
      let match;
      while ((match = statementRegex.exec(content)) !== null) {
        const rawAttrs = match[1];
        const rawBody = match[2];

        const idMatch = rawAttrs.match(/\bid=["']([^"']+)["']/);
        if (!idMatch) continue;
        const id = idMatch[1].trim();

        const kindMatch = rawAttrs.match(/\bkind=["']([^"']+)["']/);
        const kind = kindMatch ? kindMatch[1].trim().toLowerCase() : 'theorem';

        const titleMatch = rawAttrs.match(/\btitle=["']([^"']+)["']/);
        const title = titleMatch ? titleMatch[1].trim() : '';

        // Number: moduleIndex.sectionIndex.statementItemIndex
        const number = page.number
          ? `${page.number}.${statementItemIndex}`
          : `${page.moduleIndex || 1}.1.${statementItemIndex}`;

        const kindLabel = KIND_DISPLAY_NAMES[kind] || (kind.charAt(0).toUpperCase() + kind.slice(1));
        const preview = cleanPreviewText(rawBody);
        const previewHtml = renderPreviewHtml(rawBody);

        const record = {
          id,
          courseId,
          lessonSlug: page.slug,
          moduleIndex: page.moduleIndex,
          lessonIndex: page.number ? Number(page.number.split('.')[1]) : 1,
          itemIndex: statementItemIndex,
          number,
          kind,
          kindLabel,
          title,
          preview,
          previewHtml,
          url: `/lessons/${courseId}/${page.slug}#${id}`,
        };

        if (registry.has(id)) {
          const existing = registry.get(id);
          console.warn(`[StatementRegistry] Duplicate block id="${id}" in ${courseId}/${page.slug} and ${existing.courseId}/${existing.lessonSlug}`);
        }

        registry.set(id, record);
        courseBlocks.push(record);
        courseStatements.push(record);
        statementItemIndex++;
      }

      // 2. Exercise (<Exercise ...>...</Exercise>)
      const exerciseRegex = /<Exercise\s+([^>]*?)>([\s\S]*?)<\/Exercise>/g;
      while ((match = exerciseRegex.exec(content)) !== null) {
        const rawAttrs = match[1];
        const rawBody = match[2];

        const idMatch = rawAttrs.match(/\bid=["']([^"']+)["']/);
        if (!idMatch) continue;
        const id = idMatch[1].trim();

        const titleMatch = rawAttrs.match(/\btitle=["']([^"']+)["']/);
        const title = titleMatch ? titleMatch[1].trim() : '';

        const typeMatch = rawAttrs.match(/\btype=["']([^"']+)["']/);
        const type = typeMatch ? typeMatch[1].trim() : 'application';

        const levelMatch = rawAttrs.match(/\blevel=["']([^"']+)["']/);
        const level = levelMatch ? levelMatch[1].trim() : 'application';

        const number = page.number
          ? `${page.number}.${exerciseItemIndex}`
          : `${page.moduleIndex || 1}.1.${exerciseItemIndex}`;

        const record = {
          id,
          courseId,
          lessonSlug: page.slug,
          moduleIndex: page.moduleIndex,
          itemIndex: exerciseItemIndex,
          number,
          kind: 'exercise',
          kindLabel: 'Exercise',
          title,
          type,
          level,
          preview: cleanPreviewText(rawBody),
          previewHtml: renderPreviewHtml(rawBody),
          url: `/lessons/${courseId}/${page.slug}#${id}`,
        };

        if (registry.has(id)) {
          const existing = registry.get(id);
          console.warn(`[StatementRegistry] Duplicate block id="${id}" in ${courseId}/${page.slug} and ${existing.courseId}/${existing.lessonSlug}`);
        }

        registry.set(id, record);
        courseBlocks.push(record);
        exerciseItemIndex++;
      }

      // 3. Problem (<Problem ...>...</Problem>)
      const problemRegex = /<Problem\s+([^>]*?)>([\s\S]*?)<\/Problem>/g;
      while ((match = problemRegex.exec(content)) !== null) {
        const rawAttrs = match[1];
        const rawBody = match[2];

        const idMatch = rawAttrs.match(/\bid=["']([^"']+)["']/);
        if (!idMatch) continue;
        const id = idMatch[1].trim();

        const titleMatch = rawAttrs.match(/\btitle=["']([^"']+)["']/);
        const title = titleMatch ? titleMatch[1].trim() : '';

        const typeMatch = rawAttrs.match(/\btype=["']([^"']+)["']/);
        const type = typeMatch ? typeMatch[1].trim() : 'transfer';

        const levelMatch = rawAttrs.match(/\blevel=["']([^"']+)["']/);
        const level = levelMatch ? levelMatch[1].trim() : 'transfer';

        const number = `${page.moduleIndex}.P.${problemItemIndex}`;

        const record = {
          id,
          courseId,
          lessonSlug: page.slug,
          moduleIndex: page.moduleIndex,
          itemIndex: problemItemIndex,
          number,
          kind: 'problem',
          kindLabel: 'Problem',
          title,
          type,
          level,
          preview: cleanPreviewText(rawBody),
          previewHtml: renderPreviewHtml(rawBody),
          url: `/lessons/${courseId}/${page.slug}#${id}`,
        };

        if (registry.has(id)) {
          const existing = registry.get(id);
          console.warn(`[StatementRegistry] Duplicate block id="${id}" in ${courseId}/${page.slug} and ${existing.courseId}/${existing.lessonSlug}`);
        }

        registry.set(id, record);
        courseBlocks.push(record);
        problemItemIndex++;
      }

      // 4. Figure (<Figure ... /> or <Figure ...>)
      const figureRegex = /<Figure\s+([^>]*?)\/?>/g;
      while ((match = figureRegex.exec(content)) !== null) {
        const rawAttrs = match[1];

        const idMatch = rawAttrs.match(/\bid=["']([^"']+)["']/);
        if (!idMatch) continue;
        const id = idMatch[1].trim();

        let number;
        if (page.kind === 'lesson' || page.kind === 'lab') {
          number = `${page.number}.${figureItemIndex}`;
        } else if (page.kind === 'problems') {
          number = `${page.moduleIndex}.P.${figureItemIndex}`;
        } else if (page.kind === 'recap') {
          number = `${page.moduleIndex}.R.${figureItemIndex}`;
        } else {
          number = `${figureItemIndex}`;
        }

        const record = {
          id,
          courseId,
          lessonSlug: page.slug,
          moduleIndex: page.moduleIndex,
          itemIndex: figureItemIndex,
          number,
          kind: 'figure',
          kindLabel: 'Figure',
          title: `Figure ${number}`,
          preview: '',
          previewHtml: '',
          url: `/lessons/${courseId}/${page.slug}#${id}`,
        };

        if (registry.has(id)) {
          const existing = registry.get(id);
          if (existing.kind === 'figure') {
            // Re-use of existing figure (e.g. thumbnail in recap or collapsed hint in exercise)
            continue;
          }
          console.warn(`[StatementRegistry] Duplicate block id="${id}" in ${courseId}/${page.slug} and ${existing.courseId}/${existing.lessonSlug}`);
        }

        registry.set(id, record);
        courseBlocks.push(record);
        figureItemIndex++;
      }
    }

    byCourse.set(courseId, courseBlocks);
    statementsByCourse.set(courseId, courseStatements);
  }

  cachedRegistry = { registry, byCourse, statementsByCourse };
  return cachedRegistry;
}

export function getBlockById(id, customRoot) {
  if (!cachedRegistry) {
    buildStatementRegistry(customRoot);
  }
  return cachedRegistry.registry.get(id);
}

export function getStatementById(id, customRoot) {
  return getBlockById(id, customRoot);
}

export function getAllBlocks(customRoot) {
  if (!cachedRegistry) {
    buildStatementRegistry(customRoot);
  }
  return Array.from(cachedRegistry.registry.values());
}

export function getAllStatements(customRoot) {
  if (!cachedRegistry) {
    buildStatementRegistry(customRoot);
  }
  return Array.from(cachedRegistry.registry.values()).filter((item) =>
    STATEMENT_KINDS.includes(item.kind)
  );
}

export function getCourseBlocks(courseId, customRoot) {
  if (!cachedRegistry) {
    buildStatementRegistry(customRoot);
  }
  return cachedRegistry.byCourse.get(courseId) || [];
}

export function getCourseStatements(courseId, customRoot) {
  if (!cachedRegistry) {
    buildStatementRegistry(customRoot);
  }
  return cachedRegistry.statementsByCourse.get(courseId) || [];
}

export function clearRegistryCache() {
  cachedRegistry = null;
}
