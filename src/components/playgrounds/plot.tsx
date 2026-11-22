import type { ReactNode } from 'react';
import { createScale } from '../../lib/plot/scale.mjs';

export const WIDTH = 720;
export const HEIGHT = 340;

export function polyline(points: Array<[number, number]>) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

export { createScale };

interface PlotFrameProps {
  children: ReactNode;
  label?: string;
  xScale?: (x: number) => number;
  yScale?: (y: number) => number;
}

export function PlotFrame({
  children,
  label = 'Interactive visualization',
  xScale,
  yScale,
}: PlotFrameProps) {
  let xAxisY = 276;
  let yAxisX = 76;

  if (yScale) {
    const zeroY = yScale(0);
    if (Number.isFinite(zeroY) && zeroY >= 30 && zeroY <= HEIGHT - 30) {
      xAxisY = zeroY;
    }
  }

  if (xScale) {
    const zeroX = xScale(0);
    if (Number.isFinite(zeroX) && zeroX >= 30 && zeroX <= WIDTH - 30) {
      yAxisX = zeroX;
    }
  }

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className="h-auto w-full text-light-text dark:text-dark-text">
      <rect width={WIDTH} height={HEIGHT} rx="24" fill="currentColor" opacity="0.035" />
      <line x1="56" y1={xAxisY} x2="680" y2={xAxisY} stroke="currentColor" opacity="0.35" />
      <line x1={yAxisX} y1="30" x2={yAxisX} y2="310" stroke="currentColor" opacity="0.35" />
      {children}
    </svg>
  );
}
