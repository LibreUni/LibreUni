import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';
import fs from 'node:fs';
import path from 'node:path';
import { remarkLessonStructurePlugin } from './src/plugins/remark-lesson-structure.mjs';

function checkPythonDiagramErrors() {
  const errorLogs = [
    'python-diagram-errors.log',
    'puml-errors.log',
    'tikz-errors.log',
  ].map((file) => path.resolve(`./${file}`));

  return {
    name: 'check-python-diagram-errors',
    hooks: {
      'astro:build:start': () => {
        for (const errorLog of errorLogs) {
          if (fs.existsSync(errorLog)) fs.unlinkSync(errorLog);
        }
      },
      'astro:build:done': () => {
        const failures = errorLogs
          .filter((errorLog) => fs.existsSync(errorLog))
          .map((errorLog) => ({
            name: path.basename(errorLog),
            text: fs.readFileSync(errorLog, 'utf-8'),
          }));
        if (failures.length) {
          for (const failure of failures) {
            console.error(`\\n\\x1b[31m❌ ${failure.name} errors found during build:\\x1b[0m\\n`);
            console.error(failure.text);
          }
          throw new Error('Diagram build failed. See renderer logs above.');
        }
      }
    }
  };
}

// Common Markdown configuration for extreme performance
const markdownProcessor = unified({
  remarkPlugins: [remarkMath, validateMathPlugin, remarkLessonStructurePlugin],
  rehypePlugins: [
    [rehypeKatex, { 
      output: 'htmlAndMathml',
      strict: false     // Skips some checks for speed
    }],
    glueInlinePunctuationRehypePlugin,
  ],
});

const shikiConfig = {
  theme: 'css-variables', // Drastically reduces HTML size by using classes instead of inline styles
  langs: [
    'c', 'cpp', 'python', 'java', 'javascript', 'typescript',
    'bash', 'cmake', 'plaintext', 'yaml', 'json'
  ],
  wrap: true,
};

