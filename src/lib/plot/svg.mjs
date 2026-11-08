/**
 * Build-time pure SVG renderer for math figures.
 */

import { createScale, getTicks, formatTick } from './scale.mjs';
import { sampleCurve } from './sample.mjs';
import { tangent, secant, riemann, areaBetween } from './geometry.mjs';

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderFigure(spec, options = {}) {
  const warnings = [];
  const width = options.width || 640;
  const height = options.height || 380;
  const margin = options.margin || { top: 24, right: 32, bottom: 36, left: 44 };

  // If spec has multiple panels
  if (Array.isArray(spec.panels) && spec.panels.length > 0) {
    const numPanels = spec.panels.length;
    const panelWidth = Math.floor(width / numPanels);
    let panelsSvg = '';

    spec.panels.forEach((panelSpec, idx) => {
      const panelOptions = {
        ...options,
        width: panelWidth,
        height,
        margin: { ...margin, left: idx === 0 ? margin.left : 32, right: idx === numPanels - 1 ? margin.right : 16 },
      };
      const rendered = renderSinglePanel(panelSpec, panelOptions, `panel-${idx}`);
      warnings.push(...rendered.warnings);
      panelsSvg += `<g transform="translate(${idx * panelWidth}, 0)">${rendered.innerSvg}</g>`;
    });

    const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${height}"
  class="lu-figure-svg w-full h-auto text-light-text dark:text-dark-text"
  role="img"
  aria-label="${escapeXml(spec.alt)}"
>
  <title>${escapeXml(spec.caption || spec.alt)}</title>
  <desc>${escapeXml(spec.alt)}</desc>
  ${panelsSvg}
</svg>`.trim();

    const collisions = detectSvgTextCollisions(svg);
    for (const c of collisions) {
      warnings.push(`Overlapping text in ${spec.id || 'figure'}: "${c.a}" overlaps with "${c.b}"`);
    }

    return { svg, warnings };
  }

  const rendered = renderSinglePanel(spec, { ...options, width, height, margin }, spec.id || 'fig');
  warnings.push(...rendered.warnings);

  const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${height}"
  class="lu-figure-svg w-full h-auto text-light-text dark:text-dark-text"
  role="img"
  aria-label="${escapeXml(spec.alt)}"
>
  <title>${escapeXml(spec.caption || spec.alt)}</title>
  <desc>${escapeXml(spec.alt)}</desc>
  ${rendered.innerSvg}
</svg>`.trim();

  const collisions = detectSvgTextCollisions(svg);
  for (const c of collisions) {
    warnings.push(`Overlapping text in ${spec.id || 'figure'}: "${c.a}" overlaps with "${c.b}"`);
  }

  return { svg, warnings };
}

function renderSinglePanel(spec, { width, height, margin }, panelId) {
  const warnings = [];
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const xDomain = spec.x || [-3, 3];
  let yDomain = spec.y;

  const curvesMap = new Map();
  if (Array.isArray(spec.curves)) {
    spec.curves.forEach((c) => {
      if (c.id) curvesMap.set(c.id, c);
    });
  }

  // Auto-calculate y domain if requested or missing
  if (!yDomain || yDomain === 'auto') {
    let minY = Infinity;
    let maxY = -Infinity;
    (spec.curves || []).forEach((c) => {
      const segs = sampleCurve(c.fn, c.domain || xDomain, { exclude: c.exclude, samples: 200 });
      segs.forEach((seg) => {
        seg.forEach((pt) => {
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        });
      });
    });

    if (minY === Infinity || maxY === -Infinity || minY === maxY) {
      minY = -1;
      maxY = 1;
    } else {
      const pad = (maxY - minY) * 0.15 || 0.5;
      minY -= pad;
      maxY += pad;
    }
    yDomain = [minY, maxY];
  }

  const xScale = createScale({
    domain: xDomain,
    range: [margin.left, width - margin.right],
  });

  const yScale = createScale({
    domain: yDomain,
    range: [height - margin.bottom, margin.top],
  });

  const xZeroIn = 0 >= xDomain[0] && 0 <= xDomain[1];
  const yZeroIn = 0 >= yDomain[0] && 0 <= yDomain[1];

  const yAxisX = xZeroIn ? xScale(0) : margin.left;
  const xAxisY = yZeroIn ? yScale(0) : height - margin.bottom;

  let elements = [];

  // 1. Grid lines (subtle)
  const xTicks = spec.xTicks || getTicks(xDomain, 5);
  const yTicks = spec.yTicks || getTicks(yDomain, 5);

  const gridLines = [];
  xTicks.forEach((xt) => {
    const px = xScale(xt);
    gridLines.push(
      `<line x1="${px}" y1="${margin.top}" x2="${px}" y2="${height - margin.bottom}" stroke="currentColor" stroke-opacity="0.06" stroke-width="1" />`
    );
  });
  yTicks.forEach((yt) => {
    const py = yScale(yt);
    gridLines.push(
      `<line x1="${margin.left}" y1="${py}" x2="${width - margin.right}" y2="${py}" stroke="currentColor" stroke-opacity="0.06" stroke-width="1" />`
    );
  });
  elements.push(`<g class="lu-fig-grid" aria-hidden="true">${gridLines.join('\n')}</g>`);

  // 2. Bands, Windows, Area, Riemann (Z-order: fills before curves)
  const fills = [];

  (spec.marks || []).forEach((mark) => {
    if (mark.type === 'band') {
      // Horizontal band from y0 to y1
      const y0 = Math.min(mark.from, mark.to);
      const y1 = Math.max(mark.from, mark.to);
      const pyTop = yScale(y1);
      const pyBottom = yScale(y0);
      const h = Math.abs(pyBottom - pyTop);
      fills.push(
        `<rect x="${margin.left}" y="${pyTop}" width="${plotWidth}" height="${h}" fill="currentColor" fill-opacity="0.08" class="lu-fig-band" />`
      );
    } else if (mark.type === 'window') {
      // Vertical window from x0 to x1
      const x0 = Math.min(mark.from, mark.to);
      const x1 = Math.max(mark.from, mark.to);
      const pxLeft = xScale(x0);
      const pxRight = xScale(x1);
      const w = Math.abs(pxRight - pxLeft);
      fills.push(
        `<rect x="${pxLeft}" y="${margin.top}" width="${w}" height="${plotHeight}" fill="currentColor" fill-opacity="0.08" class="lu-fig-window" />`
      );
    } else if (mark.type === 'area') {
      const curve = curvesMap.get(mark.curve) || curvesMap.values().next().value;
      if (curve) {
        const interval = [mark.from ?? xDomain[0], mark.to ?? xDomain[1]];
        const otherFn = mark.betweenCurve ? (curvesMap.get(mark.betweenCurve)?.fn || (() => 0)) : (() => 0);
        const { polygon } = areaBetween({ f1: curve.fn, f2: otherFn, interval, n: 120 });
        const ptsStr = polygon.map((p) => `${xScale(p.x).toFixed(1)},${yScale(p.y).toFixed(1)}`).join(' ');
        fills.push(
          `<polygon points="${ptsStr}" fill="currentColor" fill-opacity="0.18" class="lu-fig-area" />`
        );
      }
    } else if (mark.type === 'riemann') {
      const curve = curvesMap.get(mark.curve) || curvesMap.values().next().value;
      if (curve) {
        const interval = mark.interval || [mark.from ?? 0, mark.to ?? 1];
        const res = riemann({ fn: curve.fn, interval, n: mark.n || 4, rule: mark.rule || 'left' });
        res.rectangles.forEach((rect) => {
          const rx = xScale(rect.x0);
          const rw = xScale(rect.x1) - rx;
          const ryTop = yScale(Math.max(0, rect.y));
          const ryZero = yScale(0);
          const rh = Math.abs(yScale(rect.y) - ryZero);
          const fillOpacity = mark.rule === 'upper' ? '0.12' : '0.25';
          fills.push(
            `<rect x="${rx.toFixed(1)}" y="${ryTop.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="currentColor" fill-opacity="${fillOpacity}" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.5" class="lu-fig-riemann" />`
          );
        });
      }
    }
  });

  if (fills.length > 0) {
    elements.push(`<g class="lu-fig-fills" aria-hidden="true">${fills.join('\n')}</g>`);
  }

  // 3. Axes & Ticks
  const axes = [];
  // X axis line
  axes.push(
    `<line x1="${margin.left}" y1="${xAxisY}" x2="${width - margin.right}" y2="${xAxisY}" stroke="currentColor" stroke-width="1.5" class="lu-fig-axis-x" />`
  );
  // Y axis line
  axes.push(
    `<line x1="${yAxisX}" y1="${height - margin.bottom}" x2="${yAxisX}" y2="${margin.top}" stroke="currentColor" stroke-width="1.5" class="lu-fig-axis-y" />`
  );

  // Pre-process bottom vline marks with labels to detect overlaps and suppress duplicate axis tick labels
  const vlineMarks = (spec.marks || []).filter(
    (m) => m.type === 'vline' && m.label && (m.labelPos || 'bottom') === 'bottom'
  );
  vlineMarks.sort((a, b) => a.x - b.x);

  const vlineDyMap = new Map();
  for (let i = 0; i < vlineMarks.length; i++) {
    const vm = vlineMarks[i];
    if (vm.dy !== undefined) {
      vlineDyMap.set(vm, vm.dy);
    } else {
      let assignedDy = 0;
      if (i > 0) {
        const prev = vlineMarks[i - 1];
        const prevPx = xScale(prev.x);
        const currPx = xScale(vm.x);
        const prevDy = vlineDyMap.get(prev) || 0;
        if (Math.abs(currPx - prevPx) < 32 && prevDy === 0) {
          assignedDy = 18;
        }
      }
      vlineDyMap.set(vm, assignedDy);
    }
  }

  // Ticks and labels
  xTicks.forEach((xt) => {
    if (Math.abs(xt) < 1e-12 && xZeroIn && yZeroIn) return; // avoid duplicate zero label
    const px = xScale(xt);
    axes.push(
      `<line x1="${px}" y1="${xAxisY - 3}" x2="${px}" y2="${xAxisY + 3}" stroke="currentColor" stroke-width="1.2" />`
    );

    // Suppress tick label if a vline mark with label sits close to this tick
    const hasMatchingVline = vlineMarks.some((vm) => {
      const vPx = xScale(vm.x);
      return Math.abs(vPx - px) < 16;
    });

    if (!hasMatchingVline) {
      const labelY = xAxisY + 16;
      let anchor = 'middle';
      let textPx = px;
      // If tick is at left margin boundary and y-axis is on left margin, adjust anchor to prevent corner collision
      if (Math.abs(px - margin.left) < 6 && yAxisX <= margin.left + 5) {
        anchor = 'start';
        textPx = px + 2;
      }
      axes.push(
        `<text x="${textPx.toFixed(1)}" y="${labelY.toFixed(1)}" font-size="12" font-family="system-ui, sans-serif" fill="currentColor" opacity="0.8" text-anchor="${anchor}">${formatTick(xt)}</text>`
      );
    }
  });

  const hlineMarks = (spec.marks || []).filter((m) => m.type === 'hline' && m.label);

  yTicks.forEach((yt) => {
    if (Math.abs(yt) < 1e-12 && xZeroIn && yZeroIn) return;
    const py = yScale(yt);
    axes.push(
      `<line x1="${yAxisX - 3}" y1="${py}" x2="${yAxisX + 3}" y2="${py}" stroke="currentColor" stroke-width="1.2" />`
    );

    // Suppress tick label if an hline mark with label sits at this tick
    const hasMatchingHline = hlineMarks.some((hm) => {
      const hPy = yScale(hm.y);
      return Math.abs(hPy - py) < 10;
    });

    if (!hasMatchingHline) {
      const labelX = yAxisX - 8;
      const anchor = 'end';
      axes.push(
        `<text x="${labelX.toFixed(1)}" y="${(py + 4).toFixed(1)}" font-size="12" font-family="system-ui, sans-serif" fill="currentColor" opacity="0.8" text-anchor="${anchor}">${formatTick(yt)}</text>`
      );
    }
  });

  // Zero label if both zero in
  if (xZeroIn && yZeroIn) {
    axes.push(
      `<text x="${(yAxisX - 6).toFixed(1)}" y="${(xAxisY + 14).toFixed(1)}" font-size="12" font-family="system-ui, sans-serif" fill="currentColor" opacity="0.8" text-anchor="end">0</text>`
    );
  }

  elements.push(`<g class="lu-fig-axes" aria-hidden="true">${axes.join('\n')}</g>`);

  // 4. Curves
  const curvesSvg = [];
  (spec.curves || []).forEach((curve, cIdx) => {
    const seriesClass = `lu-fig-series-${(cIdx % 4) + 1}`;
    const domain = curve.domain || xDomain;
    const segments = sampleCurve(curve.fn, domain, { exclude: curve.exclude, samples: 300 });

    segments.forEach((seg) => {
      if (seg.length < 2) return;
      const d = seg
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(p.x).toFixed(1)} ${yScale(p.y).toFixed(1)}`)
        .join(' ');
      const strokeDash = curve.style === 'dashed' ? 'stroke-dasharray="6,4"' : '';
      curvesSvg.push(
        `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2.2" ${strokeDash} class="${seriesClass} lu-fig-curve" />`
      );
    });
  });

  if (curvesSvg.length > 0) {
    elements.push(`<g class="lu-fig-curves">${curvesSvg.join('\n')}</g>`);
  }

  // 5. Lines, Points, Marks
  const marksSvg = [];
  const labelsSvg = [];

  (spec.marks || []).forEach((mark) => {
    if (mark.type === 'secant') {
      const curve = curvesMap.get(mark.curve) || curvesMap.values().next().value;
      if (curve) {
        const sec = secant({ fn: curve.fn, from: mark.from, to: mark.to });
        const x1 = xScale(sec.from.x);
        const y1 = yScale(sec.from.y);
        const x2 = xScale(sec.to.x);
        const y2 = yScale(sec.to.y);
        marksSvg.push(
          `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="2" class="lu-fig-secant text-blue-600 dark:text-blue-400" />`
        );
      }
    } else if (mark.type === 'tangent') {
      const curve = curvesMap.get(mark.curve) || curvesMap.values().next().value;
      if (curve) {
        const tan = tangent({ fn: curve.fn, d: curve.d, at: mark.at, span: mark.span || 0.8 });
        const x1 = xScale(tan.from.x);
        const y1 = yScale(tan.from.y);
        const x2 = xScale(tan.to.x);
        const y2 = yScale(tan.to.y);
        marksSvg.push(
          `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="2" class="lu-fig-tangent text-amber-600 dark:text-amber-400" />`
        );
      }
    } else if (mark.type === 'vline') {
      const x = mark.x;
      const px = xScale(x);
      let targetY = 0;
      if (typeof mark.to === 'number') {
        targetY = mark.to;
      } else if (typeof mark.to === 'string' && mark.to.startsWith('curve:')) {
        const cId = mark.to.split(':')[1];
        const c = curvesMap.get(cId) || curvesMap.values().next().value;
        if (c) targetY = c.fn(x);
      }
      const py0 = xAxisY;
      const py1 = yScale(targetY);
      marksSvg.push(
        `<line x1="${px.toFixed(1)}" y1="${py0.toFixed(1)}" x2="${px.toFixed(1)}" y2="${py1.toFixed(1)}" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4,3" stroke-opacity="0.7" class="lu-fig-vline" />`
      );
      if (mark.label) {
        const labelPos = mark.labelPos || 'bottom';
        const dy = mark.dy !== undefined ? mark.dy : (vlineDyMap.get(mark) || 0);
        const dx = mark.dx || 0;
        const textX = px + dx;
        const textY = labelPos === 'top' ? py1 - 8 + dy : py0 + 16 + dy;
        labelsSvg.push(
          `<text x="${textX.toFixed(1)}" y="${textY.toFixed(1)}" font-size="12" font-style="italic" fill="currentColor" text-anchor="middle">${escapeXml(mark.label)}</text>`
        );
      }
    } else if (mark.type === 'hline') {
      const y = mark.y;
      const py = yScale(y);
      const px0 = yAxisX;
      const px1 = xScale(mark.to ?? xDomain[1]);
      marksSvg.push(
        `<line x1="${px0.toFixed(1)}" y1="${py.toFixed(1)}" x2="${px1.toFixed(1)}" y2="${py.toFixed(1)}" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4,3" stroke-opacity="0.7" class="lu-fig-hline" />`
      );
      if (mark.label) {
        const dx = mark.dx || 0;
        const dy = mark.dy || 0;
        const textX = px0 - 6 + dx;
        const textY = py + 4 + dy;
        labelsSvg.push(
          `<text x="${textX.toFixed(1)}" y="${textY.toFixed(1)}" font-size="12" font-style="italic" fill="currentColor" text-anchor="end">${escapeXml(mark.label)}</text>`
        );
      }
    } else if (mark.type === 'point') {
      let x = mark.x;
      let y = mark.y;
      if (mark.at !== undefined) {
        x = mark.at;
        const curve = curvesMap.get(mark.curve) || curvesMap.values().next().value;
        if (curve) y = curve.fn(x);
      }
      if (x !== undefined && y !== undefined) {
        const cx = xScale(x).toFixed(1);
        const cy = yScale(y).toFixed(1);
        if (mark.open) {
          marksSvg.push(
            `<circle cx="${cx}" cy="${cy}" r="4.5" fill="var(--bg-surface, #ffffff)" stroke="currentColor" stroke-width="2.5" class="lu-fig-point-open" />`
          );
        } else {
          marksSvg.push(
            `<circle cx="${cx}" cy="${cy}" r="4" fill="currentColor" class="lu-fig-point" />`
          );
        }
      }
    }
  });

  if (marksSvg.length > 0) {
    elements.push(`<g class="lu-fig-marks">${marksSvg.join('\n')}</g>`);
  }
  if (labelsSvg.length > 0) {
    elements.push(`<g class="lu-fig-labels">${labelsSvg.join('\n')}</g>`);
  }

  return {
    innerSvg: elements.join('\n'),
    warnings,
  };
}

