import katex from 'katex';

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPlainSegment(text) {
  const inlineMarkdownRegex = /(\*\*[^*\n]+?\*\*|(?<!\*)\*(?!\s)[^*\n]+?(?<!\s)\*(?!\*))/g;
  const parts = text.split(inlineMarkdownRegex);
  let html = '';

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      html += `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
    } else if (
      part.startsWith('*') &&
      part.endsWith('*') &&
      part.length > 2 &&
      !part.startsWith('* ') &&
      !part.endsWith(' *')
    ) {
      html += `<em>${escapeHtml(part.slice(1, -1))}</em>`;
    } else {
      html += escapeHtml(part);
    }
  }

  return html;
}

/**
 * Render inline backtick code, emphasis, and $...$ / $$...$$ KaTeX math into HTML.
 * Code spans are matched first so literal dollar signs inside code are preserved.
 */
export function renderInlineMarkdownMath(text, { throwOnError = true } = {}) {
  if (!text) return '';

  const tokenRegex = /(`[^`\n]+?`|\$\$[\s\S]+?\$\$|(?<!\\)\$(?:\\.|[^$\\\n])+?\$)/g;
  let html = '';
  let lastIndex = 0;

  for (const match of String(text).matchAll(tokenRegex)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      html += formatPlainSegment(text.slice(lastIndex, index));
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      html += `<code class="rounded bg-light-border/40 px-1 py-0.5 font-mono text-xs text-primary dark:bg-dark-border/40">${escapeHtml(token.slice(1, -1))}</code>`;
    } else if (token.startsWith('$$') && token.endsWith('$$') && token.length > 4) {
      const tex = token.slice(2, -2);
      html += katex.renderToString(tex, {
        displayMode: true,
        output: 'htmlAndMathml',
        throwOnError,
      });
    } else if (token.startsWith('$') && token.endsWith('$') && token.length > 2) {
      const tex = token.slice(1, -1);
      html += katex.renderToString(tex, {
        displayMode: false,
        output: 'htmlAndMathml',
        throwOnError,
      });
    } else {
      html += escapeHtml(token);
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    html += formatPlainSegment(text.slice(lastIndex));
  }

  return html;
}
