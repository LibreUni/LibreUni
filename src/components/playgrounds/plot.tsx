import type { ReactNode } from 'react';

export const WIDTH = 720;
export const HEIGHT = 340;

export function polyline(points: Array<[number, number]>) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

export function PlotFrame({ children, label = 'Interactive visualization' }: { children: ReactNode; label?: string }) {
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className="h-auto w-full text-light-text dark:text-dark-text">
      <rect width={WIDTH} height={HEIGHT} rx="24" fill="currentColor" opacity="0.035" />
      <line x1="56" y1="276" x2="680" y2="276" stroke="currentColor" opacity="0.35" />
      <line x1="76" y1="40" x2="76" y2="296" stroke="currentColor" opacity="0.35" />
      {children}
    </svg>
  );
}