export function extractAllTextsWithTransforms(svg) {
  const tokens = [];
  const tagRegex = /<(\/?)(g|text)\b([^>]*)>|([^<]+)/g;
  let match;
  let currentTx = 0;
  let currentTy = 0;
  const transformStack = [{ tx: 0, ty: 0 }];

  while ((match = tagRegex.exec(svg)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2];
    const attrs = match[3] || '';

    if (tagName === 'g') {
      if (isClosing) {
        if (transformStack.length > 1) transformStack.pop();
        const top = transformStack[transformStack.length - 1];
        currentTx = top.tx;
        currentTy = top.ty;
      } else {
        let tx = currentTx;
        let ty = currentTy;
        const transMatch = attrs.match(/transform="translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)"/);
        if (transMatch) {
          tx += parseFloat(transMatch[1]);
          ty += parseFloat(transMatch[2]);
        }
        transformStack.push({ tx, ty });
        currentTx = tx;
        currentTy = ty;
      }
    } else if (tagName === 'text' && !isClosing) {
      const closeIdx = svg.indexOf('</text>', match.index);
      if (closeIdx === -1) continue;
      const fullTextTag = svg.substring(match.index, closeIdx);
      const innerContent = fullTextTag.substring(fullTextTag.indexOf('>') + 1).trim();
      const xM = attrs.match(/\bx="([^"]+)"/);
      const yM = attrs.match(/\by="([^"]+)"/);
      const anchorM = attrs.match(/\btext-anchor="([^"]+)"/);
      const sizeM = attrs.match(/\bfont-size="([^"]+)"/);

      const cleanText = innerContent
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");

      if (cleanText) {
        tokens.push({
          text: cleanText,
          x: (xM ? parseFloat(xM[1]) : 0) + currentTx,
          y: (yM ? parseFloat(yM[1]) : 0) + currentTy,
          anchor: anchorM ? anchorM[1] : 'start',
          fontSize: sizeM ? parseFloat(sizeM[1]) : 12,
        });
      }
    }
  }
  return tokens;
}

