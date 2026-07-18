import React, { useState } from 'react';
import MathText from './MathText';

interface Props {
  title: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  kind: 'heap' | 'tree' | 'list' | 'graph' | 'hash';
}

function MiniStructure({ kind }: Pick<Props, 'kind'>) {
  if (kind === 'heap' || kind === 'tree') return <svg viewBox="0 0 260 130" role="img" aria-label={`${kind} exercise diagram`} className="h-32 w-full"><path d="M130 30L75 75M130 30L185 75M75 75L45 115M75 75L105 115M185 75L215 115" stroke="currentColor" strokeWidth="3" fill="none" /><circle cx="130" cy="30" r="18" fill="#bbf7d0" stroke="currentColor" strokeWidth="3" /><circle cx="75" cy="75" r="18" fill="#dbeafe" stroke="currentColor" strokeWidth="3" /><circle cx="185" cy="75" r="18" fill="#dbeafe" stroke="currentColor" strokeWidth="3" /><circle cx="45" cy="115" r="14" fill="#dbeafe" stroke="currentColor" strokeWidth="3" /><circle cx="105" cy="115" r="14" fill="#fecaca" stroke="currentColor" strokeWidth="3" /><circle cx="215" cy="115" r="14" fill="#dbeafe" stroke="currentColor" strokeWidth="3" /><text x="130" y="36" textAnchor="middle" fontSize="15">3</text><text x="75" y="81" textAnchor="middle" fontSize="15">8</text><text x="185" y="81" textAnchor="middle" fontSize="15">5</text><text x="105" y="120" textAnchor="middle" fontSize="13">1</text></svg>;
  if (kind === 'list') return <svg viewBox="0 0 300 90" role="img" aria-label="linked list exercise diagram" className="h-24 w-full"><rect x="20" y="25" width="65" height="38" rx="7" fill="#bbf7d0" stroke="currentColor" strokeWidth="3" /><rect x="118" y="25" width="65" height="38" rx="7" fill="#dbeafe" stroke="currentColor" strokeWidth="3" /><rect x="216" y="25" width="65" height="38" rx="7" fill="#dbeafe" stroke="currentColor" strokeWidth="3" /><path d="M85 44h33M183 44h33" stroke="currentColor" strokeWidth="3" markerEnd="url(#e)" /><text x="52" y="50" textAnchor="middle" fontSize="15">head</text><text x="150" y="50" textAnchor="middle" fontSize="15">12</text><text x="248" y="50" textAnchor="middle" fontSize="15">27</text><defs><marker id="e" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor" /></marker></defs></svg>;
  if (kind === 'hash') return <svg viewBox="0 0 300 90" role="img" aria-label="hash table exercise diagram" className="h-24 w-full">{['18','T','32','∅','46'].map((v,i)=><g key={v+i}><rect x={15+i*56} y="25" width="45" height="38" rx="6" fill={v==='T'?'#fed7aa':v==='∅'?'#f1f5f9':'#dbeafe'} stroke="currentColor" strokeWidth="2" /><text x={37+i*56} y="50" textAnchor="middle" fontSize="14">{v}</text><text x={37+i*56} y="78" textAnchor="middle" fontSize="11">{i}</text></g>)}</svg>;
  return <svg viewBox="0 0 300 100" role="img" aria-label="graph exercise diagram" className="h-24 w-full"><path d="M55 55L150 25L245 60L170 88L55 55M150 25L170 88" stroke="currentColor" strokeWidth="3" fill="none" /><circle cx="55" cy="55" r="18" fill="#bbf7d0" stroke="currentColor" strokeWidth="3" /><circle cx="150" cy="25" r="18" fill="#dbeafe" stroke="currentColor" strokeWidth="3" /><circle cx="245" cy="60" r="18" fill="#dbeafe" stroke="currentColor" strokeWidth="3" /><circle cx="170" cy="88" r="18" fill="#dbeafe" stroke="currentColor" strokeWidth="3" /></svg>;
}

export default function StructureExercise({ title, prompt, options, answer, explanation, kind }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const checked = selected !== null;
  return <section className="structure-exercise my-10 rounded-2xl border border-primary/30 bg-primary/5 p-5" aria-label={title}>
    <h3 className="mt-0 text-lg font-bold">{title}</h3>
    <MiniStructure kind={kind} />
    <p className="text-sm leading-relaxed"><MathText>{prompt}</MathText></p>
    <div className="grid gap-2 sm:grid-cols-2">{options.map((option, index) => <button type="button" key={option} disabled={checked} onClick={() => setSelected(index)} className={`rounded-lg border p-3 text-left text-sm ${checked && index === answer ? 'border-emerald-500 bg-emerald-500/10' : checked && index === selected ? 'border-rose-500 bg-rose-500/10' : 'border-light-border dark:border-dark-border'}`}><MathText>{option}</MathText></button>)}</div>
    {checked && <p className="mb-0 mt-4 text-sm leading-relaxed"><strong>{selected === answer ? 'Correct.' : 'Not quite.'}</strong> <MathText>{explanation}</MathText></p>}
  </section>;
}
