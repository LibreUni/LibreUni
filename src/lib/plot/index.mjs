/**
 * Verified math figures plot core library.
 */

import katex from 'katex';
import { renderFigure, detectSvgTextCollisions } from './svg.mjs';
import { solve, argmax, argmin, secant, tangent, riemann, areaBetween } from './geometry.mjs';
import { createScale, getTicks, formatTick } from './scale.mjs';
import { sampleCurve } from './sample.mjs';

export function renderCaptionMath(text) {
  if (!text) return '';
  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // Match $$...$$ (display math) or $...$ (inline math)
  const tokenRegex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g;
  const parts = text.split(tokenRegex);

  return parts
    .map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
        const tex = part.slice(2, -2).trim();
        try {
          return katex.renderToString(tex, {
            displayMode: true,
            output: 'mathml',
            throwOnError: false,
          });
        } catch {
          return escapeHtml(part);
        }
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const tex = part.slice(1, -1).trim();
        try {
          return katex.renderToString(tex, {
            displayMode: false,
            output: 'mathml',
            throwOnError: false,
          });
        } catch {
          return escapeHtml(part);
        }
      }
      return escapeHtml(part);
    })
    .join('');
}

export function defineFigure(spec) {
  if (!spec) throw new Error('[defineFigure] spec must be an object');
  if (typeof spec.alt !== 'string' || spec.alt.trim().length < 40) {
    throw new Error(`[defineFigure] alt text must be at least 40 characters long for accessibility (got ${spec.alt?.length || 0})`);
  }
  if (typeof spec.caption !== 'string' || spec.caption.trim().length === 0) {
    throw new Error('[defineFigure] caption must be a non-empty string');
  }

  return {
    ...spec,
    checks: Array.isArray(spec.checks) ? spec.checks : [],
    curves: Array.isArray(spec.curves) ? spec.curves : [],
    marks: Array.isArray(spec.marks) ? spec.marks : [],
  };
}

export {
  renderFigure,
  detectSvgTextCollisions,
  solve,
  argmax,
  argmin,
  secant,
  tangent,
  riemann,
  areaBetween,
  createScale,
  getTicks,
  formatTick,
  sampleCurve,
};
