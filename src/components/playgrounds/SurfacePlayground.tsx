import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { PlotFrame, polyline } from './plot';

function Surface({ yaw, pitch }: { yaw: number; pitch: number }) {
  const project = (x: number, y: number, z: number): [number, number] => { const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch); const xx = x * cy - y * sy; const yy = x * sy + y * cy; const zz = z * cp - yy * sp; return [360 + xx * 95, 178 - (zz + yy * cp) * 52]; };
  const lines = [];
  for (let i = -3; i <= 3; i += 1) { const across = Array.from({ length: 25 }, (_, j) => { const y = -1.5 + (j / 24) * 3; return project(i * 0.5, y, Math.sin(i * 0.5) * Math.cos(y)); }); const along = Array.from({ length: 25 }, (_, j) => { const x = -1.5 + (j / 24) * 3; return project(x, i * 0.5, Math.sin(x) * Math.cos(i * 0.5)); }); lines.push(<polyline key={`a-${i}`} points={polyline(across)} fill="none" stroke="#2563eb" opacity=".72" />, <polyline key={`b-${i}`} points={polyline(along)} fill="none" stroke="#f97316" opacity=".72" />); }
  return <PlotFrame label="Rotatable wireframe of z equals sine x cosine y">{lines}<text x="98" y="62" fill="currentColor" fontSize="16">z = sin(x) cos(y)</text><text x="98" y="316" fill="currentColor" fontSize="14">drag inside the plot to rotate</text></PlotFrame>;
}

export default function SurfacePlayground() {
  const [rotation, setRotation] = useState({ yaw: 0.55, pitch: 0.48 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const update = (event: PointerEvent<HTMLDivElement>) => { if (!drag.current) return; const dx = event.clientX - drag.current.x; const dy = event.clientY - drag.current.y; drag.current = { x: event.clientX, y: event.clientY }; setRotation((current) => ({ yaw: current.yaw + dx * 0.012, pitch: Math.max(-1.1, Math.min(1.1, current.pitch + dy * 0.012)) })); };
  return <InteractivePlayground title="Rotate a surface" description="Drag the plot to inspect z=sin(x)cos(y) from different directions." staticCaption="A wireframe snapshot of z=sin(x)cos(y)." staticContent={<Surface yaw={0.55} pitch={0.48} />} status="Drag to rotate"><div className="cursor-grab touch-none" onPointerDown={(event) => { drag.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={update} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}><Surface yaw={rotation.yaw} pitch={rotation.pitch} /></div></InteractivePlayground>;
}
