import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walk(filepath, callback);
        } else {
            callback(filepath);
        }
    });
}

console.log('Applying robust path fixes for offline support...');

walk(DIST_DIR, (filePath) => {
    const ext = path.extname(filePath);
    if (ext !== '.html' && ext !== '.css' && ext !== '.js') return;

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const folderPath = path.dirname(filePath);
    const relativeDepth = path.relative(folderPath, DIST_DIR).replace(/\\/g, '/');
    const prefix = relativeDepth === '' ? './' : relativeDepth + '/';

    if (ext === '.html') {
        // 1. Fix absolute paths (href, src, component-url, renderer-url, etc.)
        content = content.replace(/(href|src|component-url|renderer-url|data-image-src)="\/([^"]*)"/g, (match, attr, val) => {
            if (val.startsWith('http') || val.startsWith('//') || val.startsWith('#')) return match;
            
            let newVal = val;
            if (attr === 'href') {
                if (newVal === '' || newVal === '/') {
                    newVal = 'index.html';
                } else if (!newVal.includes('.') && !newVal.startsWith('#')) {
                    // Remove trailing slash if any, then add .html
                    newVal = newVal.endsWith('/') ? newVal.slice(0, -1) : newVal;
                    newVal += '.html';
                }
            }
            return `${attr}="${prefix}${newVal}"`;
        });

        // 2. Fix links that are already relative but missing .html (e.g. from Astro components)
        // This handles cases like href="./courses/python"
        content = content.replace(/href="\.\/([^"]*)"/g, (match, p1) => {
            if (p1.startsWith('http') || p1.startsWith('//') || p1.startsWith('#') || p1.includes('.')) return match;
            let newVal = p1.endsWith('/') ? p1.slice(0, -1) : p1;
            if (newVal === '') return 'href="./index.html"';
            return `href="./${newVal}.html"`;
        });

        // 3. Fix baseUrl in hydration props and script tags
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

console.log('Fixed paths and extensions in dist/');
