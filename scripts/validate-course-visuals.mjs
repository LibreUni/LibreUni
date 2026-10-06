import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const activeCourses = ['computer-architecture', 'operating-systems', 'database-systems'];
const failures = [];
const componentNames = new Set(['Quiz', 'CodeRunner', 'CodeExercise', 'CaseStudy', 'PlantUML', 'PythonDiagram', 'TikZ', 'Math', 'MathStatement', 'MathProof', 'ExerciseSolution', ...fs.readdirSync(path.join(root, 'src/components/playgrounds')).filter((name) => name.endsWith('.tsx')).map((name) => path.basename(name, '.tsx'))]);

for (const courseId of activeCourses) {
  const manifest = parseYaml(fs.readFileSync(path.join(root, `src/data/course-manifests/${courseId}.yml`), 'utf8'));
  const listed = new Set(manifest.modules.flatMap((module) => module.lessons));
  const lessonDir = path.join(root, 'src/content/lessons', courseId);
  const files = fs.readdirSync(lessonDir).filter((name) => /\.mdx?$/.test(name));
  for (const fileName of files) {
    const slug = fileName.replace(/\.mdx?$/, '');
    const source = fs.readFileSync(path.join(lessonDir, fileName), 'utf8');
    if (!listed.has(slug)) failures.push(`${courseId}/${fileName}: lesson is not listed by its manifest`);
    if (!/^# .+/m.test(source)) failures.push(`${courseId}/${fileName}: missing lesson h1`);
    for (const [, name, importPath] of source.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g)) {
      if (!importPath.includes('components/')) continue;
      const target = path.resolve(lessonDir, importPath);
      if (![target, ...['.astro', '.tsx', '.ts', '.jsx', '.js', '.mjs'].map(extension => target + extension)].some(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())) {
        failures.push(`${courseId}/${fileName}: imported component ${name} does not resolve at ${importPath}`);
      }
    }
    for (const match of source.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)) {
      const name = match[1];
      if (componentNames.has(name) && /Playground$|^(Quiz|CodeRunner|CodeExercise|CaseStudy)$/.test(name)) {
        const tail = source.slice(match.index, match.index + 500);
        if (!/client:load\b/.test(tail)) failures.push(`${courseId}/${fileName}: interactive ${name} must use client:load`);
      }
    }
    for (const block of source.matchAll(/<(?:PlantUML|PythonDiagram|TikZ)\b[\s\S]*?>/g)) {
      if (!/\bcode\s*=/.test(block[0]) || /code\s*=\{?\s*['"]?\s*['"]?\s*\}?\s*>$/.test(block[0])) failures.push(`${courseId}/${fileName}: rendered diagram has no non-empty code prop`);
    }
  }
  for (const slug of listed) if (!fs.existsSync(path.join(lessonDir, `${slug}.mdx`)) && !fs.existsSync(path.join(lessonDir, `${slug}.md`))) failures.push(`${courseId}/${slug}: manifest lesson source is missing`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Active course authoring validation passed for ${activeCourses.length} courses.`);
