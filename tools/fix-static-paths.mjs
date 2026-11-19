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

function appendHtmlBeforeSuffix(raw) {
  const hashIdx = raw.indexOf('#');
  const hash = hashIdx >= 0 ? raw.slice(hashIdx) : '';
  const beforeHash = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;

  const queryIdx = beforeHash.indexOf('?');
  const query = queryIdx >= 0 ? beforeHash.slice(queryIdx) : '';
  let cleanPath = queryIdx >= 0 ? beforeHash.slice(0, queryIdx) : beforeHash;

  if (cleanPath === '' || cleanPath === '/') {
    return `index.html${query}${hash}`;
  }
  if (!cleanPath.includes('.')) {
    cleanPath = cleanPath.endsWith('/') ? cleanPath.slice(0, -1) : cleanPath;
    if (cleanPath === '') return `index.html${query}${hash}`;
    cleanPath += '.html';
  }
  return `${cleanPath}${query}${hash}`;
}

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

      const newVal = attr === 'href' ? appendHtmlBeforeSuffix(val) : val;
      return `${attr}="${prefix}${newVal}"`;
    });

    content = content.replace(/href="\.\/([^"]*)"/g, (match, target) => {
      if (target.startsWith('http') || target.startsWith('//') || target.startsWith('#')) {
        return match;
      }

      return `href="./${appendHtmlBeforeSuffix(target)}"`;
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
