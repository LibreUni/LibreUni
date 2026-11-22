import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { attributeClosure } from './databaseModels.mjs';

type Attribute = 'A' | 'B' | 'C' | 'D' | 'E';

const attributes: Attribute[] = ['A', 'B', 'C', 'D', 'E'];
const dependencies = [
  { id: 'ab', left: ['A'], right: ['B'], label: 'A → B' },
  { id: 'bc', left: ['B'], right: ['C'], label: 'B → C' },
  { id: 'cde', left: ['C', 'D'], right: ['E'], label: 'CD → E' },
];

function AttributeSet({ values }: { values: Attribute[] }) {
  return <span className="font-mono">&#123;{values.join(', ') || ' '}&#125;</span>;
}

export default function FunctionalDependencyPlayground() {
  const [seed, setSeed] = useState<Attribute[]>(['A', 'D']);
  const [closure, setClosure] = useState<Attribute[] | null>(null);
  const [trace, setTrace] = useState<string[]>([]);
  const [message, setMessage] = useState('Choose a determinant, then begin its closure.');

  const orderedClosure = useMemo(() => attributes.filter((attribute) => closure?.includes(attribute)), [closure]);
  const toggleSeed = (attribute: Attribute) => {
    setSeed((current) => current.includes(attribute) ? current.filter((value) => value !== attribute) : [...current, attribute]);
    setClosure(null);
    setTrace([]);
    setMessage('Seed changed. Begin a new closure trace.');
  };
  const begin = () => {
    setClosure(seed);
    setTrace([`Start with ${seed.join('') || '∅'}.`]);
    setMessage('Select a dependency whose left side is already in the closure.');
  };
  const apply = (dependency: typeof dependencies[number]) => {
    if (!closure) {
      setMessage('Begin the closure before firing a dependency.');
      return;
    }
    const enabled = dependency.left.every((attribute) => closure.includes(attribute as Attribute));
    if (!enabled) {
      setMessage(`${dependency.label} cannot fire: ${dependency.left.filter((attribute) => !closure.includes(attribute as Attribute)).join('')} is absent.`);
      return;
    }
    const additions = attributeClosure(closure, [[dependency.left, dependency.right]]).filter((attribute) => !closure.includes(attribute as Attribute)) as Attribute[];
    if (additions.length === 0) {
      setMessage(`${dependency.label} is already reflected in the closure.`);
      return;
    }
    setClosure((current) => attributes.filter((attribute) => [...(current ?? []), ...additions].includes(attribute)));
    setTrace((current) => [...current, `${dependency.label} adds ${additions.join('')}.`]);
    setMessage(`${dependency.label} is valid; inspect the new closure before continuing.`);
  };

  return (
    <InteractivePlayground
      title="Build an attribute closure one justified step at a time"
      description="The dependency set is A → B, B → C, and CD → E. Pick a seed, then try to fire only dependencies whose left-hand attributes are present."
      status={message}
      staticContent={<div className="grid gap-2"><p className="m-0">For seed <AttributeSet values={['A', 'D']} />, apply A → B, B → C, then CD → E.</p><p className="m-0 font-semibold">AD⁺ = <AttributeSet values={attributes} /></p></div>}
      staticCaption="Static state: AD is a key for the five-attribute universe because the closure reaches every attribute."
      onReset={() => { setSeed(['A', 'D']); setClosure(null); setTrace([]); setMessage('Choose a determinant, then begin its closure.'); }}
    >
      <div className="interactive-playground-controls mb-5 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-[1fr_auto] md:items-end">
        <fieldset className="grid gap-2"><legend className="text-sm font-semibold">Seed attributes</legend><div className="flex flex-wrap gap-2">{attributes.map((attribute) => <label key={attribute} className="flex items-center gap-1 rounded-lg border border-light-border px-3 py-2 text-sm font-semibold dark:border-dark-border"><input type="checkbox" checked={seed.includes(attribute)} onChange={() => toggleSeed(attribute)} /> {attribute}</label>)}</div></fieldset>
        <button type="button" onClick={begin} className="assessment-action-primary">Begin closure</button>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
        <section className="rounded-xl border border-light-border p-4 dark:border-dark-border"><h4 className="m-0 text-xs font-black uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted">Closure</h4><p className="mt-3 text-lg font-bold"><AttributeSet values={orderedClosure} /></p><div className="flex flex-wrap gap-2">{dependencies.map((dependency) => <button type="button" key={dependency.id} onClick={() => apply(dependency)} className="assessment-action-secondary">Apply {dependency.label}</button>)}</div></section>
        <section className="rounded-xl border border-light-border p-4 dark:border-dark-border"><h4 className="m-0 text-xs font-black uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted">Proof trace</h4><ol className="mb-0 mt-3 grid gap-2 pl-5 text-sm">{trace.length ? trace.map((item) => <li key={item}>{item}</li>) : <li>Nothing has been assumed or derived yet.</li>}</ol></section>
      </div>
      <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: dependencies are semantic rules over every legal instance of one relation. A closure proves implication only relative to the stated dependency set and attribute universe; it does not establish that a business rule is true.</p>
    </InteractivePlayground>
  );
}
