import fs from 'node:fs';
import path from 'node:path';

const distArg = process.argv[2];
const distDir = path.resolve(process.cwd(), distArg ?? 'dist');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;

  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      walk(filePath, callback);
      continue;
    }

    callback(filePath);
  }
}

console.log(`Applying robust path fixes in ${distDir}...`);

walk(distDir, (filePath) => {
  const ext = path.extname(filePath);
  if (!['.html', '.css', '.js'].includes(ext)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const folderPath = path.dirname(filePath);
  const relativeDepth = path.relative(folderPath, distDir).replace(/\\/g, '/');
  const prefix = relativeDepth === '' ? './' : `${relativeDepth}/`;

  if (ext === '.html') {
    content = content.replace(/(href|src|component-url|renderer-url|data-image-src)="\/([^"]*)"/g, (match, attr, val) => {
      if (val.startsWith('http') || val.startsWith('//') || val.startsWith('#')) {
        return match;
      }

      let newVal = val;
      if (attr === 'href') {
        if (newVal === '' || newVal === '/') {
          newVal = 'index.html';
        } else if (!newVal.includes('.') && !newVal.startsWith('#')) {
          newVal = newVal.endsWith('/') ? newVal.slice(0, -1) : newVal;
          newVal += '.html';
        }
      }

      return `${attr}="${prefix}${newVal}"`;
    });

    content = content.replace(/href="\.\/([^"]*)"/g, (match, target) => {
      if (target.startsWith('http') || target.startsWith('//') || target.startsWith('#') || target.includes('.')) {
        return match;
      }

      const normalizedTarget = target.endsWith('/') ? target.slice(0, -1) : target;
      if (normalizedTarget === '') {
        return 'href="./index.html"';
      }

      return `href="./${normalizedTarget}.html"`;
    });

    content = content.replace(/&quot;baseUrl&quot;:\[\d+,&quot;\/&quot;\]/g, `&quot;baseUrl&quot;:[0,&quot;${prefix}&quot;]`);
    content = content.replace(/"baseUrl":\[\d+,"\/"]/g, `"baseUrl":[0,"${prefix}"]`);
    content = content.replace(/const baseUrl = "\/";/g, `const baseUrl = "${prefix}";`);
  }

  if (ext === '.css') {
    content = content.replace(/url\(\/\/?assets\//g, `url(${prefix}assets/`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
  }
});

console.log('Static path fixes complete.');
