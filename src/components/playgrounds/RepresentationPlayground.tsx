import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { decode } from './representationModel.mjs';

export default function RepresentationPlayground() {
  const [value, setValue] = useState(127);
  const [width, setWidth] = useState(8);
  const { residue, signed, bits } = decode(value, width);
  return <InteractivePlayground title="Expose fixed-width overflow" description="Change the mathematical input and word width. The hardware keeps the residue; signed interpretation changes at the sign boundary." status={`${bits} · unsigned ${residue} · signed ${signed}`} onReset={() => { setValue(127); setWidth(8); }} staticContent={<div className="rounded-xl border border-light-border p-4 font-mono dark:border-dark-border">01111111 → unsigned 127 · signed 127</div>} staticCaption="Static state: 8-bit 127 is representable under both unsigned and two's-complement interpretations; adding one crosses the signed boundary.">
    <div className="interactive-playground-controls grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-semibold">Mathematical input = {value}<input aria-label="Mathematical input" type="range" min="0" max="511" value={value} onChange={(event) => setValue(Number(event.target.value))} /></label>
      <label className="grid gap-2 text-sm font-semibold">Word width = {width} bits<input aria-label="Word width" type="range" min="4" max="12" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-light-border p-3 font-mono dark:border-dark-border">{bits}</div><div className="rounded-lg border border-light-border p-3 dark:border-dark-border">unsigned: <strong>{residue}</strong></div><div className="rounded-lg border border-light-border p-3 dark:border-dark-border">signed: <strong>{signed}</strong></div></div>
    <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: residue modulo 2^w and two's-complement decoding; language-level undefined behavior and floating point are deliberately excluded.</p>
  </InteractivePlayground>;
}
