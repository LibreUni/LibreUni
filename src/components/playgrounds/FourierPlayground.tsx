import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { PlotFrame, polyline } from './plot';

function Wave({ harmonics }: { harmonics: number }) {
  const xScale = (x: number) => 76 + x * 590;
  const yScale = (y: number) => 178 - y * 82;
  const wave = Array.from({ length: 180 }, (_, i) => { const x = i / 179; let y = 0; for (let k = 1; k <= harmonics; k += 2) y += (4 / (Math.PI * k)) * Math.sin(2 * Math.PI * k * x); return [xScale(x), yScale(y)] as [number, number]; });
  return <PlotFrame label="Fourier approximation of a square wave"><polyline points={polyline(wave)} fill="none" stroke="#db2777" strokeWidth="4" /><text x="98" y="62" fill="currentColor" fontSize="16">Fourier approximation of a square wave</text><text x="98" y="316" fill="currentColor" fontSize="14">odd harmonics = {harmonics}</text></PlotFrame>;
}

export default function FourierPlayground() {
  const [harmonics, setHarmonics] = useState(5);
  return <InteractivePlayground title="Build a square wave from harmonics" description="Add odd frequencies and watch smooth sine waves sharpen the edges." staticCaption="The first odd harmonics reveal the square-wave shape." staticContent={<Wave harmonics={5} />} status={`${harmonics} odd harmonics`}><label className="interactive-playground-controls flex items-center gap-3">odd harmonics = {harmonics}<input aria-label="Number of harmonics" type="range" min="1" max="15" step="2" value={harmonics} onChange={(event) => setHarmonics(Number(event.target.value))} /></label><Wave harmonics={harmonics} /></InteractivePlayground>;
}
