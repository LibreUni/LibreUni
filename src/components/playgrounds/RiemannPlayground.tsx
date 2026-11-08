import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { PlotFrame, polyline, createScale } from './plot';
import { leftRiemannSum } from './calculusModels.mjs';

export { leftRiemannSum };

function Riemann({ n }: { n: number }) {
  const xScale = createScale({ domain: [-1, 2.4], range: [76, 644] });
  const yScale = createScale({ domain: [0, 4], range: [276, 40] });
  const f = (x: number) => 0.28 * (x + 1) ** 2 + 0.55;
  const curve = Array.from({ length: 100 }, (_, i) => {
    const x = -1 + (i / 99) * 3.4;
    return [xScale(x), yScale(f(x))] as [number, number];
  });
  const width = 3.4 / n;

  return (
    <PlotFrame label="Left Riemann sum with adjustable rectangle count" xScale={xScale} yScale={yScale}>
      {Array.from({ length: n }, (_, i) => {
        const x = -1 + i * width;
        const h = f(x);
        return (
          <rect
            key={x}
            x={xScale(x)}
            y={yScale(h)}
            width={xScale(x + width) - xScale(x)}
            height={276 - yScale(h)}
            fill="#22c55e"
            opacity=".28"
            stroke="#16a34a"
          />
        );
      })}
      <polyline points={polyline(curve)} fill="none" stroke="#2563eb" strokeWidth="4" />
      <text x="98" y="62" fill="currentColor" fontSize="16">
        left Riemann sum (equals the lower Darboux sum here because f is increasing)
      </text>
      <text x="98" y="316" fill="currentColor" fontSize="14">
        n = {n} rectangles
      </text>
    </PlotFrame>
  );
}

export default function RiemannPlayground() {
  const [n, setN] = useState(8);
  return (
    <InteractivePlayground
      title="Refine a Riemann sum"
      description="Increase n to see the rectangles track the area more closely."
      staticCaption="A finite rectangular sum approximates the area under a curve."
      staticContent={<Riemann n={8} />}
      status={`n = ${n}`}
    >
      <label className="interactive-playground-controls flex items-center gap-3">
        n = {n}
        <input
          aria-label="Number of rectangles"
          type="range"
          min="2"
          max="32"
          step="1"
          value={n}
          onChange={(event) => setN(Number(event.target.value))}
        />
      </label>
      <Riemann n={n} />
    </InteractivePlayground>
  );
}
