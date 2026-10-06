import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { recoveryState } from './databaseModels.mjs';

const records = [
  { transaction: 'T1', text: 'BEGIN T1', kind: 'begin' },
  { transaction: 'T1', text: 'UPDATE A: 10 → 7', kind: 'update' },
  { transaction: 'T2', text: 'BEGIN T2', kind: 'begin' },
  { transaction: 'T2', text: 'UPDATE B: 20 → 30', kind: 'update' },
  { transaction: 'T1', text: 'COMMIT T1', kind: 'commit' },
];

function RecoveryState({ durable }: { durable: number }) {
  const { committed, t1UpdateLogged, t2UpdateLogged } = recoveryState(durable);
  return <div className="grid gap-3 md:grid-cols-3"><section className="rounded-xl border border-light-border p-4 dark:border-dark-border"><h4 className="m-0 text-xs font-black uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted">Possible page values at crash</h4><p className="mb-0 mt-3 font-mono">A {t1UpdateLogged ? '∈ {10, 7}' : '= 10'}<br />B {t2UpdateLogged ? '∈ {20, 30}' : '= 20'}</p><p className="mb-0 mt-2 text-xs text-light-muted dark:text-dark-muted">A durable update log permits, but does not prove, its page write.</p></section><section className="rounded-xl border border-light-border p-4 dark:border-dark-border"><h4 className="m-0 text-xs font-black uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted">Winner / loser</h4><p className="mb-0 mt-3 text-sm">T1: {committed ? 'winner — ensure A = 7' : t1UpdateLogged ? 'loser — roll back A if present' : 'no durable update'}<br />T2: {t2UpdateLogged ? 'loser — roll back B if present' : 'no durable update'}</p></section><section className="rounded-xl border border-light-border p-4 dark:border-dark-border"><h4 className="m-0 text-xs font-black uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted">After recovery</h4><p className="mb-0 mt-3 font-mono">A = {committed ? '7' : '10'}<br />B = 20</p></section></div>;
}

export default function RecoveryLogPlayground() {
  const [durable, setDurable] = useState(5);
  const current = durable === 0 ? 'Crash before any durable record.' : `Crash after durable log record ${durable}: ${records[durable - 1].text}`;
  return <InteractivePlayground
    title="Crash between log records; derive redo and undo"
    description="Move the crash point through a small write-ahead log. T1 changes A and commits; T2 changes B but never commits. Inspect which updates recovery may retain."
    status={current}
    staticContent={<RecoveryState durable={5} />}
    staticCaption="Static state: T1’s commit record is durable, so recovery ensures its update is reflected if necessary. T2 has no commit record, so recovery rolls its update back if it reached a page."
    onReset={() => setDurable(5)}
  >
    <label className="interactive-playground-controls mb-5 grid gap-2 rounded-xl border border-light-border bg-light-bg/60 p-4 text-sm font-semibold dark:border-dark-border dark:bg-dark-bg/40">Durable log prefix = {durable} of {records.length}<input aria-label="Durable log prefix" type="range" min="0" max={records.length} value={durable} onChange={(event) => setDurable(Number(event.target.value))} /></label>
    <ol className="mb-5 grid gap-2 pl-0 sm:grid-cols-2 lg:grid-cols-3">{records.map((record, index) => <li key={record.text} className={`list-none rounded-lg border p-3 text-sm ${index < durable ? 'border-primary/35 bg-primary/5' : 'border-light-border text-light-muted dark:border-dark-border dark:text-dark-muted'}`}><strong>{index + 1}.</strong> <span className="font-mono">{record.text}</span></li>)}</ol>
    <RecoveryState durable={durable} />
    <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: WAL forces each log record before its corresponding page write, but log durability does not reveal whether a page write happened before the crash. Log records are durable in the order shown; updates include before/after images; no torn pages or concurrent transactions appear. ARIES also performs analysis, tracks page LSNs, and repeats history before undo.</p>
  </InteractivePlayground>;
}
