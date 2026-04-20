import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Common Markdown configuration for extreme performance
const markdownConfig = {
  remarkPlugins: [remarkMath],
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

// https://astro.build/config
export default defineConfig({
  base: '/',
  integrations: [
    tailwind(), 
    mdx(markdownConfig), // MDX will use the same optimized config
    react()
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
