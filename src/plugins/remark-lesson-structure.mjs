const STATEMENT_KIND_MAP = {
  definition: 'definition',
  notation: 'definition',
  axiom: 'definition',
  theorem: 'theorem',
  lemma: 'theorem',
  proposition: 'theorem',
  corollary: 'theorem',
  invariant: 'invariant',
  property: 'invariant',
  rule: 'invariant',
  law: 'invariant',
  claim: 'theorem',
  warning: 'warning',
  pitfall: 'warning',
  caution: 'warning',
  example: 'example',
  remark: 'remark',
  note: 'remark',
  proof: 'proof',
  'proof idea': 'proof',
  'proof sketch': 'proof',
};

const LABEL_REGEX =
  /^(Definition|Notation|Axiom|Theorem|Lemma|Proposition|Corollary|Invariant|Property|Rule|Law|Claim|Warning|Pitfall|Caution|Example|Remark|Note|Proof(?:\s+idea|\s+sketch)?)(?:\s*\(([^)]+)\)|\s+([^.:]+))?\s*[.:]?$/i;

function extractPlainText(node) {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (Array.isArray(node.children)) {
    return node.children.map(extractPlainText).join('');
  }
  return '';
}

export function remarkLessonStructurePlugin() {
  return (tree, file) => {
    const filePath = String(file?.path ?? '');
    const isLessonFile = filePath.includes('/content/lessons/') || filePath.includes('\\content\\lessons\\');

    if (isLessonFile && Array.isArray(tree.children)) {
      // Strip top-level redundant H1 headings in lesson bodies (title is rendered from frontmatter)
      tree.children = tree.children.filter((node) => !(node.type === 'heading' && node.depth === 1));
    }

    const visit = (node) => {
      if (!node || !Array.isArray(node.children)) return;

      for (const child of node.children) {
        if (child.type === 'blockquote' && Array.isArray(child.children) && child.children.length > 0) {
          const firstBlock = child.children[0];
          if (
            firstBlock.type === 'paragraph' &&
            Array.isArray(firstBlock.children) &&
            firstBlock.children.length > 0 &&
            firstBlock.children[0].type === 'strong'
          ) {
            const strongNode = firstBlock.children[0];
            const rawStrongText = extractPlainText(strongNode).trim();
            const match = rawStrongText.match(LABEL_REGEX);
            if (match) {
              const rawKind = match[1].toLowerCase().replace(/\s+/g, ' ');
              const kind = STATEMENT_KIND_MAP[rawKind] || 'remark';
              const displayKind = match[1];
              const subTitle = (match[2] || match[3] || '').trim();

              // Clean leading punctuation (". " or ": ") from the text node immediately following strongNode
              const remainingInline = firstBlock.children.slice(1);
              if (remainingInline.length > 0 && remainingInline[0].type === 'text') {
                remainingInline[0].value = remainingInline[0].value.replace(/^\s*[.:—–-]?\s*/, '');
              }

              const bodyChildren = [];
              const hasRemainingFirstParagraph = remainingInline.some(
                (n) => n.type !== 'text' || n.value.trim().length > 0
              );
              if (hasRemainingFirstParagraph) {
                bodyChildren.push({
                  ...firstBlock,
                  children: remainingInline,
                });
              }
              bodyChildren.push(...child.children.slice(1));

              const headerChildren = [
                {
                  type: 'paragraph',
                  data: {
                    hName: 'span',
                    hProperties: { className: ['math-statement-kind'] },
                  },
                  children: [{ type: 'text', value: displayKind }],
                },
              ];

              if (subTitle) {
                headerChildren.push({
                  type: 'paragraph',
                  data: {
                    hName: 'span',
                    hProperties: { className: ['math-statement-title'] },
                  },
                  children: [{ type: 'text', value: subTitle }],
                });
              }

              child.data = {
                ...(child.data || {}),
                hName: 'aside',
                hProperties: {
                  className: ['math-statement', 'lu-statement', `lu-statement-${kind}`, 'not-prose'],
                  'data-statement-kind': kind,
                },
              };

              child.children = [
                {
                  type: 'blockquote',
                  data: {
                    hName: 'div',
                    hProperties: { className: ['math-statement-header'] },
                  },
                  children: [
                    {
                      type: 'paragraph',
                      data: {
                        hName: 'div',
                        hProperties: { className: ['math-statement-heading'] },
                      },
                      children: headerChildren,
                    },
                  ],
                },
                {
                  type: 'blockquote',
                  data: {
                    hName: 'div',
                    hProperties: {
                      className: ['math-statement-body', 'prose', 'dark:prose-invert', 'max-w-none'],
                    },
                  },
                  children: bodyChildren,
                },
              ];
              continue;
            }
          }
        }
        visit(child);
      }
    };

    visit(tree);
  };
}
