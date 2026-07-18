import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { PlotFrame, polyline } from './plot';

function Tangent({ a }: { a: number }) {
  const xScale = (x: number) => 76 + (x + 3) * 86;
  const yScale = (y: number) => 196 - y * 58;
  const f = (x: number) => 0.16 * x ** 3 - 0.5 * x;
  const slope = 0.48 * a ** 2 - 0.5;
  const curve = Array.from({ length: 100 }, (_, i) => { const x = -3 + (i / 99) * 6; return [xScale(x), yScale(f(x))] as [number, number]; });
  const tangent = [[-3, f(a) + slope * (-3 - a)], [3, f(a) + slope * (3 - a)]] as Array<[number, number]>;
  return <PlotFrame label="A curve with a movable tangent line"><polyline points={polyline(curve)} fill="none" stroke="#2563eb" strokeWidth="4" /><polyline points={polyline(tangent.map(([x, y]) => [xScale(x), yScale(y)]))} fill="none" stroke="#f97316" strokeWidth="3" strokeDasharray="9 6" /><circle cx={xScale(a)} cy={yScale(f(a))} r="7" fill="#f97316" /><text x="98" y="62" fill="currentColor" fontSize="16">secant limit → tangent</text><text x="98" y="316" fill="currentColor" fontSize="14">a = {a.toFixed(2)}, f′(a) = {slope.toFixed(2)}</text></PlotFrame>;
}

export default function TangentPlayground() {
  const [a, setA] = useState(1.1);
  return <InteractivePlayground title="Slide the point of tangency" description="Move a along the curve and compare the tangent slope with the local shape." staticCaption="A tangent line records the limiting slope at a selected point." staticContent={<Tangent a={1.1} />} status={`a = ${a.toFixed(2)}`}><label className="interactive-playground-controls flex items-center gap-3">a = {a.toFixed(2)}<input aria-label="Point a" type="range" min="-2.2" max="2.2" step="0.01" value={a} onChange={(event) => setA(Number(event.target.value))} /></label><Tangent a={a} /></InteractivePlayground>;
}
