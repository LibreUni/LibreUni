/**
 * Scale and coordinate utilities for verified math figures.
 */

export function createScale({ domain, range, clamp = false }) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  const rSpan = r1 - r0;

  function scale(x) {
    if (span === 0) return (r0 + r1) / 2;
    let t = (x - d0) / span;
    if (clamp) {
      t = Math.max(0, Math.min(1, t));
    }
    return r0 + t * rSpan;
  }

  scale.invert = function invert(y) {
    if (rSpan === 0) return (d0 + d1) / 2;
    const t = (y - r0) / rSpan;
    return d0 + t * span;
  };

  scale.domain = [d0, d1];
  scale.range = [r0, r1];
  scale.ticks = function (count = 6) {
    return getTicks([d0, d1], count);
  };

  return scale;
}

export function getTicks([min, max], targetCount = 6) {
  if (min === max) return [min];
  if (min > max) [min, max] = [max, min];

  const span = max - min;
  const roughStep = span / Math.max(1, targetCount);
  const power = Math.floor(Math.log10(roughStep));
  const base = 10 ** power;
  const fraction = roughStep / base;

  let step;
  if (fraction < 1.5) {
    step = 1 * base;
  } else if (fraction < 3.5) {
    step = 2 * base;
  } else if (fraction < 7.5) {
    step = 5 * base;
  } else {
    step = 10 * base;
  }

  const firstTick = Math.ceil(min / step) * step;
  const ticks = [];
  let current = firstTick;
  // Guard against infinite loop
  let count = 0;
  while (current <= max + step * 1e-9 && count < 100) {
    // Avoid precision drift
    const cleanVal = Number(current.toPrecision(10));
    ticks.push(cleanVal);
    current += step;
    count++;
  }

  return ticks;
}

export function formatTick(value) {
  if (Math.abs(value) < 1e-12) return '0';
  if (Number.isInteger(value)) return String(value);
  // Round to at most 4 decimal places
  const str = Number(value.toFixed(4)).toString();
  return str;
}
