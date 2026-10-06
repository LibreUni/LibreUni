import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Boundary = 'process' | 'container' | 'vm';

const models: Record<Boundary, {
  label: string;
  tenant: string;
  peer: string;
  implementation: string;
  stages: [string, string, string];
  boundary: string;
  distinction: string;
}> = {
  process: {
    label: 'Process address space',
    tenant: 'Process A',
    peer: 'Process B',
    implementation: 'Shared host kernel',
    stages: ['Process A user space', 'shared host kernel', 'hardware or firmware'],
    boundary: 'between each process and the shared kernel',
    distinction: 'Separate page tables and kernel checks contain ordinary user-space faults. Every process still trusts the same kernel.',
  },
  container: {
    label: 'Container',
    tenant: 'Container A',
    peer: 'Container B',
    implementation: 'Shared host kernel',
    stages: ['Container A boundary', 'shared host kernel', 'hardware or firmware'],
    boundary: 'between each container view and the shared kernel',
    distinction: 'Namespaces change what a workload can see and cgroups account for resources. They do not place a separate kernel beneath each container.',
  },
  vm: {
    label: 'Virtual machine',
    tenant: 'VM A + guest kernel',
    peer: 'VM B + guest kernel',
    implementation: 'Shared VMM / hypervisor',
    stages: ['VM A, including its guest kernel', 'shared VMM / hypervisor', 'hardware or firmware'],
    boundary: 'between each guest kernel and the shared VMM',
    distinction: 'A guest-kernel compromise remains inside one VM under this model. A VMM escape crosses the boundary shared by sibling VMs.',
  },
};

function BoundaryView({ boundary, compromise }: { boundary: Boundary; compromise: number }) {
  const model = models[boundary];
  const cards = [
    { label: model.tenant, detail: 'selected isolation domain', affected: true, origin: compromise === 0 },
    { label: model.peer, detail: 'sibling tenant', affected: compromise >= 1, origin: false },
    { label: model.implementation, detail: 'boundary implementation', affected: compromise >= 1, origin: compromise === 1 },
    { label: 'Hardware + firmware', detail: 'lowest trusted substrate', affected: compromise >= 2, origin: compromise === 2 },
  ];
  const exposed = cards.filter((card) => card.affected).map((card) => card.label).join(', ');

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-4" aria-label={`${model.label} trust model; deepest compromised layer is ${model.stages[compromise]}`}>
        {cards.map((card, index) => (
          <div key={card.label} className="relative">
            <section className={`min-h-32 rounded-xl border p-4 ${card.origin ? 'border-rose-600 bg-rose-600/15 ring-2 ring-rose-600' : card.affected ? 'border-rose-400 bg-rose-500/5' : 'border-sky-500/35 bg-sky-500/5'}`}>
              <div className="text-[10px] font-black uppercase tracking-wide">{index < 2 ? 'tenant' : index === 2 ? 'shared trust' : 'substrate'}</div>
              <div className="mt-2 text-sm font-black">{card.label}</div>
              <div className="mt-2 text-xs leading-relaxed text-light-muted dark:text-dark-muted">{card.detail}</div>
              <div className="mt-3 text-[11px] font-bold">{card.affected ? (card.origin ? 'compromise starts here' : 'inside blast radius') : 'outside modeled blast radius'}</div>
            </section>
            {index === 1 && <div className="my-2 border-b-4 border-dashed border-primary text-center text-[10px] font-black uppercase tracking-wide text-primary md:absolute md:-right-2 md:inset-y-0 md:my-0 md:border-b-0 md:border-r-4"><span className="bg-light-surface px-1 dark:bg-dark-surface md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:-rotate-90">boundary</span></div>}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <p className="m-0 rounded-xl border border-light-border p-4 text-sm leading-relaxed dark:border-dark-border"><strong>Boundary location:</strong> {model.boundary}. {model.distinction}</p>
        <p className="m-0 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm leading-relaxed"><strong>Modeled blast radius:</strong> {exposed}.</p>
      </div>
    </div>
  );
}

export default function IsolationBoundaryPlayground() {
  const [boundary, setBoundary] = useState<Boundary>('container');
  const [compromise, setCompromise] = useState(0);
  const model = models[boundary];

  return (
    <InteractivePlayground
      title="Move a compromise across an isolation boundary"
      description="Select a process, container, or virtual-machine boundary, then move the deepest compromised trusted layer. The model distinguishes a tenant failure from compromise of the mechanism shared by sibling tenants."
      status={`${model.stages[compromise]} compromised · ${model.label}`}
      onReset={() => { setBoundary('container'); setCompromise(0); }}
      staticContent={<BoundaryView boundary="container" compromise={1} />}
      staticCaption="Static state: a host-kernel compromise crosses every container boundary because containers share that kernel. Namespace and cgroup isolation cannot contain failure of their own implementation."
    >
      <div className="interactive-playground-controls mb-5 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-[15rem_1fr] md:items-end">
        <label className="grid gap-1 text-sm font-semibold">Isolation mechanism
          <select aria-label="Isolation mechanism" className="input-field" value={boundary} onChange={(event) => { setBoundary(event.target.value as Boundary); setCompromise(0); }}>
            <option value="process">Process address space</option><option value="container">Container</option><option value="vm">Virtual machine</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Deepest compromised layer = {model.stages[compromise]}
          <input aria-label="Deepest compromised isolation layer" type="range" min="0" max="2" value={compromise} onChange={(event) => setCompromise(Number(event.target.value))} />
        </label>
      </div>
      <BoundaryView boundary={boundary} compromise={compromise} />
      <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Scope: a logical trust boundary, not an exploitability score. Sandboxes, seccomp filters, mandatory access control, nested virtualization, device assignment, firmware, denial of service, and side channels alter the real boundary and require separate evidence.</p>
    </InteractivePlayground>
  );
}
