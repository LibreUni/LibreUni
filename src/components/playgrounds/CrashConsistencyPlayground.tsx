import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Protocol = 'unsafe' | 'ordered' | 'journal' | 'cow';
type DiskState = { data: boolean; allocated: boolean; referenced: boolean; committed: boolean; root: boolean };

const protocols: Record<Protocol, { label: string; events: string[] }> = {
  unsafe: { label: 'Metadata first, no recovery protocol', events: ['inode references block 2 and size becomes 2', 'bitmap marks block 2 allocated', 'block 2 receives data B'] },
  ordered: { label: 'Data-before-metadata ordering', events: ['block 2 receives data B', 'bitmap marks block 2 allocated', 'inode references block 2 and size becomes 2'] },
  journal: { label: 'Write-ahead journal', events: ['journal records the complete transaction', 'journal commit record reaches stable storage', 'home data block is written', 'home bitmap is written', 'home inode is written', 'journal transaction is checkpointed'] },
  cow: { label: 'Copy-on-write tree', events: ['new data block receives B', 'new inode/tree path references the data', 'root pointer atomically selects the new tree'] },
};

export function diskAtCrash(protocol: Protocol, step: number): DiskState {
  if (protocol === 'unsafe') return { data: step >= 3, allocated: step >= 2, referenced: step >= 1, committed: false, root: true };
  if (protocol === 'ordered') return { data: step >= 1, allocated: step >= 2, referenced: step >= 3, committed: false, root: true };
  if (protocol === 'journal') return { data: step >= 3, allocated: step >= 4, referenced: step >= 5, committed: step >= 2, root: true };
  return { data: step >= 1, allocated: step >= 3, referenced: step >= 3, committed: step >= 3, root: step >= 3 };
}

export function recover(protocol: Protocol, state: DiskState) {
  if (protocol === 'journal') {
    return state.committed
      ? { state: { data: true, allocated: true, referenced: true, committed: true, root: true }, verdict: 'Committed journal transaction is replayed: post-state is restored.' }
      : { state: { data: false, allocated: false, referenced: false, committed: false, root: true }, verdict: 'No commit record: the incomplete transaction is ignored and the pre-state remains.' };
  }
  if (protocol === 'cow') {
    return state.root
      ? { state: { ...state, data: true, allocated: true, referenced: true }, verdict: 'New root is durable: readers reach the complete post-state.' }
      : state.data || state.referenced
        ? { state: { data: false, allocated: false, referenced: false, committed: false, root: false }, verdict: 'Old root remains authoritative; unreachable new blocks require reclamation.' }
        : { state: { data: false, allocated: false, referenced: false, committed: false, root: false }, verdict: 'Old root remains authoritative; no new block is durable.' };
  }
  if (state.referenced && (!state.allocated || !state.data)) return { state, verdict: 'Inconsistent: the inode exposes a block that is free or contains stale data.' };
  if (state.allocated && !state.referenced) return { state, verdict: 'Consistent namespace but leaked allocation; a checker can reclaim the unreachable block.' };
  if (state.data && !state.allocated && !state.referenced) return { state, verdict: 'Pre-state remains visible; the untracked data write is unreachable.' };
  if (state.data && state.allocated && state.referenced) return { state, verdict: 'Complete post-state is visible.' };
  return { state, verdict: 'Pre-state is visible.' };
}

function StateDiagram({ title, state }: { title: string; state: DiskState }) {
  const items = [
    { label: 'data block 2', value: state.data ? 'B written' : 'old / absent', ok: state.data },
    { label: 'allocation bitmap', value: state.allocated ? 'allocated' : 'free', ok: state.allocated },
    { label: 'inode / active root', value: state.referenced ? 'references block 2' : 'old file only', ok: state.referenced },
  ];
  return (
    <section className="rounded-xl border border-light-border p-4 dark:border-dark-border">
      <h4 className="m-0 text-xs font-black uppercase tracking-[0.13em] text-light-muted dark:text-dark-muted">{title}</h4>
      <div className="mt-3 grid gap-2">
        {items.map((item) => <div key={item.label} className={`rounded-lg border p-3 ${item.ok ? 'border-primary/35 bg-primary/5' : 'border-light-border bg-light-bg/60 dark:border-dark-border dark:bg-dark-bg/40'}`}><div className="text-[10px] font-black uppercase tracking-wide">{item.label}</div><div className="mt-1 font-mono text-sm font-bold">{item.value}</div></div>)}
      </div>
    </section>
  );
}

function CrashView({ protocol, step }: { protocol: Protocol; step: number }) {
  const disk = diskAtCrash(protocol, step);
  const recovered = recover(protocol, disk);
  const verdictStyle = recovered.verdict.startsWith('Inconsistent')
    ? 'border-rose-500/35 bg-rose-500/5'
    : /leak|reclaim|unreachable/i.test(recovered.verdict)
      ? 'border-amber-500/40 bg-amber-500/5'
      : 'border-emerald-500/35 bg-emerald-500/5';
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <StateDiagram title="On disk when power fails" state={disk} />
        <StateDiagram title="Visible after recovery" state={recovered.state} />
      </div>
      <div className={`mt-4 rounded-xl border p-4 text-sm ${verdictStyle}`}><strong>Recovery result:</strong> {recovered.verdict}</div>
    </div>
  );
}

export default function CrashConsistencyPlayground() {
  const [protocol, setProtocol] = useState<Protocol>('journal');
  const [step, setStep] = useState(2);
  const selected = protocols[protocol];
  const event = step === 0 ? 'Crash before the first write' : `Crash after: ${selected.events[step - 1]}`;

  const chooseProtocol = (next: Protocol) => {
    setProtocol(next);
    setStep(Math.min(2, protocols[next].events.length));
  };

  return (
    <InteractivePlayground
      title="Pull the power during a file-system update"
      description="Append block B to a one-block file. Move the crash point through unsafe ordering, ordered metadata, write-ahead journaling, and copy-on-write publication; then inspect what recovery can prove."
      status={event}
      onReset={() => { setProtocol('journal'); setStep(2); }}
      staticContent={<CrashView protocol="journal" step={2} />}
      staticCaption="Static state: power fails after a durable journal commit but before home-location writes. Recovery replays the committed transaction and restores the complete post-state."
    >
      <div className="interactive-playground-controls mb-5 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-[18rem_1fr] md:items-end">
        <label className="grid gap-1 text-sm font-semibold">Update protocol
          <select aria-label="File-system update protocol" className="input-field" value={protocol} onChange={(event) => chooseProtocol(event.target.value as Protocol)}>
            {Object.entries(protocols).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Crash point = {step} of {selected.events.length}
          <input aria-label="File system crash point" type="range" min="0" max={selected.events.length} value={step} onChange={(event) => setStep(Number(event.target.value))} />
        </label>
      </div>
      <ol className="mb-5 grid gap-2 pl-0 sm:grid-cols-2 lg:grid-cols-3">
        {selected.events.map((item, index) => <li key={item} className={`list-none rounded-lg border p-3 text-xs ${index < step ? 'border-primary/35 bg-primary/5' : 'border-light-border text-light-muted dark:border-dark-border dark:text-dark-muted'}`}><strong>{index + 1}.</strong> {item}</li>)}
      </ol>
      <CrashView protocol={protocol} step={step} />
      <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: one append, atomic sector writes, stable write order once acknowledged, and no torn writes. Real file systems must also handle caches that reorder or lose writes, checksums, concurrent transactions, device flush semantics, and recovery idempotence.</p>
    </InteractivePlayground>
  );
}
