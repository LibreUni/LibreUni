import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

function OwnershipPanel({ safe, failed, size }: { safe: boolean; failed: boolean; size: number }) {
  const pointer = failed && !safe ? 'NULL' : '0x7f20';
  const allocation = failed ? 'original 32-byte block' : `${size}-byte block`;
  const reachable = !failed || safe;
  return <div className={`rounded-xl border p-4 ${reachable ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
    <div className="mb-3 text-sm font-black">{safe ? 'Temporary-pointer pattern' : 'Direct assignment'}</div>
    <div className="grid grid-cols-[5rem_1fr] items-center gap-3 text-sm">
      <code className="rounded bg-light-bg p-2 text-center dark:bg-dark-bg">ptr</code>
      <div className="rounded border border-light-border p-2 dark:border-dark-border">{pointer}</div>
      <span className="text-light-muted dark:text-dark-muted">heap</span>
      <div className="rounded border border-light-border p-2 dark:border-dark-border">{allocation} · {reachable ? 'reachable' : 'leaked'}</div>
    </div>
  </div>;
}

export default function AllocationFailurePlayground() {
  const [size, setSize] = useState(96);
  const [failed, setFailed] = useState(true);
  return <InteractivePlayground
    title="Inject a realloc failure"
    description="Compare ownership after assigning realloc directly versus preserving the original pointer until success."
    status={failed ? 'allocator returns NULL' : 'allocation succeeds'}
    staticCaption="A temporary pointer preserves ownership of the original allocation when realloc fails."
    staticContent={<OwnershipPanel safe failed size={96} />}
  >
    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
      <label className="interactive-playground-controls grid gap-2 text-sm font-semibold">Requested size = {size} bytes<input aria-label="Requested allocation size" type="range" min="40" max="256" step="8" value={size} onChange={(event) => setSize(Number(event.target.value))} /></label>
      <button type="button" className="min-h-11 rounded-lg border border-light-border px-4 text-sm font-bold dark:border-dark-border" onClick={() => setFailed((value) => !value)}>{failed ? 'Allow success' : 'Force failure'}</button>
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-2"><OwnershipPanel safe={false} failed={failed} size={size} /><OwnershipPanel safe failed={failed} size={size} /></div>
    <p className="text-sm">On failure, <code>ptr = realloc(ptr, size)</code> overwrites the only pointer to the live block. Assigning into <code>tmp</code> preserves the cleanup path.</p>
  </InteractivePlayground>;
}
