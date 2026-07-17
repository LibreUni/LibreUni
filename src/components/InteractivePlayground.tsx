import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type PlaygroundKind =
  | 'epsilon-delta'
  | 'tangent'
  | 'riemann'
  | 'surface'
  | 'vector-field'
  | 'fourier';

interface InteractivePlaygroundProps {
  kind: PlaygroundKind;
  title: string;
  description?: string;
  staticCaption?: string;
}

const WIDTH = 720;
const HEIGHT = 340;

function polyline(points: Array<[number, number]>) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

function PlotFrame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" className="h-auto w-full" aria-label="Interactive calculus visualization">
      <rect width={WIDTH} height={HEIGHT} rx="24" fill="currentColor" opacity="0.035" />
      <line x1="56" y1="276" x2="680" y2="276" stroke="currentColor" opacity="0.35" />
      <line x1="76" y1="40" x2="76" y2="296" stroke="currentColor" opacity="0.35" />
      {children}
    </svg>
  );
}

function EpsilonDelta({ epsilon, staticOnly = false }: { epsilon: number; staticOnly?: boolean }) {
  const xScale = (x: number) => 76 + (x - 1.35) * 450;
  const yScale = (y: number) => 276 - (y - 3.5) * 92;
  const delta = epsilon / 3;
  const curve = Array.from({ length: 80 }, (_, i) => {
    const x = 1.35 + (i / 79) * 1.35;
    return [xScale(x), yScale(3 * x - 1)] as [number, number];
  });
  return (
    <PlotFrame>
      <rect x={xScale(2 - delta)} y={yScale(5 + epsilon)} width={xScale(2 + delta) - xScale(2 - delta)} height={yScale(5 - epsilon) - yScale(5 + epsilon)} fill="#22c55e" opacity=".12" />
      <line x1={xScale(1.35)} x2={xScale(2.7)} y1={yScale(5 + epsilon)} y2={yScale(5 + epsilon)} stroke="#ef4444" strokeDasharray="7 6" />
      <line x1={xScale(1.35)} x2={xScale(2.7)} y1={yScale(5 - epsilon)} y2={yScale(5 - epsilon)} stroke="#ef4444" strokeDasharray="7 6" />
      <line x1={xScale(2 - delta)} x2={xScale(2 - delta)} y1="40" y2="296" stroke="#22c55e" strokeDasharray="7 6" />
      <line x1={xScale(2 + delta)} x2={xScale(2 + delta)} y1="40" y2="296" stroke="#22c55e" strokeDasharray="7 6" />
      <polyline points={polyline(curve)} fill="none" stroke="#2563eb" strokeWidth="4" />
      <circle cx={xScale(2)} cy={yScale(5)} r="6" fill="#2563eb" />
      <text x="500" y={yScale(5 + epsilon) - 8} fill="currentColor" fontSize="15">ε-band</text>
      <text x={xScale(2 - delta) + 8} y="66" fill="currentColor" fontSize="15">δ-window</text>
      {!staticOnly && <text x="92" y="316" fill="currentColor" fontSize="14">f(x) = 3x − 1,  c = 2,  L = 5</text>}
    </PlotFrame>
  );
}

function Tangent({ a }: { a: number }) {
  const xScale = (x: number) => 76 + (x + 3) * 86;
  const yScale = (y: number) => 196 - y * 58;
  const f = (x: number) => 0.16 * x ** 3 - 0.5 * x;
  const slope = 0.48 * a ** 2 - 0.5;
  const curve = Array.from({ length: 100 }, (_, i) => {
    const x = -3 + (i / 99) * 6;
    return [xScale(x), yScale(f(x))] as [number, number];
  });
  const tangent = [[-3, f(a) + slope * (-3 - a)], [3, f(a) + slope * (3 - a)]] as Array<[number, number]>;
  return (
    <PlotFrame>
      <polyline points={polyline(curve)} fill="none" stroke="#2563eb" strokeWidth="4" />
      <polyline points={polyline(tangent.map(([x, y]) => [xScale(x), yScale(y)]))} fill="none" stroke="#f97316" strokeWidth="3" strokeDasharray="9 6" />
      <circle cx={xScale(a)} cy={yScale(f(a))} r="7" fill="#f97316" />
      <text x="98" y="62" fill="currentColor" fontSize="16">secant limit → tangent</text>
      <text x="98" y="316" fill="currentColor" fontSize="14">a = {a.toFixed(2)},  f′(a) = {slope.toFixed(2)}</text>
    </PlotFrame>
  );
}

