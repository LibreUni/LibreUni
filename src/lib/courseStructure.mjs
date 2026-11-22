import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const PAGE_KINDS = ['lesson', 'lab', 'problems', 'recap', 'practice'];
export const MODULE_KINDS = ['chapter', 'practice', 'reference'];
export const PROGRESS_PAGE_KINDS = ['lesson', 'lab', 'problems', 'practice'];

export const PAGE_ICONS = {
  lesson: 'BookOpen',
  lab: 'FlaskConical',
  problems: 'PencilRuler',
  recap: 'NotebookText',
  practice: 'Sparkles',
};

export const MODULE_ICONS = {
  chapter: 'BookOpen',
  practice: 'Sparkles',
  reference: 'Library',
};

export function loadCourseStructure(courseId, options = {}) {
  const root = options.root || process.cwd();
  const manifestDir = path.join(root, 'src/data/course-manifests');
  const lessonsDir = path.join(root, 'src/content/lessons', courseId);

  const ymlPath = path.join(manifestDir, `${courseId}.yml`);
  const yamlPath = path.join(manifestDir, `${courseId}.yaml`);
  const manifestPath = fs.existsSync(ymlPath) ? ymlPath : yamlPath;

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`[courseStructure] Manifest for course "${courseId}" not found at ${ymlPath}`);
  }

  const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  try {
    manifest = YAML.parse(manifestRaw) || {};
  } catch (err) {
    throw new Error(`[courseStructure] Failed to parse YAML in manifest for "${courseId}": ${err.message}`);
  }

  const rawModules = Array.isArray(manifest.modules) ? manifest.modules : [];
  let chapterCounter = 0;

  const modules = rawModules.map((mod, modIdx) => {
    const rawKind = mod.kind || 'chapter';
    if (!MODULE_KINDS.includes(rawKind)) {
      throw new Error(
        `[courseStructure] Course "${courseId}" module "${mod.title || modIdx}" has invalid kind "${rawKind}". Must be one of: ${MODULE_KINDS.join(', ')}`
      );
    }
    const moduleKind = rawKind;

    let moduleIndex = null;
    if (moduleKind === 'chapter') {
      chapterCounter += 1;
      moduleIndex = chapterCounter;
    }

    const rawLessons = Array.isArray(mod.lessons) ? mod.lessons : [];
    let sectionCounter = 0;

    const pages = rawLessons.map((lessonItem) => {
      const slug = typeof lessonItem === 'string' ? lessonItem : lessonItem?.slug;
      if (!slug) {
        throw new Error(`[courseStructure] Missing slug in module "${mod.title}" in course "${courseId}"`);
      }

      const candidateMdx = path.join(lessonsDir, `${slug}.mdx`);
      const candidateMd = path.join(lessonsDir, `${slug}.md`);
      let foundPath = null;
      let frontmatter = {};

      if (fs.existsSync(candidateMdx)) {
        foundPath = candidateMdx;
      } else if (fs.existsSync(candidateMd)) {
        foundPath = candidateMd;
      }

      if (foundPath) {
        const fileContent = fs.readFileSync(foundPath, 'utf8');
        const fmMatch = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (fmMatch) {
          try {
            frontmatter = YAML.parse(fmMatch[1]) || {};
          } catch (err) {
            console.warn(`[courseStructure] Warning: Failed parsing frontmatter in ${foundPath}: ${err.message}`);
          }
        }
      }

      const pageKind = frontmatter.kind || 'lesson';
      if (!PAGE_KINDS.includes(pageKind)) {
        throw new Error(
          `[courseStructure] Page "${slug}" in course "${courseId}" has invalid kind "${pageKind}". Must be one of: ${PAGE_KINDS.join(', ')}`
        );
      }

      // Validate module and page kind compatibility
      if (moduleKind === 'chapter' && pageKind === 'practice') {
        throw new Error(
          `[courseStructure] Chapter module "${mod.title}" in course "${courseId}" may not contain practice page "${slug}".`
        );
      }
      if (moduleKind === 'practice' && pageKind !== 'practice') {
        throw new Error(
          `[courseStructure] Practice module "${mod.title}" in course "${courseId}" may only contain practice pages, found "${slug}" of kind "${pageKind}".`
        );
      }
      if (moduleKind === 'reference' && pageKind !== 'recap') {
        throw new Error(
          `[courseStructure] Reference module "${mod.title}" in course "${courseId}" may only contain recap pages, found "${slug}" of kind "${pageKind}".`
        );
      }

      // Compute number and label
      let number = null;
      let label = '';

      if (moduleKind === 'chapter') {
        if (pageKind === 'lesson' || pageKind === 'lab') {
          sectionCounter += 1;
          number = `${moduleIndex}.${sectionCounter}`;
          label = `${moduleIndex}.${sectionCounter}`;
        } else if (pageKind === 'problems') {
          number = null;
          label = `${moduleIndex}.P`;
        } else if (pageKind === 'recap') {
          number = null;
          label = `${moduleIndex}.R`;
        }
      } else if (moduleKind === 'practice') {
        number = null;
        label = '';
      } else if (moduleKind === 'reference') {
        number = null;
        label = 'R';
      }

      const relFile = foundPath ? path.relative(root, foundPath) : path.join('src/content/lessons', courseId, `${slug}.mdx`);

      return {
        slug,
        kind: pageKind,
        label,
        number,
        file: relFile,
        frontmatter,
        courseId,
        moduleTitle: mod.title,
        moduleKind,
        moduleIndex,
      };
    });

    return {
      index: moduleIndex,
      kind: moduleKind,
      title: mod.title || '',
      question: mod.question,
      pages,
    };
  });

  const pages = modules.flatMap((m) => m.pages);

  return {
    courseId,
    manifest,
    modules,
    pages,
  };
}

export function loadAllCourseStructures(options = {}) {
  const root = options.root || process.cwd();
  const manifestDir = path.join(root, 'src/data/course-manifests');
  if (!fs.existsSync(manifestDir)) return [];

  const manifestFiles = fs.readdirSync(manifestDir)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .sort();

  return manifestFiles.map((file) => {
    const courseId = path.basename(file, path.extname(file));
    return loadCourseStructure(courseId, { root });
  });
}
