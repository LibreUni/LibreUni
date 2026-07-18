import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { PlotFrame } from './plot';

function Field({ scale }: { scale: number }) {
  const arrows = [];
  for (let x = -3; x <= 3; x += 1) for (let y = -2; y <= 2; y += 1) { const vx = -y * scale * 12; const vy = x * scale * 12; const px = 360 + x * 70; const py = 178 - y * 50; arrows.push(<line key={`${x}-${y}`} x1={px - vx / 2} y1={py + vy / 2} x2={px + vx / 2} y2={py - vy / 2} stroke="#7c3aed" strokeWidth="2.5" markerEnd="url(#field-arrow)" />); }
  return <PlotFrame label="Rotational vector field"><defs><marker id="field-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#7c3aed" /></marker></defs>{arrows}<text x="98" y="62" fill="currentColor" fontSize="16">F(x,y) = (−y, x)</text><text x="98" y="316" fill="currentColor" fontSize="14">field strength = {scale.toFixed(1)}×</text></PlotFrame>;
}

export default function VectorFieldPlayground() {
  const [scale, setScale] = useState(1);
  return <InteractivePlayground title="Explore a rotational vector field" description="Scale the arrows and inspect circulation around the origin." staticCaption="The arrows of F(x,y)=(−y,x) are tangent to circles centered at the origin." staticContent={<Field scale={1} />} status={`strength = ${scale.toFixed(1)}×`}><label className="interactive-playground-controls flex items-center gap-3">strength = {scale.toFixed(1)}×<input aria-label="Field strength" type="range" min="0.3" max="2" step="0.1" value={scale} onChange={(event) => setScale(Number(event.target.value))} /></label><Field scale={scale} /></InteractivePlayground>;
}
