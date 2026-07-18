import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist/lessons/data-structures');
const files = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith('.html')) files.push(target);
  }
}

walk(root);

const stripNonLessonText = (html) => html
  .replace(/<(script|style|pre|code|svg|details|annotation)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&(?:lt|gt|amp|quot|#\d+);/g, ' ');

const rawTex = /(?:\\(?:sum|frac|sqrt|Theta|Omega|Lambda|alpha|beta|ge|le|log|lfloor|rfloor)\b)|(?<!\\)\$(?!\$)/;
const failures = [];

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const visible = stripNonLessonText(html);
  if (rawTex.test(visible)) failures.push(`${file}: raw TeX leaked into visible lesson text`);
  if (/data-diagram-kind="(?:PlantUML|TikZ|Python)"[\s\S]*?(?:Diagram Rendering Error|TikZ Rendering Error|Python Diagram Error)/.test(html)) {
    failures.push(`${file}: diagram renderer emitted an error placeholder`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Rendered lesson validation passed for ${files.length} data-structures page(s).`);