export function estimateTextBBox(item) {
  const fs = item.fontSize || 12;
  let w = 0;
  for (const ch of item.text) {
    if ('il1 .,:;!\'|()[]'.includes(ch)) w += 0.35 * fs;
    else if ('mwMW—≈'.includes(ch)) w += 0.75 * fs;
    else w += 0.55 * fs;
  }
  let minX;
  if (item.anchor === 'middle') minX = item.x - w / 2;
  else if (item.anchor === 'end') minX = item.x - w;
  else minX = item.x;
  const maxX = minX + w;
  const minY = item.y - 0.8 * fs;
  const maxY = item.y + 0.25 * fs;
  return { minX, maxX, minY, maxY, text: item.text, x: item.x, y: item.y };
}

export function checkOverlaps(boxes, minGap = 1.5) {
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const xOverlap = a.minX - minGap < b.maxX && a.maxX + minGap > b.minX;
      const yOverlap = a.minY - minGap < b.maxY && a.maxY + minGap > b.minY;
      if (xOverlap && yOverlap) {
        overlaps.push({
          a: a.text,
          b: b.text,
          aBox: a,
          bBox: b,
        });
      }
    }
  }
  return overlaps;
}

export function detectSvgTextCollisions(svg, options = {}) {
  const minGap = options.minGap ?? 1.5;
  const texts = extractAllTextsWithTransforms(svg);
  const boxes = texts.map(estimateTextBBox);
  return checkOverlaps(boxes, minGap);
}
