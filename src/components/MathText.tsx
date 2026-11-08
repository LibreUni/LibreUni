import React from 'react';
import katex from 'katex';

interface MathTextProps {
  children?: string;
  className?: string;
}

type TextPart = { type: 'text'; value: string } | { type: 'math'; value: string; display: boolean };

// Markdown/MDX cannot parse math delimiters inside string props. Keep the
// same delimiters usable there by rendering those strings on the React side.
function splitMath(text: string): TextPart[] {
  const parts: TextPart[] = [];
  // Match display math ($$...$$) or inline math ($...$) without crossing paragraph breaks (\n\n)
  const delimiter = /(\$\$[\s\S]*?\$\$|(?<!\\)\$(?!\$)(?:[^\$\n]|\n(?!\n))+?(?<!\\)\$(?!\$))/g;
  let lastIndex = 0;

  for (const match of text.matchAll(delimiter)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index).replace(/\\\$/g, '$') });
    }

    const raw = match[0];
    const display = raw.startsWith('$$');
    parts.push({
      type: 'math',
      value: raw.slice(display ? 2 : 1, display ? -2 : -1).trim(),
      display,
    });
    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex).replace(/\\\$/g, '$') });
  }

  return parts.length ? parts : [{ type: 'text', value: text }];
}

function renderFormattedText(text: string, partIndex: number): React.ReactNode {
  // Parse inline markdown (**bold**, *italic*, `code`, \n\n paragraph breaks, \n line breaks)
  const inlineMarkdownRegex = /(\*\*[^*\n]+?\*\*|(?<!\*)\*(?!\s)([^*\n]+?)(?<!\s)\*(?!\*)|`[^`\n]+?`|\n\n+|\n)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(inlineMarkdownRegex)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      elements.push(
        <React.Fragment key={`${partIndex}-${lastIndex}`}>
          {text.slice(lastIndex, index)}
        </React.Fragment>
      );
    }

    const raw = match[0];
    const key = `${partIndex}-${index}`;
    if (raw.startsWith('\n\n')) {
      elements.push(<span key={key} className="block h-3" aria-hidden="true" />);
    } else if (raw === '\n') {
      elements.push(<br key={key} />);
    } else if (raw.startsWith('**')) {
      elements.push(
        <strong key={key} className="font-bold text-light-text dark:text-dark-text">
          {raw.slice(2, -2)}
        </strong>
      );
    } else if (raw.startsWith('*')) {
      elements.push(
        <em key={key} className="italic">
          {raw.slice(1, -1)}
        </em>
      );
    } else if (raw.startsWith('`')) {
      elements.push(
        <code key={key} className="rounded bg-light-border/40 px-1 py-0.5 font-mono text-xs text-primary dark:bg-dark-border/40">
          {raw.slice(1, -1)}
        </code>
      );
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    elements.push(
      <React.Fragment key={`${partIndex}-${lastIndex}`}>
        {text.slice(lastIndex)}
      </React.Fragment>
    );
  }

  return elements.length ? <React.Fragment key={partIndex}>{elements}</React.Fragment> : null;
}

export default function MathText({ children = '', className }: MathTextProps) {
  return (
    <span className={className}>
      {splitMath(children).map((part, index) => {
        if (part.type === 'text') {
          return renderFormattedText(part.value, index);
        }

        // JSX string attributes preserve backslashes literally. Accept a
        // doubled slash before command names/delimiters as a forgiving authoring
        // form, while preserving `\\` followed by whitespace/newline for LaTeX
        // row breaks inside environments like \begin{cases}...\end{cases}.
        const mathValue = part.value.replace(/\\\\(?=[a-zA-Z{,;!|])/g, '\\');
        const html = katex.renderToString(mathValue, {
          displayMode: part.display,
          output: 'mathml',
          throwOnError: false,
        });

        return (
          <span
            key={index}
            className={part.display ? 'math-text-display' : 'math-text-inline'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}
