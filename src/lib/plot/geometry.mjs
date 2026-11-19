/**
 * Mathematical geometry and numerical routines for plot calculations.
 */

function ensureFunction(fn, callerName, paramName = 'fn') {
  if (typeof fn !== 'function') {
    throw new Error(`[${callerName}] ${paramName} must be a function`);
  }
}

function ensureFinite(value, callerName, context) {
  if (!Number.isFinite(value)) {
    throw new Error(`[${callerName}] Non-finite value (${value}) ${context}`);
  }
  return value;
}

function validateSubintervalCount(n, callerName) {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(
      `[${callerName}] Subinterval count n must be a positive integer (got ${n})`
    );
  }
  return n;
}

/**
 * Validate a closed bounded interval [a, b] with finite endpoints and a < b.
 */
export function validateInterval(interval, callerName = 'geometry') {
  if (!Array.isArray(interval) || interval.length !== 2) {
    throw new Error(`[${callerName}] Invalid interval: expected a 2-element array [a, b]`);
  }
  const [a, b] = interval;
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error(
      `[${callerName}] Invalid interval [${a}, ${b}]: endpoints must be finite numbers`
    );
  }
  if (a >= b) {
    throw new Error(`[${callerName}] Invalid interval [${a}, ${b}]: expected a < b`);
  }
  return [a, b];
}

/**
 * Find a root of fn on [a, b] using sign-change bracketing and bisection.
 */
export function solve(fn, interval, tol = 1e-9, maxIter = 100) {
  ensureFunction(fn, 'solve');
  const [a, b] = validateInterval(interval, 'solve');
  if (!Number.isFinite(tol) || tol < 0) {
    throw new Error(`[solve] Tolerance tol must be a finite non-negative number (got ${tol})`);
  }
  if (!Number.isInteger(maxIter) || maxIter <= 0) {
    throw new Error(`[solve] maxIter must be a positive integer (got ${maxIter})`);
  }

  let fa = ensureFinite(fn(a), 'solve', `at endpoint x=${a}`);
  let fb = ensureFinite(fn(b), 'solve', `at endpoint x=${b}`);

  if (Math.abs(fa) <= tol) return a;
  if (Math.abs(fb) <= tol) return b;

  let left = a;
  let right = b;

  if (Math.sign(fa) === Math.sign(fb)) {
    // Try to find a sign change by stepping through the interval
    const steps = 100;
    const stepSize = (b - a) / steps;
    let found = false;
    let prevX = a;
    let prevY = fa;
    for (let i = 1; i <= steps; i++) {
      const nextX = i === steps ? b : a + i * stepSize;
      const nextY = ensureFinite(fn(nextX), 'solve', `at x=${nextX}`);
      if (Math.abs(nextY) <= tol) return nextX;
      if (Math.sign(prevY) !== Math.sign(nextY)) {
        left = prevX;
        right = nextX;
        fa = prevY;
        fb = nextY;
        found = true;
        break;
      }
      prevX = nextX;
      prevY = nextY;
    }
    if (!found) {
      throw new Error(`[solve] Root not bracketed on [${a}, ${b}]: f(a)=${fa}, f(b)=${fb}`);
    }
  }

  // Bisection search
  for (let iter = 0; iter < maxIter; iter++) {
    const mid = (left + right) / 2;
    const fmid = ensureFinite(fn(mid), 'solve', `at x=${mid}`);

    if (Math.abs(fmid) <= tol || (right - left) / 2 <= tol) {
      return mid;
    }

    if (Math.sign(fa) !== Math.sign(fmid)) {
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

function goldenSectionSearch(fn, interval, tol, maxIter, { maximize, callerName }) {
  ensureFunction(fn, callerName);
  let [a, b] = validateInterval(interval, callerName);
  if (!Number.isFinite(tol) || tol < 0) {
    throw new Error(
      `[${callerName}] Tolerance tol must be a finite non-negative number (got ${tol})`
    );
  }
  if (!Number.isInteger(maxIter) || maxIter <= 0) {
    throw new Error(`[${callerName}] maxIter must be a positive integer (got ${maxIter})`);
  }

  let c = b - PHI * (b - a);
  let d = a + PHI * (b - a);
  let fc = ensureFinite(fn(c), callerName, `at x=${c}`);
  let fd = ensureFinite(fn(d), callerName, `at x=${d}`);

  for (let i = 0; i < maxIter; i++) {
    if (Math.abs(b - a) < tol) break;

    if (maximize ? fc < fd : fc > fd) {
      a = c;
      c = d;
      fc = fd;
      d = a + PHI * (b - a);
      fd = ensureFinite(fn(d), callerName, `at x=${d}`);
    } else {
      b = d;
      d = c;
      fd = fc;
      c = b - PHI * (b - a);
      fc = ensureFinite(fn(c), callerName, `at x=${c}`);
    }
  }

  const result = (a + b) / 2;
  ensureFinite(fn(result), callerName, `at final x=${result}`);
  return result;
}

/**
 * Find an approximate maximizer of fn on [a, b] via golden-section search.
 */
export function argmax(fn, interval, tol = 1e-7, maxIter = 100) {
  return goldenSectionSearch(fn, interval, tol, maxIter, {
    maximize: true,
    callerName: 'argmax',
  });
}

/**
 * Find an approximate minimizer of fn on [a, b] via golden-section search.
 */
export function argmin(fn, interval, tol = 1e-7, maxIter = 100) {
  return goldenSectionSearch(fn, interval, tol, maxIter, {
    maximize: false,
    callerName: 'argmin',
  });
}

/**
 * Compute secant endpoints and slope between distinct x values from and to.
 */
export function secant(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('[secant] Options object is required');
  }
  const { fn, from, to } = options;
  ensureFunction(fn, 'secant');
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    throw new Error(`[secant] Endpoints must be finite numbers (got from=${from}, to=${to})`);
  }
  if (from === to) {
    throw new Error(`[secant] Endpoints must be distinct (got from=${from}, to=${to})`);
  }

  const y1 = ensureFinite(fn(from), 'secant', `at from=${from}`);
  const y2 = ensureFinite(fn(to), 'secant', `at to=${to}`);
  const m = ensureFinite((y2 - y1) / (to - from), 'secant', `for slope on [${from}, ${to}]`);

  return {
    from: { x: from, y: y1 },
    to: { x: to, y: y2 },
    slope: m,
  };
}

/**
 * Compute tangent segment endpoints and slope at x = at over [at - span, at + span].
 */
export function tangent(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('[tangent] Options object is required');
  }
  const { fn, d, at, span = 0.8 } = options;
  ensureFunction(fn, 'tangent');
  if (d !== undefined && d !== null && typeof d !== 'function') {
    throw new Error('[tangent] Derivative d must be a function when provided');
  }
  if (!Number.isFinite(at)) {
    throw new Error(`[tangent] Point at=${at} must be a finite number`);
  }
  if (!Number.isFinite(span) || span <= 0) {
    throw new Error(`[tangent] span must be a finite positive number (got ${span})`);
  }

  const y0 = ensureFinite(fn(at), 'tangent', `at x=${at}`);
  let m;
  if (typeof d === 'function') {
    m = d(at);
  } else {
    const h = 1e-5;
    const fPlus = ensureFinite(fn(at + h), 'tangent', `at x=${at + h}`);
    const fMinus = ensureFinite(fn(at - h), 'tangent', `at x=${at - h}`);
    m = (fPlus - fMinus) / (2 * h);
  }
  ensureFinite(m, 'tangent', `for slope at x=${at}`);

  const x1 = at - span;
  const x2 = at + span;
  const y1 = ensureFinite(y0 + m * (x1 - at), 'tangent', `at x=${x1}`);
  const y2 = ensureFinite(y0 + m * (x2 - at), 'tangent', `at x=${x2}`);

  return {
    from: { x: x1, y: y1 },
    to: { x: x2, y: y2 },
    at,
    y: y0,
    slope: m,
  };
}

