import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Mode = 'selection' | 'projection' | 'join';

const enrollments = [
  { sid: 'Ada', cid: 'DB101', term: '2026F' },
  { sid: 'Bo', cid: 'DB101', term: '2026F' },
  { sid: 'Cy', cid: 'DB202', term: '2027S' },
  { sid: 'Ada', cid: 'DB202', term: '2027S' },
];

const courses = [
  { cid: 'DB101', title: 'Data models' },
  { cid: 'DB202', title: 'Query systems' },
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

function Result({ mode, term, distinct }: { mode: Mode; term: string; distinct: boolean }) {
  if (mode === 'selection') {
    const rows = enrollments.filter((row) => row.term === term);
    return <RelationTable title={`σ term = '${term}' (Enrollment)`} columns={['sid', 'cid', 'term']} rows={rows} />;
  }

  if (mode === 'projection') {
    const projected = enrollments.map((row) => ({ sid: row.sid }));
    const rows = distinct ? projected.filter((row, index, all) => all.findIndex((other) => other.sid === row.sid) === index) : projected;
    return <RelationTable title={distinct ? 'π sid (Enrollment), set result' : 'SELECT sid, bag result'} columns={['sid']} rows={rows} />;
  }

  const rows = enrollments.map((enrollment) => {
    const course = courses.find((candidate) => candidate.cid === enrollment.cid);
    return { sid: enrollment.sid, cid: enrollment.cid, term: enrollment.term, title: course?.title ?? '—' };
  });
  return <RelationTable title="Enrollment ⋈ Enrollment.cid = Course.cid Course" columns={['sid', 'cid', 'term', 'title']} rows={rows} />;
}

export default function RelationalAlgebraPlayground() {
  const [mode, setMode] = useState<Mode>('selection');
  const [term, setTerm] = useState('2026F');
  const [distinct, setDistinct] = useState(false);
  const description = mode === 'selection'
    ? `Selection keeps only ${term} tuples; it does not change their attributes.`
    : mode === 'projection'
      ? `${distinct ? 'Set projection removes duplicate Ada.' : 'The bag result preserves Ada twice.'} Toggle duplicate elimination to compare semantics.`
      : 'The join matches every enrollment with its course title through the explicit cid predicate.';

  return (
    <InteractivePlayground
      title="Execute an algebra operator over visible relations"
      description="Choose a logical operator and inspect its input/output tables. The model separates set projection from SQL’s default bag behavior."
      status={description}
      staticContent={<div className="grid gap-4"><p className="m-0 text-sm">The static comparison keeps the input relations beside the result. The join has one output tuple for each enrollment because `Course.cid` is unique in this fixture.</p><div className="grid gap-4 lg:grid-cols-2"><RelationTable title="Enrollment" columns={['sid', 'cid', 'term']} rows={enrollments} /><RelationTable title="Course" columns={['cid', 'title']} rows={courses} /></div><Result mode="join" term="2026F" distinct /></div>}
      staticCaption="Static state: the equijoin carries each Enrollment.cid to the matching Course row and appends the title; compare the input grain with the joined-pair grain."
      onReset={() => { setMode('selection'); setTerm('2026F'); setDistinct(false); }}
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
        {mode === 'selection' && <label className="grid max-w-xs gap-1 text-sm font-semibold">Term
          <select aria-label="Selected term" className="input-field" value={term} onChange={(event) => setTerm(event.target.value)}>
            <option value="2026F">2026F</option>
            <option value="2027S">2027S</option>
          </select>
        </label>}
        {mode === 'projection' && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={distinct} onChange={(event) => setDistinct(event.target.checked)} /> Eliminate duplicate rows (set semantics)</label>}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4"><RelationTable title="Enrollment" columns={['sid', 'cid', 'term']} rows={enrollments} />{mode === 'join' && <RelationTable title="Course" columns={['cid', 'title']} rows={courses} />}</div>
        <Result mode={mode} term={term} distinct={distinct} />
      </div>
      <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: all values are non-NULL, the join key is unique in Course, and result order is deliberately unspecified. A real SQL optimizer must additionally preserve NULL, bag, collation, volatility, and outer-join semantics.</p>
    </InteractivePlayground>
  );
}