// Do not allow malformed TeX to silently become visible source text. The
// normal KaTeX integration is intentionally lenient for unrelated Markdown;
// course math is content and must fail the build when it is invalid.
function validateMathPlugin() {
  return (tree, file) => {
    const rawSource = typeof file?.value === 'string' ? file.value : '';
    const visit = (node, ancestors = []) => {
      if (node?.type === 'math' || node?.type === 'inlineMath') {
        const value = String(node.value ?? '');
        if (value.includes('$')) {
          throw new Error(`Invalid nested dollar delimiter in math at ${file.path}:${node.position?.start?.line ?? '?'}`);
        }
        const startOffset = node.position?.start?.offset;
        const endOffset = node.position?.end?.offset;
        const isDoubleDollarInline =
          node.type === 'inlineMath' &&
          typeof startOffset === 'number' &&
          typeof endOffset === 'number' &&
          (rawSource.slice(startOffset, startOffset + 2) === '$$' ||
            endOffset - startOffset >= value.length + 4);
        if (isDoubleDollarInline) {
          node.data = {
            ...(node.data ?? {}),
            hName: 'span',
            hProperties: {
              ...(node.data?.hProperties ?? {}),
              className: ['language-math', 'math-display'],
            },
          };
        }
        try {
          katex.renderToString(value, {
            displayMode: node.type === 'math' || isDoubleDollarInline,
            output: 'htmlAndMathml',
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

function getElementClasses(node) {
  if (!node || node.type !== 'element') return [];
  if (Array.isArray(node.properties?.className)) return node.properties.className;
  if (typeof node.properties?.className === 'string') return node.properties.className.split(/\s+/);
  return [];
}

function attachPunctuationToKatex(katexNode, openPunct, closePunct) {
  const katexHtml = (katexNode.children ?? []).find(
    (child) => getElementClasses(child).includes('katex-html')
  );
  if (!katexHtml || !Array.isArray(katexHtml.children)) return false;
  const bases = katexHtml.children.filter((child) => getElementClasses(child).includes('base'));
  if (!bases.length) return false;

  if (openPunct) {
    const firstBase = bases[0];
    firstBase.children = [
      {
        type: 'element',
        tagName: 'span',
        properties: {
          className: ['lu-math-punct'],
          style: 'font-family: var(--font-sans), sans-serif; font-size: 0.91em;',
        },
        children: [{ type: 'text', value: openPunct }],
      },
      ...(firstBase.children ?? []),
    ];
  }

  if (closePunct) {
    const lastBase = bases[bases.length - 1];
    lastBase.children = [
      ...(lastBase.children ?? []),
      {
        type: 'element',
        tagName: 'span',
        properties: {
          className: ['lu-math-punct'],
          style: 'font-family: var(--font-sans), sans-serif; font-size: 0.91em;',
        },
        children: [{ type: 'text', value: closePunct }],
      },
    ];
  }
  return true;
}

function glueInlinePunctuationRehypePlugin() {
  return (tree) => {
    const visit = (node) => {
      if (!node || !Array.isArray(node.children)) return;
      if (node.type === 'element' && (node.tagName === 'pre' || node.tagName === 'script' || node.tagName === 'style')) {
        return;
      }

      if (node.type === 'element' && getElementClasses(node).includes('katex-display')) {
        node.properties = {
          ...(node.properties ?? {}),
          tabIndex: 0,
        };
      }

      for (const child of node.children) {
        visit(child);
      }

      for (let i = 0; i < node.children.length; i++) {
        const current = node.children[i];
        const classes = getElementClasses(current);
        const isInlineKatex =
          current?.type === 'element' &&
          current.tagName === 'span' &&
          classes.includes('katex') &&
          !classes.includes('katex-display');
        const isRefOrMathComponent =
          current?.type === 'mdxJsxTextElement' && (current.name === 'Ref' || current.name === 'Math');

        if (!isInlineKatex && !isRefOrMathComponent) continue;

        let openPunct = '';
        const prev = i > 0 ? node.children[i - 1] : null;
        if (prev?.type === 'text' && typeof prev.value === 'string') {
          const openMatch = prev.value.match(/^([\s\S]*?(?:^|\s))([(\[“‘]+)$/);
          if (openMatch) {
            prev.value = openMatch[1];
            openPunct = openMatch[2];
          }
        }

        let closePunct = '';
        const next = i + 1 < node.children.length ? node.children[i + 1] : null;
        if (next?.type === 'text' && typeof next.value === 'string') {
          const closeMatch = next.value.match(/^([,.;:!?\)\]'”’]+)([\s\S]*)$/);
          if (closeMatch) {
            closePunct = closeMatch[1];
            next.value = closeMatch[2];
          }
        }

        if (!openPunct && !closePunct) continue;

        if (isInlineKatex && attachPunctuationToKatex(current, openPunct, closePunct)) {
          continue;
        }

        node.children[i] = {
          type: 'element',
          tagName: 'span',
          properties: { className: ['whitespace-nowrap'] },
          children: [
            ...(openPunct ? [{ type: 'text', value: openPunct }] : []),
            current,
            ...(closePunct ? [{ type: 'text', value: closePunct }] : []),
          ],
        };
      }
    };
    visit(tree);
  };
}

// https://astro.build/config
export default defineConfig({
  base: '/',
  integrations: [
    mdx(), // MDX inherits the shared Markdown processor below
    react(),
    checkPythonDiagramErrors()
  ],
  markdown: {
    processor: markdownProcessor,
    shikiConfig,
  },
  build: {
    assets: 'assets',
    format: 'file',
    concurrency: 40, // Kill it with metal (Aggressive parallel generation)
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['lucide-react']
    },
    build: {
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2000,
      assetsInlineLimit: 10000, // Inline small assets to reduce IO
    }
  }
});
