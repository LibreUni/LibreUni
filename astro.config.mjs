import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';
import fs from 'node:fs';
import path from 'node:path';

function checkPythonDiagramErrors() {
  return {
    name: 'check-python-diagram-errors',
    hooks: {
      'astro:build:start': () => {
        const errorLog = path.resolve('./python-diagram-errors.log');
        if (fs.existsSync(errorLog)) fs.unlinkSync(errorLog);
      },
      'astro:build:done': () => {
        const errorLog = path.resolve('./python-diagram-errors.log');
        if (fs.existsSync(errorLog)) {
           const errStr = fs.readFileSync(errorLog, 'utf-8');
           console.error('\\n\\x1b[31m❌ Python Diagram Errors found during build:\\x1b[0m\\n');
           console.error(errStr);
           throw new Error('Python Diagram Build Failed. See logs above.');
        }
      }
    }
  };
}

// Common Markdown configuration for extreme performance
const markdownConfig = {
  remarkPlugins: [remarkMath, validateMathPlugin],
  rehypePlugins: [
    [rehypeKatex, { 
      output: 'mathml', // MUCH faster bundling due to smaller JS modules
      strict: false     // Skips some checks for speed
    }]
  ],
  shikiConfig: {
    theme: 'css-variables', // Drastically reduces HTML size by using classes instead of inline styles
    langs: [
      'c', 'cpp', 'python', 'java', 'javascript', 'typescript', 
      'bash', 'cmake', 'plaintext', 'yaml', 'json'
    ],
    wrap: true,
  },
};

// Do not allow malformed TeX to silently become visible source text. The
// normal KaTeX integration is intentionally lenient for unrelated Markdown;
// course math is content and must fail the build when it is invalid.
function validateMathPlugin() {
  return (tree, file) => {
    const visit = (node, ancestors = []) => {
      if (node?.type === 'math' || node?.type === 'inlineMath') {
        const value = String(node.value ?? '');
        if (value.includes('$')) {
          throw new Error(`Invalid nested dollar delimiter in math at ${file.path}:${node.position?.start?.line ?? '?'}`);
        }
        try {
          katex.renderToString(value, {
            displayMode: node.type === 'math',
            output: 'mathml',
            throwOnError: true,
            strict: 'error',
          });
        } catch (error) {
          throw new Error(`Invalid TeX at ${file.path}:${node.position?.start?.line ?? '?'}: ${error.message}`);
        }
      }
      for (const child of node?.children ?? []) visit(child, [...ancestors, node]);
    };
    visit(tree);
  };
}

// https://astro.build/config
export default defineConfig({
  base: '/',
  integrations: [
    tailwind(), 
    mdx(markdownConfig), // MDX will use the same optimized config
    react(),
    checkPythonDiagramErrors()
  ],
  markdown: markdownConfig,
  build: {
    assets: 'assets',
    format: 'file',
    concurrency: 40, // Kill it with metal (Aggressive parallel generation)
  },
  vite: {
    ssr: {
      noExternal: ['lucide-react', 'react-katex']
    },
    build: {
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2000,
      assetsInlineLimit: 10000, // Inline small assets to reduce IO
    }
  }
});
