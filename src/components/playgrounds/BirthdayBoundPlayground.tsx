import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { PlotFrame, polyline } from './plot';

const collisionProbability = (bits: number, exponent: number) => {
  const draws = 10 ** exponent;
  return 1 - Math.exp(-(draws * (draws - 1)) / (2 * 2 ** bits));
};
const x = (exponent: number) => 76 + (exponent / 12) * 600;
const y = (probability: number) => 276 - probability * 220;

function CollisionPlot({ bits, exponent }: { bits: number; exponent: number }) {
  const values = Array.from({ length: 121 }, (_, index) => index / 10);
  return <PlotFrame label="Birthday-bound collision probability by number of random draws">
    <polyline points={polyline(values.map((value) => [x(value), y(collisionProbability(bits, value))]))} fill="none" stroke="#3b82f6" strokeWidth="4" />
    <line x1={x(exponent)} x2={x(exponent)} y1="42" y2="276" stroke="currentColor" strokeDasharray="6 6" opacity="0.6" />
    {[0, 0.5, 1].map((probability) => <text key={probability} x="42" y={y(probability) + 5} fill="currentColor" fontSize="12">{Math.round(probability * 100)}%</text>)}
    <text x="520" y="306" fill="currentColor" fontSize="12">draws (log₁₀)</text>
  </PlotFrame>;
}

export default function BirthdayBoundPlayground() {
  const [bits, setBits] = useState(48);
  const [exponent, setExponent] = useState(6);
  const probability = collisionProbability(bits, exponent);
  return <InteractivePlayground
    title="Measure a nonce collision budget"
    description="Vary the random-space width and number of draws; the birthday term grows quadratically in the number of samples."
    status={`${(probability * 100).toPrecision(3)}% collision probability`}
    staticCaption="Collision risk depends on both random-space width and the total number of generated values under one key or policy boundary."
    staticContent={<CollisionPlot bits={48} exponent={6} />}
  >
    <div className="grid gap-4 md:grid-cols-2">
      <label className="interactive-playground-controls grid gap-2 text-sm font-semibold">Random value width = {bits} bits<input aria-label="Random value width" type="range" min="24" max="96" step="8" value={bits} onChange={(event) => setBits(Number(event.target.value))} /></label>
      <label className="interactive-playground-controls grid gap-2 text-sm font-semibold">Draws = 10^{exponent.toFixed(1)}<input aria-label="Number of draws exponent" type="range" min="2" max="12" step="0.1" value={exponent} onChange={(event) => setExponent(Number(event.target.value))} /></label>
    </div>
    <CollisionPlot bits={bits} exponent={exponent} />
  </InteractivePlayground>;
}