function Riemann({ n }: { n: number }) {
  const xScale = (x: number) => 76 + (x + 1) * 180;
  const yScale = (y: number) => 276 - y * 62;
  const f = (x: number) => 0.28 * (x + 1) ** 2 + 0.55;
  const curve = Array.from({ length: 100 }, (_, i) => {
    const x = -1 + (i / 99) * 3.4;
    return [xScale(x), yScale(f(x))] as [number, number];
  });
  const width = 3.4 / n;
  return (
    <PlotFrame>
      {Array.from({ length: n }, (_, i) => {
        const x = -1 + i * width;
        const h = f(x);
        return <rect key={x} x={xScale(x)} y={yScale(h)} width={xScale(x + width) - xScale(x)} height={276 - yScale(h)} fill="#22c55e" opacity=".28" stroke="#16a34a" />;
      })}
      <polyline points={polyline(curve)} fill="none" stroke="#2563eb" strokeWidth="4" />
      <text x="98" y="62" fill="currentColor" fontSize="16">left Darboux sum</text>
      <text x="98" y="316" fill="currentColor" fontSize="14">n = {n} rectangles · increase n to see the area converge</text>
    </PlotFrame>
  );
}

function Surface({ yaw, pitch }: { yaw: number; pitch: number }) {
  const project = (x: number, y: number, z: number): [number, number] => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const xx = x * cy - y * sy;
    const yy = x * sy + y * cy;
    const zz = z * cp - yy * sp;
    return [360 + xx * 95, 178 - (zz + yy * cp) * 52];
  };
  const lines: ReactNode[] = [];
  for (let i = -3; i <= 3; i += 1) {
    const across = Array.from({ length: 25 }, (_, j) => {
      const y = -1.5 + (j / 24) * 3;
      return project(i * 0.5, y, Math.sin(i * 0.5) * Math.cos(y));
    });
    const along = Array.from({ length: 25 }, (_, j) => {
      const x = -1.5 + (j / 24) * 3;
      return project(x, i * 0.5, Math.sin(x) * Math.cos(i * 0.5));
    });
    lines.push(<polyline key={`a-${i}`} points={polyline(across)} fill="none" stroke="#2563eb" opacity=".72" />);
    lines.push(<polyline key={`b-${i}`} points={polyline(along)} fill="none" stroke="#f97316" opacity=".72" />);
  }
  return (
    <PlotFrame>
      {lines}
      <text x="98" y="62" fill="currentColor" fontSize="16">z = sin(x) cos(y)</text>
      <text x="98" y="316" fill="currentColor" fontSize="14">drag the surface to inspect it from another direction</text>
    </PlotFrame>
  );
}

function VectorField({ scale }: { scale: number }) {
  const arrows: JSX.Element[] = [];
  for (let x = -3; x <= 3; x += 1) {
    for (let y = -2; y <= 2; y += 1) {
      const vx = -y * scale * 12;
      const vy = x * scale * 12;
      const px = 360 + x * 70;
      const py = 178 - y * 50;
      arrows.push(<line key={`${x}-${y}`} x1={px - vx / 2} y1={py + vy / 2} x2={px + vx / 2} y2={py - vy / 2} stroke="#7c3aed" strokeWidth="2.5" markerEnd="url(#arrow)" />);
    }
  }
  return (
    <PlotFrame>
      <defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#7c3aed" /></marker></defs>
      {arrows}
      <text x="98" y="62" fill="currentColor" fontSize="16">F(x,y) = (−y, x)</text>
      <text x="98" y="316" fill="currentColor" fontSize="14">field strength = {scale.toFixed(1)}× · compare circulation around the origin</text>
    </PlotFrame>
  );
}

function Fourier({ harmonics }: { harmonics: number }) {
  const xScale = (x: number) => 76 + x * 590;
  const yScale = (y: number) => 178 - y * 82;
  const wave = Array.from({ length: 180 }, (_, i) => {
    const x = i / 179;
    let y = 0;
    for (let k = 1; k <= harmonics; k += 2) y += (4 / (Math.PI * k)) * Math.sin(2 * Math.PI * k * x);
    return [xScale(x), yScale(y)] as [number, number];
  });
  return (
    <PlotFrame>
      <polyline points={polyline(wave)} fill="none" stroke="#db2777" strokeWidth="4" />
      <text x="98" y="62" fill="currentColor" fontSize="16">Fourier approximation of a square wave</text>
      <text x="98" y="316" fill="currentColor" fontSize="14">odd harmonics = {harmonics} · add frequencies to sharpen the edges</text>
    </PlotFrame>
  );
}

