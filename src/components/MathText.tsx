import React from 'react';
import katex from 'katex';

interface MathTextProps {
  children: string;
  className?: string;
}

type TextPart = { type: 'text'; value: string } | { type: 'math'; value: string; display: boolean };

// Markdown/MDX cannot parse math delimiters inside string props. Keep the
// same delimiters usable there by rendering those strings on the React side.
function splitMath(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const delimiter = /(\$\$[\s\S]*?\$\$|(?<!\\)\$(?!\$)[\s\S]*?(?<!\\)\$(?!\$))/g;
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

export default function MathText({ children, className }: MathTextProps) {
  return (
    <span className={className}>
      {splitMath(children).map((part, index) => {
        if (part.type === 'text') {
          return <React.Fragment key={index}>{part.value}</React.Fragment>;
        }

        const html = katex.renderToString(part.value, {
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
