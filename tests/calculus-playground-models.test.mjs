import assert from 'node:assert/strict';
import test from 'node:test';
import { tangentSlope, deltaWindow, leftRiemannSum } from '../src/components/playgrounds/calculusModels.mjs';

test('tangent model computes exact derivative for cubic', () => {
  const f = (x) => 0.16 * x ** 3 - 0.5 * x;
  for (const a of [-2, -1, 0, 1, 1.5, 2]) {
    const analytic = tangentSlope(a);
    const numerical = (f(a + 1e-5) - f(a - 1e-5)) / 2e-5;
    assert.ok(
      Math.abs(analytic - numerical) < 1e-4,
      `tangentSlope(${a}) = ${analytic} should match numerical derivative ${numerical}`
    );
  }
});

test('epsilon-delta model guarantees output remains inside band', () => {
  const f = (x) => 3 * x - 1;
  const c = 2;
  const L = 5;

  for (const epsilon of [0.1, 0.25, 0.5, 0.8]) {
    const delta = deltaWindow(epsilon);
    assert.equal(delta, epsilon / 3);

    // Sample points strictly inside (c - delta, c + delta)
    for (let i = 1; i < 20; i++) {
      const x = c - delta + (i / 20) * 2 * delta;
      const error = Math.abs(f(x) - L);
      assert.ok(
        error < epsilon,
        `For ε=${epsilon}, x=${x} produced error ${error} which exceeds ε`
      );
    }
  }
});

test('left Riemann sum converges to exact Darboux integral as n increases', () => {
  // f(x) = 0.28*(x+1)^2 + 0.55 on [-1, 2.4]
  // Let u = x + 1, u in [0, 3.4]
  // Integral = 0.28 * 3.4^3 / 3 + 0.55 * 3.4 = 0.28 * 39.304 / 3 + 1.87 = 3.66837... + 1.87 = 5.538373...
  const exact = (0.28 * 3.4 ** 3) / 3 + 0.55 * 3.4;

  const sum4 = leftRiemannSum(4);
  const sum16 = leftRiemannSum(16);
  const sum64 = leftRiemannSum(64);

  // Because f is strictly increasing on [-1, 2.4], left sums underestimate the integral
  assert.ok(sum4 < exact, 'Left sum under-approximates increasing function');
  assert.ok(sum4 < sum16, 'Monotonic increase with finer partition');
  assert.ok(sum16 < sum64, 'Monotonic increase with finer partition');
  assert.ok(Math.abs(sum64 - exact) < 0.15, 'Convergence toward exact integral');
});
