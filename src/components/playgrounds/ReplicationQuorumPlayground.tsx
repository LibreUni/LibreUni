import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { quorumState } from './databaseModels.mjs';

function Replica({ index, failed }: { index: number; failed: boolean }) {
  return <div className={`rounded-xl border p-4 text-center text-sm font-bold ${failed ? 'border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-300' : 'border-primary/35 bg-primary/5'}`}>Replica {index + 1}<span className="mt-1 block text-xs font-medium">{failed ? 'unavailable' : 'reachable'}</span></div>;
}

export default function ReplicationQuorumPlayground() {
  const [replicas, setReplicas] = useState(3);
  const [readQuorum, setReadQuorum] = useState(2);
  const [writeQuorum, setWriteQuorum] = useState(2);
  const [failed, setFailed] = useState(0);
  const { reachable, intersects, readAvailable, writeAvailable } = quorumState(replicas, readQuorum, writeQuorum, failed);
  const status = useMemo(() => `${intersects ? 'Read/write quorums intersect.' : 'Read/write quorums can be disjoint.'} Reads are ${readAvailable ? 'available' : 'blocked'}; writes are ${writeAvailable ? 'available' : 'blocked'}.`, [intersects, readAvailable, writeAvailable]);
  const chooseReplicas = (next: number) => {
    setReplicas(next);
    setReadQuorum((current) => Math.min(current, next));
    setWriteQuorum((current) => Math.min(current, next));
    setFailed((current) => Math.min(current, next));
  };
  return <InteractivePlayground
    title="Test a quorum contract against failures"
    description="Set the replica count, read quorum, write quorum, and unavailable replicas. The model exposes the basic intersection condition R + W > N and its availability cost."
    status={status}
    staticContent={<div className="grid gap-3 sm:grid-cols-3"><Replica index={0} failed={false} /><Replica index={1} failed={false} /><Replica index={2} failed={false} /><p className="sm:col-span-3 m-0 text-sm">N = 3, R = 2, W = 2. Every read quorum intersects every write quorum, and one replica may be unavailable while reads and writes remain possible.</p></div>}
    staticCaption="Static state: a three-replica, R=2/W=2 configuration provides quorum intersection and tolerates one unavailable replica for both operations."
    onReset={() => { setReplicas(3); setReadQuorum(2); setWriteQuorum(2); setFailed(0); }}
  >
    <div className="interactive-playground-controls mb-5 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Replica count N<select aria-label="Replica count" className="input-field" value={replicas} onChange={(event) => chooseReplicas(Number(event.target.value))}><option value={3}>3 replicas</option><option value={5}>5 replicas</option></select></label><label className="grid gap-2 text-sm font-semibold">Read quorum R = {readQuorum}<input aria-label="Read quorum" type="range" min="1" max={replicas} value={readQuorum} onChange={(event) => setReadQuorum(Number(event.target.value))} /></label><label className="grid gap-2 text-sm font-semibold">Write quorum W = {writeQuorum}<input aria-label="Write quorum" type="range" min="1" max={replicas} value={writeQuorum} onChange={(event) => setWriteQuorum(Number(event.target.value))} /></label><label className="grid gap-2 text-sm font-semibold">Unavailable replicas = {failed}<input aria-label="Unavailable replicas" type="range" min="0" max={replicas} value={failed} onChange={(event) => setFailed(Number(event.target.value))} /></label></div>
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: replicas }, (_, index) => <Replica key={index} index={index} failed={index >= reachable} />)}</div>
    <div className="mt-4 grid gap-3 md:grid-cols-3"><div className={`rounded-xl border p-4 text-sm ${intersects ? 'border-emerald-500/35 bg-emerald-500/5' : 'border-rose-500/35 bg-rose-500/5'}`}><strong>Intersection</strong><br />R + W = {readQuorum + writeQuorum} {intersects ? '>' : '≤'} N = {replicas}</div><div className={`rounded-xl border p-4 text-sm ${readAvailable ? 'border-primary/35 bg-primary/5' : 'border-rose-500/35 bg-rose-500/5'}`}><strong>Read availability</strong><br />{reachable} reachable, need {readQuorum}</div><div className={`rounded-xl border p-4 text-sm ${writeAvailable ? 'border-primary/35 bg-primary/5' : 'border-rose-500/35 bg-rose-500/5'}`}><strong>Write availability</strong><br />{reachable} reachable, need {writeQuorum}</div></div>
    <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: replicas are non-Byzantine, quorums are chosen from one fixed membership, an acknowledged write reaches W replicas, and a read consults R replicas with version reconciliation. Intersection alone does not solve concurrent writes, leader fencing, stale membership, clock uncertainty, anti-entropy, or application-level conflict resolution.</p>
  </InteractivePlayground>;
}
