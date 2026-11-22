import assert from 'node:assert/strict';
import test from 'node:test';
import {
  solve,
  argmax,
  argmin,
  secant,
  tangent,
  riemann,
  areaBetween,
} from '../src/lib/plot/geometry.mjs';

test('solve rejects non-finite function values and invalid intervals instead of silent bisection', () => {
  assert.throws(() => solve(() => NaN, [0, 1]), /finite|NaN/i);
  assert.throws(() => solve((x) => (Math.abs(x - 0.5) < 0.1 ? NaN : x - 0.5), [0, 1]), /finite|NaN/i);
  assert.throws(() => solve((x) => 1 / x, [0, 1]), /finite|bracketed/i);
  assert.throws(() => solve((x) => x, [2, 1]), /interval/i);
  assert.throws(() => solve((x) => x, [Number.NaN, 1]), /interval/i);
});

test('argmax and argmin reject non-finite evaluations and invalid intervals', () => {
  assert.throws(() => argmax(() => NaN, [0, 1]), /finite|NaN/i);
  assert.throws(() => argmin(() => Infinity, [0, 1]), /finite|NaN/i);
  assert.throws(() => argmax((x) => -x * x, [1, 0]), /interval/i);
  assert.throws(() => argmin((x) => x * x, [0, Infinity]), /interval/i);
});

test('riemann validates subinterval count, integration rule, and finite values', () => {
  assert.throws(() => riemann({ fn: (x) => x, interval: [0, 1], n: 0 }), /positive integer|n/i);
  assert.throws(() => riemann({ fn: (x) => x, interval: [0, 1], n: -3 }), /positive integer|n/i);
  assert.throws(() => riemann({ fn: (x) => x, interval: [0, 1], n: 2.5 }), /positive integer|n/i);
  assert.throws(
    () => riemann({ fn: (x) => x, interval: [0, 1], n: 4, rule: 'simpson' }),
    /rule/i
  );
  assert.throws(
    () => riemann({ fn: () => NaN, interval: [0, 1], n: 4, rule: 'left' }),
    /finite/i
  );
});

test('areaBetween, secant, and tangent validate degenerate inputs and non-finite outputs', () => {
  assert.throws(() => areaBetween({ f1: (x) => x, interval: [0, 1], n: 0 }), /positive integer|n/i);
  assert.throws(() => areaBetween({ f1: () => NaN, interval: [0, 1], n: 4 }), /finite/i);
  assert.throws(() => secant({ fn: (x) => x, from: 2, to: 2 }), /distinct|zero/i);
  assert.throws(() => tangent({ fn: () => NaN, at: 2 }), /finite/i);
  assert.throws(() => tangent({ fn: (x) => x * x, d: (x) => x * 2, at: 2, span: 0 }), /span|positive/i);
});