const VALID_RIEMANN_RULES = new Set(['left', 'right', 'mid', 'midpoint', 'lower', 'upper']);

/**
 * Compute Riemann / Darboux rectangles and sum for fn on [a, b] with n subintervals.
 */
export function riemann(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('[riemann] Options object is required');
  }
  const { fn, interval, n, rule = 'left' } = options;
  ensureFunction(fn, 'riemann');
  const [a, b] = validateInterval(interval, 'riemann');
  validateSubintervalCount(n, 'riemann');
  if (typeof rule !== 'string' || !VALID_RIEMANN_RULES.has(rule)) {
    throw new Error(
      `[riemann] Invalid rule "${rule}": expected one of left, right, midpoint, mid, lower, upper`
    );
  }

  const dx = (b - a) / n;
  const rectangles = [];
  let sum = 0;

  for (let i = 0; i < n; i++) {
    const x0 = a + i * dx;
    const x1 = x0 + dx;

    let height;
    if (rule === 'left') {
      height = ensureFinite(fn(x0), 'riemann', `at x=${x0}`);
    } else if (rule === 'right') {
      height = ensureFinite(fn(x1), 'riemann', `at x=${x1}`);
    } else if (rule === 'mid' || rule === 'midpoint') {
      const xMid = (x0 + x1) / 2;
      height = ensureFinite(fn(xMid), 'riemann', `at x=${xMid}`);
    } else {
      // Sample within subinterval to approximate lower / upper Darboux extrema
      const subSamples = 30;
      let extremum = ensureFinite(fn(x0), 'riemann', `at x=${x0}`);
      for (let j = 1; j <= subSamples; j++) {
        const sampleX = x0 + (j / subSamples) * dx;
        const val = ensureFinite(fn(sampleX), 'riemann', `at x=${sampleX}`);
        if (rule === 'lower' ? val < extremum : val > extremum) {
          extremum = val;
        }
      }
      height = extremum;
    }

    const area = ensureFinite(dx * height, 'riemann', `for subinterval [${x0}, ${x1}]`);
    sum += area;
    rectangles.push({ x0, x1, y: height, width: dx, height, area });
  }

  return { rectangles, sum, n, rule, dx };
}

/**
 * Compute polygon vertices and trapezoidal signed area between f1 and f2 on [a, b].
 */
export function areaBetween(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('[areaBetween] Options object is required');
  }
  const { f1, f2 = () => 0, interval, n = 200 } = options;
  ensureFunction(f1, 'areaBetween', 'f1');
  ensureFunction(f2, 'areaBetween', 'f2');
  const [a, b] = validateInterval(interval, 'areaBetween');
  validateSubintervalCount(n, 'areaBetween');

  const dx = (b - a) / n;
  const topPts = [];
  const bottomPts = [];
  let area = 0;
  let prevDiff = 0;

  for (let i = 0; i <= n; i++) {
    const x = i === n ? b : a + i * dx;
    const y1 = ensureFinite(f1(x), 'areaBetween', `from f1 at x=${x}`);
    const y2 = ensureFinite(f2(x), 'areaBetween', `from f2 at x=${x}`);
    topPts.push({ x, y: y1 });
    bottomPts.unshift({ x, y: y2 });

    const diff = y1 - y2;
    if (i > 0) {
      area += ((prevDiff + diff) / 2) * dx;
    }
    prevDiff = diff;
  }

  ensureFinite(area, 'areaBetween', `computed area on [${a}, ${b}]`);

  return {
    polygon: [...topPts, ...bottomPts],
    area,
  };
}
