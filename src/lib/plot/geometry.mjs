/**
 * Mathematical geometry and numerical routines for plot calculations.
 */

export function solve(fn, [a, b], tol = 1e-9, maxIter = 100) {
  let fa = fn(a);
  let fb = fn(b);

  if (Math.abs(fa) <= tol) return a;
  if (Math.abs(fb) <= tol) return b;

  let left = a;
  let right = b;

  if (fa * fb > 0) {
    // Try to find a sign change by stepping through the interval
    const steps = 100;
    const stepSize = (b - a) / steps;
    let found = false;
    for (let i = 0; i < steps; i++) {
      const x0 = a + i * stepSize;
      const x1 = a + (i + 1) * stepSize;
      const y0 = fn(x0);
      const y1 = fn(x1);
      if (y0 * y1 <= 0) {
        left = x0;
        right = x1;
        fa = y0;
        fb = y1;
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error(`[solve] Root not bracketed on [${a}, ${b}]: f(a)=${fa}, f(b)=${fb}`);
    }
  }

  // Bisection search
  for (let iter = 0; iter < maxIter; iter++) {
    const mid = (left + right) / 2;
    const fmid = fn(mid);

    if (Math.abs(fmid) <= tol || (right - left) / 2 <= tol) {
      return mid;
    }

    if (fa * fmid <= 0) {
      right = mid;
      fb = fmid;
    } else {
      left = mid;
      fa = fmid;
    }
  }

  return (left + right) / 2;
}

const PHI = (Math.sqrt(5) - 1) / 2; // ~0.6180339887

export function argmax(fn, [a, b], tol = 1e-7, maxIter = 100) {
  let x1 = b - PHI * (b - a);
  let x2 = a + PHI * (b - a);
  let f1 = fn(x1);
  let f2 = fn(x2);

  for (let i = 0; i < maxIter; i++) {
    if (Math.abs(b - a) < tol) break;

    if (f1 < f2) {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = a + PHI * (b - a);
      f2 = fn(x2);
    } else {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = b - PHI * (b - a);
      f1 = fn(x1);
    }
  }

  return (a + b) / 2;
}

export function argmin(fn, [a, b], tol = 1e-7, maxIter = 100) {
  // Minimize fn by maximizing -fn
  return argmax((x) => -fn(x), [a, b], tol, maxIter);
}

export function secant({ fn, from, to }) {
  const y1 = fn(from);
  const y2 = fn(to);
  const m = (y2 - y1) / (to - from);
  return {
    from: { x: from, y: y1 },
    to: { x: to, y: y2 },
    slope: m,
  };
}

export function tangent({ fn, d, at, span = 0.8 }) {
  const y0 = fn(at);
  const m = typeof d === 'function' ? d(at) : (fn(at + 1e-5) - fn(at - 1e-5)) / 2e-5;
  const x1 = at - span;
  const x2 = at + span;
  const y1 = y0 + m * (x1 - at);
  const y2 = y0 + m * (x2 - at);
  return {
    from: { x: x1, y: y1 },
    to: { x: x2, y: y2 },
    at,
    y: y0,
    slope: m,
  };
}

export function riemann({ fn, interval, n, rule = 'left' }) {
  const [a, b] = interval;
  const dx = (b - a) / n;
  const rectangles = [];
  let sum = 0;

  for (let i = 0; i < n; i++) {
    const x0 = a + i * dx;
    const x1 = x0 + dx;

    let height;
    if (rule === 'left') {
      height = fn(x0);
    } else if (rule === 'right') {
      height = fn(x1);
    } else if (rule === 'mid') {
      height = fn((x0 + x1) / 2);
    } else if (rule === 'lower' || rule === 'upper') {
      // Sample within interval to find inf / sup
      const subSamples = 30;
      let extremum = fn(x0);
      for (let j = 1; j <= subSamples; j++) {
        const val = fn(x0 + (j / subSamples) * dx);
        if (rule === 'lower' ? val < extremum : val > extremum) {
          extremum = val;
        }
      }
      height = extremum;
    } else {
      height = fn(x0);
    }

    const area = dx * height;
    sum += area;
    rectangles.push({ x0, x1, y: height, width: dx, height, area });
  }

  return { rectangles, sum, n, rule, dx };
}

export function areaBetween({ f1, f2 = () => 0, interval, n = 200 }) {
  const [a, b] = interval;
  const dx = (b - a) / n;
  const topPts = [];
  const bottomPts = [];
  let area = 0;

  for (let i = 0; i <= n; i++) {
    const x = a + i * dx;
    const y1 = f1(x);
    const y2 = f2(x);
    topPts.push({ x, y: y1 });
    bottomPts.unshift({ x, y: y2 });

    if (i < n) {
      const xNext = x + dx;
      const diff1 = y1 - y2;
      const diff2 = f1(xNext) - f2(xNext);
      area += ((diff1 + diff2) / 2) * dx;
    }
  }

  return {
    polygon: [...topPts, ...bottomPts],
    area,
  };
}
