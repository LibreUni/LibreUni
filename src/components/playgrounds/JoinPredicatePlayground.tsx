import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Placement = 'on' | 'where';

const students = [
  { id: 's-001', name: 'Ada' },
  { id: 's-002', name: 'Bo' },
  { id: 's-003', name: 'Cy' },
];

const enrollments = [
  { studentId: 's-001', course: 'DB101', grade: 87 },
  { studentId: 's-002', course: 'DB101', grade: 40 },
];

function ResultTable({ placement, threshold }: { placement: Placement; threshold: number }) {
  const rows = useMemo(() => students.flatMap((student) => {
    const matches = enrollments.filter((enrollment) => enrollment.studentId === student.id);
    const joined = matches.length ? matches.map((match) => ({ name: student.name, course: match.course, grade: String(match.grade) })) : [{ name: student.name, course: 'NULL', grade: 'NULL' }];
    if (placement === 'on') {
      const qualifying = matches.filter((match) => match.grade >= threshold).map((match) => ({ name: student.name, course: match.course, grade: String(match.grade) }));
      return qualifying.length ? qualifying : [{ name: student.name, course: 'NULL', grade: 'NULL' }];
    }
    return joined.filter((row) => row.grade !== 'NULL' && Number(row.grade) >= threshold);
  }), [placement, threshold]);
  return <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border"><table className="w-full min-w-72 text-left text-sm"><caption className="sr-only">Left-join result with the grade predicate in {placement === 'on' ? 'ON' : 'WHERE'}</caption><thead className="bg-light-bg/70 text-xs text-light-muted dark:bg-dark-bg/40 dark:text-dark-muted"><tr><th scope="col" className="px-3 py-2">student</th><th scope="col" className="px-3 py-2">course</th><th scope="col" className="px-3 py-2">grade</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.name}-${row.course}`} className="border-t border-light-border dark:border-dark-border"><td className="px-3 py-2 font-mono text-xs">{row.name}</td><td className="px-3 py-2 font-mono text-xs">{row.course}</td><td className="px-3 py-2 font-mono text-xs">{row.grade}</td></tr>)}{rows.length === 0 && <tr><td colSpan={3} className="px-3 py-3 text-light-muted dark:text-dark-muted">No output rows</td></tr>}</tbody></table></div>;
}

export default function JoinPredicatePlayground() {
  const [placement, setPlacement] = useState<Placement>('on');
  const [threshold, setThreshold] = useState(50);
  const query = placement === 'on'
    ? `SELECT s.name, e.course, e.grade\nFROM Student s\nLEFT JOIN Enrollment e\n  ON e.student_id = s.student_id AND e.grade >= ${threshold};`
    : `SELECT s.name, e.course, e.grade\nFROM Student s\nLEFT JOIN Enrollment e\n  ON e.student_id = s.student_id\nWHERE e.grade >= ${threshold};`;
  const status = placement === 'on'
    ? 'The predicate limits matching Enrollment rows, so every Student remains in the output.'
    : 'WHERE filters after NULL extension, so students without a qualifying enrollment disappear.';
  return <InteractivePlayground
    title="Place a left-join predicate; inspect which students survive"
    description="Ada has 87, Bo has 40, and Cy has no enrollment. Move the grade condition between ON and WHERE, then compare the relation the query actually returns."
    status={status}
    staticContent={<div className="grid gap-4"><p className="m-0 text-sm">With a passing grade of 50, the two placements answer different questions. Compare the result tables before deciding where the predicate belongs.</p><div className="grid gap-4 lg:grid-cols-2"><section className="grid gap-2"><h4 className="m-0 text-sm font-bold">Predicate in <code>ON</code>: preserve every student</h4><ResultTable placement="on" threshold={50} /></section><section className="grid gap-2"><h4 className="m-0 text-sm font-bold">Predicate in <code>WHERE</code>: filter after NULL extension</h4><ResultTable placement="where" threshold={50} /></section></div></div>}
    staticCaption="Static state: grade ≥ 50 in ON preserves Ada, Bo, and Cy; the same predicate in WHERE leaves only Ada because the NULL-extended and nonqualifying rows are filtered afterward."
    onReset={() => { setPlacement('on'); setThreshold(50); }}
  >
    <div className="interactive-playground-controls mb-5 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-[1fr_1fr]">
      <fieldset className="grid gap-2"><legend className="text-sm font-semibold">Place <code>e.grade ≥ threshold</code></legend><div className="flex flex-wrap gap-2">{([
        ['on', 'In ON'],
        ['where', 'In WHERE'],
      ] as Array<[Placement, string]>).map(([value, label]) => <button key={value} type="button" aria-pressed={placement === value} onClick={() => setPlacement(value)} className={placement === value ? 'assessment-action-primary' : 'assessment-action-secondary'}>{label}</button>)}</div></fieldset>
      <label className="grid gap-2 text-sm font-semibold">Passing grade = {threshold}<input aria-label="Passing grade" type="range" min="0" max="100" step="10" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /></label>
    </div>
    <div className="grid gap-4 lg:grid-cols-2"><pre className="m-0 overflow-x-auto rounded-xl border border-light-border bg-light-bg/70 p-4 text-xs leading-relaxed text-light-text dark:border-dark-border dark:bg-dark-bg/40 dark:text-dark-text"><code>{query}</code></pre><ResultTable placement={placement} threshold={threshold} /></div>
    <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: one enrollment per student, no duplicate rows, standard SQL NULL semantics, and no ordering guarantee. The example isolates predicate placement; real queries may introduce additional joins, aggregates, policies, or correlated predicates that need their own semantic check.</p>
  </InteractivePlayground>;
}