function StaticVisual({ kind }: { kind: PlaygroundKind }) {
  if (kind === 'epsilon-delta') return <EpsilonDelta epsilon={0.45} staticOnly />;
  if (kind === 'tangent') return <Tangent a={1.1} />;
  if (kind === 'riemann') return <Riemann n={8} />;
  if (kind === 'surface') return <Surface yaw={0.55} pitch={0.48} />;
  if (kind === 'vector-field') return <VectorField scale={1} />;
  return <Fourier harmonics={5} />;
}

export default function InteractivePlayground({ kind, title, description, staticCaption }: InteractivePlaygroundProps) {
  const [epsilon, setEpsilon] = useState(0.45);
  const [a, setA] = useState(1.1);
  const [n, setN] = useState(8);
  const [harmonics, setHarmonics] = useState(5);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState({ yaw: 0.55, pitch: 0.48 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const controls = useMemo(() => {
    if (kind === 'epsilon-delta') return <label>ε = {epsilon.toFixed(2)}<input aria-label="Epsilon" type="range" min="0.08" max="0.8" step="0.01" value={epsilon} onChange={(event) => setEpsilon(Number(event.target.value))} /></label>;
    if (kind === 'tangent') return <label>a = {a.toFixed(2)}<input aria-label="Point a" type="range" min="-2.2" max="2.2" step="0.01" value={a} onChange={(event) => setA(Number(event.target.value))} /></label>;
    if (kind === 'riemann') return <label>n = {n}<input aria-label="Number of rectangles" type="range" min="2" max="32" step="1" value={n} onChange={(event) => setN(Number(event.target.value))} /></label>;
    if (kind === 'surface') return <span>Drag inside the plot to rotate</span>;
    if (kind === 'vector-field') return <label>strength = {scale.toFixed(1)}×<input aria-label="Field strength" type="range" min="0.3" max="2" step="0.1" value={scale} onChange={(event) => setScale(Number(event.target.value))} /></label>;
    return <label>odd harmonics = {harmonics}<input aria-label="Number of harmonics" type="range" min="1" max="15" step="2" value={harmonics} onChange={(event) => setHarmonics(Number(event.target.value))} /></label>;
  }, [a, epsilon, harmonics, kind, n, scale]);

  const visual = kind === 'epsilon-delta'
    ? <EpsilonDelta epsilon={epsilon} />
    : kind === 'tangent'
      ? <Tangent a={a} />
      : kind === 'riemann'
        ? <Riemann n={n} />
        : kind === 'surface'
          ? <Surface yaw={rotation.yaw} pitch={rotation.pitch} />
          : kind === 'vector-field'
            ? <VectorField scale={scale} />
            : <Fourier harmonics={harmonics} />;

  return (
    <figure className="interactive-playground my-12 overflow-hidden rounded-[2rem] border border-light-border bg-light-surface p-5 shadow-xl dark:border-dark-border dark:bg-dark-surface md:p-7" data-playground-kind={kind}>
      <div className="interactive-playground-screen">
        <figcaption className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div><div className="label-caps">Interactive exploration</div><h3 className="mt-1 text-lg font-black text-light-text dark:text-dark-text">{title}</h3>{description && <p className="mt-1 max-w-2xl text-sm text-light-muted dark:text-dark-muted">{description}</p>}</div>
          <div className="interactive-playground-controls">{controls}</div>
        </figcaption>
        <div
          className="text-light-text dark:text-dark-text"
          onPointerDown={(event) => kind === 'surface' && (drag.current = { x: event.clientX, y: event.clientY })}
          onPointerMove={(event) => {
            if (kind !== 'surface' || !drag.current) return;
            const dx = event.clientX - drag.current.x;
            const dy = event.clientY - drag.current.y;
            drag.current = { x: event.clientX, y: event.clientY };
            setRotation((current) => ({ yaw: current.yaw + dx * 0.012, pitch: Math.max(-1.1, Math.min(1.1, current.pitch + dy * 0.012)) }));
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerLeave={() => { drag.current = null; }}
          style={{ touchAction: kind === 'surface' ? 'none' : 'auto', cursor: kind === 'surface' ? 'grab' : 'default' }}
        >{visual}</div>
      </div>
      <div className="interactive-playground-print" aria-label={staticCaption || `${title} static illustration`}>
        <div className="label-caps">{title}</div>
        <StaticVisual kind={kind} />
        <figcaption className="mt-2 text-sm text-slate-600">{staticCaption || description || 'Static illustration of the interactive exploration.'}</figcaption>
      </div>
    </figure>
  );
}
