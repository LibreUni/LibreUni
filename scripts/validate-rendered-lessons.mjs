import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCourseStructure } from '../src/lib/courseStructure.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultActiveCourses = ['calculus-intro', 'computer-architecture', 'operating-systems', 'database-systems'];
const stripNonLessonText = (html) => html
  .replace(/<(script|style|pre|code|svg|annotation|template)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<(?:"[^"]*"|'[^']*'|[^>"'])*>/g, ' ')
  .replace(/&(?:lt|gt|amp|quot|#\d+);/g, ' ');
// A lone dollar before math syntax catches malformed delimiters too, while
// ordinary currency such as "$100" is allowed.
const rawTex = /\\(?:sum|frac|sqrt|Theta|Omega|Lambda|alpha|beta|ge|le|log|lfloor|rfloor)\b|(?<!\\)\$(?=[A-Za-z_\\[({])|(?<!\\)\$[^$\n]+(?<!\\)\$/;

export function validateRenderedLessons(root = defaultRoot, activeCourses = defaultActiveCourses) {
  const failures = [];
  const pages = [];
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
      if (!fs.existsSync(file)) { failures.push(`${file}: rendered active lesson page is missing`); continue; }
      if (fs.statSync(file).size === 0) { failures.push(`${file}: rendered active lesson page is empty`); continue; }
      pages.push(file);
      const html = fs.readFileSync(file, 'utf8');
      if (rawTex.test(stripNonLessonText(html))) failures.push(`${file}: raw TeX leaked into visible lesson text`);
      if (/(?:Diagram Rendering Error|TikZ Rendering Error|Python Diagram Error|PlantUML Rendering Error)/i.test(html)) failures.push(`${file}: diagram renderer emitted an error placeholder`);
    }
  }
  return { failures, pages };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { failures, pages } = validateRenderedLessons();
  if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
  console.log(`Rendered lesson validation passed for ${pages.length} active page(s).`);
}
