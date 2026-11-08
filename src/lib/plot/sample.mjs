/**
 * Adaptive curve sampling with discontinuity breaking and exclusion intervals.
 */

export function isExcluded(x, exclude) {
  if (!exclude) return false;
  if (Array.isArray(exclude) && typeof exclude[0] === 'number') {
    return x >= exclude[0] && x <= exclude[1];
  }
  if (Array.isArray(exclude)) {
    return exclude.some(([start, end]) => x >= start && x <= end);
  }
  return false;
}

export function sampleCurve(fn, domain, options = {}) {
  const [xMin, xMax] = domain;
  const numSamples = options.samples || 400;
  const exclude = options.exclude || null;
  const maxJump = options.maxJump !== undefined ? options.maxJump : 50;
  const yDomain = options.yDomain || null;

  const dx = (xMax - xMin) / (numSamples - 1);
  const segments = [];
  let currentSegment = [];

  let prevY = null;
  let prevX = null;

  for (let i = 0; i < numSamples; i++) {
    const x = xMin + i * dx;

    if (isExcluded(x, exclude)) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      prevY = null;
      prevX = null;
      continue;
    }

    let y;
    try {
      y = fn(x);
    } catch {
      y = NaN;
    }

    if (typeof y !== 'number' || !Number.isFinite(y) || Number.isNaN(y)) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      prevY = null;
      prevX = null;
      continue;
    }

    // Check for large jump discontinuity (e.g. 1/x near 0 or step function)
    if (prevY !== null) {
      const dy = Math.abs(y - prevY);
      const isOppositeSign = (prevY < 0 && y > 0) || (prevY > 0 && y < 0);
      const isAsymptote = isOppositeSign && dy > maxJump;

      if (isAsymptote || dy > maxJump * 2) {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
      }
    }

    currentSegment.push({ x, y });
    prevX = x;
    prevY = y;
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}
