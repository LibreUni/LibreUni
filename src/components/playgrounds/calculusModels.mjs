export const tangentSlope = (a) => 0.48 * a ** 2 - 0.5;

export const deltaWindow = (epsilon) => epsilon / 3;

export function leftRiemannSum(n) {
  const f = (x) => 0.28 * (x + 1) ** 2 + 0.55;
  const width = 3.4 / n;
  return Array.from({ length: n }, (_, i) => f(-1 + i * width) * width).reduce((sum, area) => sum + area, 0);
}
