import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { queryPlanCosts } from './databaseModels.mjs';

type Plan = 'scan-hash' | 'index-hash' | 'index-nested';

const labels: Record<Plan, string> = {
  'scan-hash': 'Sequential scan + hash join',
  'index-hash': 'Clustered index selection + hash join',
  'index-nested': 'Clustered index selection + nested loops',
};

function CostBar({ label, cost, best, selected = false }: { label: string; cost: number; best: boolean; selected?: boolean }) {
  return <div className={`rounded-lg border p-3 ${best ? 'border-primary/40 bg-primary/5' : 'border-light-border dark:border-dark-border'} ${selected ? 'ring-2 ring-primary/60 ring-offset-1 dark:ring-offset-dark-surface' : ''}`}><div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{label}</span><span className="flex items-center gap-2"><strong className="font-mono">{cost.toLocaleString()} I/Os</strong>{selected && <span className="rounded bg-primary/15 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-primary">Selected</span>}</span></div><div className="mt-2 h-2 overflow-hidden rounded bg-light-bg dark:bg-dark-bg"><div className="h-full rounded bg-primary" style={{ width: `${Math.max(4, Math.min(100, Math.log10(cost + 1) * 25))}%` }} /></div></div>;
}

export default function QueryPlanCostPlayground() {
  const [pages, setPages] = useState(1000);
  const [selectivity, setSelectivity] = useState(5);
  const [plan, setPlan] = useState<Plan>('scan-hash');
  const customerPages = 100;
  const { matchingPages, costs } = useMemo(() => queryPlanCosts(pages, selectivity, customerPages), [pages, selectivity]);
  const best = (Object.entries(costs) as Array<[Plan, number]>).reduce((current, candidate) => candidate[1] < current[1] ? candidate : current)[0];

  return (
    <InteractivePlayground
      title="Change selectivity; inspect the plan’s I/O model"
      description="Estimate a join between filtered Orders and a 100-page Customers relation. Selectivity determines the number of clustered Orders pages that survive the predicate."
      status={`${labels[plan]} estimates ${costs[plan].toLocaleString()} page I/Os. ${plan === best ? 'It is this model’s least-cost choice.' : `This model favors ${labels[best]} instead.`}`}
      staticContent={<div className="grid gap-3"><p className="m-0 text-sm">With 1,000 Orders pages and a 5% filter, 50 clustered pages qualify. Compare the three candidate plans under the same stated assumptions.</p><CostBar label="Sequential scan + hash join" cost={1100} best={false} /><CostBar label="Clustered index selection + hash join" cost={153} best /><CostBar label="Clustered index selection + nested loops" cost={5053} best={false} /></div>}
      staticCaption="Static state: low selectivity lets a clustered index avoid most Orders pages; the index-assisted hash plan costs 153 I/Os, versus 1,100 for the scan/hash plan and 5,053 for this nested-loops model."
      onReset={() => { setPages(1000); setSelectivity(5); setPlan('scan-hash'); }}
    >
      <div className="interactive-playground-controls mb-5 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold">Orders pages = {pages.toLocaleString()}<input aria-label="Orders pages" type="range" min="100" max="5000" step="100" value={pages} onChange={(event) => setPages(Number(event.target.value))} /></label>
        <label className="grid gap-2 text-sm font-semibold">Predicate selectivity = {selectivity}%<input aria-label="Predicate selectivity" type="range" min="1" max="100" value={selectivity} onChange={(event) => setSelectivity(Number(event.target.value))} /></label>
        <label className="grid gap-1 text-sm font-semibold">Candidate plan<select aria-label="Candidate plan" className="input-field" value={plan} onChange={(event) => setPlan(event.target.value as Plan)}>{(Object.keys(labels) as Plan[]).map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-light-border p-3 text-sm dark:border-dark-border"><span className="block text-xs text-light-muted dark:text-dark-muted">Qualifying Orders pages</span><strong>{matchingPages}</strong></div><div className="rounded-lg border border-light-border p-3 text-sm dark:border-dark-border"><span className="block text-xs text-light-muted dark:text-dark-muted">Customers pages</span><strong>{customerPages}</strong></div><div className="rounded-lg border border-light-border p-3 text-sm dark:border-dark-border"><span className="block text-xs text-light-muted dark:text-dark-muted">Index height</span><strong>3</strong></div></div>
      <div className="grid gap-3">{(Object.entries(costs) as Array<[Plan, number]>).map(([key, cost]) => <CostBar key={key} label={labels[key]} cost={cost} best={key === best} selected={key === plan} />)}</div>
      <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: page I/O dominates; the Orders index is clustered; hash memory is sufficient; one qualifying Orders page drives one nested-loop scan of Customers. It omits CPU, buffer residency, duplicate keys, non-clustered lookups, skew, parallelism, and stale statistics. Treat it as a reasoning model, not an optimizer prediction.</p>
    </InteractivePlayground>
  );
}
