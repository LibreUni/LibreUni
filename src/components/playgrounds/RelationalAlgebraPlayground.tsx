import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Mode = 'selection' | 'projection' | 'join';

const deployments = [
  { node_id: 'worker-01', service_id: 'S101', region: 'us-east' },
  { node_id: 'worker-02', service_id: 'S101', region: 'us-east' },
  { node_id: 'worker-03', service_id: 'S202', region: 'eu-west' },
  { node_id: 'worker-01', service_id: 'S202', region: 'eu-west' },
];

const services = [
  { service_id: 'S101', name: 'Auth API' },
  { service_id: 'S202', name: 'Billing Worker' },
];

function RelationTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: Array<Record<string, string>>;
}) {
  return (
    <section className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
      <h4 className="border-b border-light-border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-light-muted dark:border-dark-border dark:text-dark-muted">{title}</h4>
      <table className="w-full min-w-72 border-collapse text-left text-sm">
        <caption className="sr-only">{title}</caption>
        <thead className="bg-light-bg/70 text-xs text-light-muted dark:bg-dark-bg/40 dark:text-dark-muted">
          <tr>{columns.map((column) => <th key={column} scope="col" className="px-3 py-2 font-bold">{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => <tr key={`${title}-${index}`} className="border-t border-light-border dark:border-dark-border">{columns.map((column) => <td key={column} className="px-3 py-2 font-mono text-xs text-light-text dark:text-dark-text">{row[column]}</td>)}</tr>)}
          {rows.length === 0 && <tr><td colSpan={columns.length} className="px-3 py-3 text-sm text-light-muted dark:text-dark-muted">∅</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

function Result({ mode, region, distinct }: { mode: Mode; region: string; distinct: boolean }) {
  if (mode === 'selection') {
    const rows = deployments.filter((row) => row.region === region);
    return <RelationTable title={`σ region = '${region}' (Deployment)`} columns={['node_id', 'service_id', 'region']} rows={rows} />;
  }

  if (mode === 'projection') {
    const projected = deployments.map((row) => ({ node_id: row.node_id }));
    const rows = distinct ? projected.filter((row, index, all) => all.findIndex((other) => other.node_id === row.node_id) === index) : projected;
    return <RelationTable title={distinct ? 'π node_id (Deployment), set result' : 'SELECT node_id, bag result'} columns={['node_id']} rows={rows} />;
  }

  const rows = deployments.map((deployment) => {
    const service = services.find((candidate) => candidate.service_id === deployment.service_id);
    return { node_id: deployment.node_id, service_id: deployment.service_id, region: deployment.region, name: service?.name ?? '—' };
  });
  return <RelationTable title="Deployment ⋈ Deployment.service_id = Service.service_id Service" columns={['node_id', 'service_id', 'region', 'name']} rows={rows} />;
}

export default function RelationalAlgebraPlayground() {
  const [mode, setMode] = useState<Mode>('selection');
  const [region, setRegion] = useState('us-east');
  const [distinct, setDistinct] = useState(false);
  const description = mode === 'selection'
    ? `Selection keeps only ${region} tuples; it does not change their attributes.`
    : mode === 'projection'
      ? `${distinct ? 'Set projection removes duplicate worker-01.' : 'The bag result preserves worker-01 twice.'} Toggle duplicate elimination to compare semantics.`
      : 'The join matches every deployment with its service name through the explicit service_id predicate.';

  return (
    <InteractivePlayground
      title="Execute an algebra operator over visible relations"
      description="Choose a logical operator and inspect its input/output tables. The model separates set projection from SQL’s default bag behavior."
      status={description}
      staticContent={<div className="grid gap-4"><p className="m-0 text-sm">The static comparison keeps the input relations beside the result. The join has one output tuple for each deployment because <code>Service.service_id</code> is unique in this fixture.</p><div className="grid gap-4 lg:grid-cols-2"><RelationTable title="Deployment" columns={['node_id', 'service_id', 'region']} rows={deployments} /><RelationTable title="Service" columns={['service_id', 'name']} rows={services} /></div><Result mode="join" region="us-east" distinct /></div>}
      staticCaption="Static state: the equijoin carries each Deployment.service_id to the matching Service row and appends the service name; compare the input grain with the joined-pair grain."
      onReset={() => { setMode('selection'); setRegion('us-east'); setDistinct(false); }}
    >
      <div className="interactive-playground-controls mb-5 grid gap-3 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold">Relational operator</legend>
          <div className="flex flex-wrap gap-2">
          {([
            ['selection', 'Selection σ'],
            ['projection', 'Projection π'],
            ['join', 'Join ⋈'],
          ] as Array<[Mode, string]>).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={mode === value ? 'assessment-action-primary' : 'assessment-action-secondary'}>{label}</button>)}
          </div>
        </fieldset>
        {mode === 'selection' && <label className="grid max-w-xs gap-1 text-sm font-semibold">Region
          <select aria-label="Selected region" className="input-field" value={region} onChange={(event) => setRegion(event.target.value)}>
            <option value="us-east">us-east</option>
            <option value="eu-west">eu-west</option>
          </select>
        </label>}
        {mode === 'projection' && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={distinct} onChange={(event) => setDistinct(event.target.checked)} /> Eliminate duplicate rows (set semantics)</label>}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4"><RelationTable title="Deployment" columns={['node_id', 'service_id', 'region']} rows={deployments} />{mode === 'join' && <RelationTable title="Service" columns={['service_id', 'name']} rows={services} />}</div>
        <Result mode={mode} region={region} distinct={distinct} />
      </div>
      <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: all values are non-NULL, the join key is unique in Service, and result order is deliberately unspecified. A real SQL optimizer must additionally preserve NULL, bag, collation, volatility, and outer-join semantics.</p>
    </InteractivePlayground>
  );
}
