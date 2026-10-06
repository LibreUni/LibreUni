import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { program, schedule } from './pipelineModel.mjs';

export type PipelineRow = [string, string, string, string, string, string];
function Trace({ taken }: { taken: boolean }) {
  const rows = schedule(taken);
  const label = (cell: string) => program.includes(cell) ? `I${program.indexOf(cell)}` : cell === 'bubble' ? '·' : cell === 'target' ? 'T' : cell;
  return <div>
    <ul className="mb-3 grid gap-1 text-xs">{program.map((instruction, index) => <li key={instruction}><strong>I{index}</strong>: <code>{instruction}</code></li>)}</ul>
    <p className="mb-2 text-xs">T = first target instruction; · = invalid bubble; — = empty. Each row shows occupancy during the cycle; branch redirection takes effect at its end.</p>
    <table className="w-full table-fixed text-center text-xs" aria-label="Pipeline hazard trace">
      <thead><tr className="border-b border-light-border dark:border-dark-border">{['Cycle', 'IF', 'ID', 'EX', 'MEM', 'WB'].map(heading => <th scope="col" className="py-2" key={heading}>{heading}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr className="border-b border-light-border/60 dark:border-dark-border/60" key={row[0]}>{row.map((cell, index) => <td className="py-2 font-mono" key={`${row[0]}-${index}`} title={cell}>{index === 0 ? cell : label(cell)}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

export default function PipelineHazardPlayground() {
  const [taken, setTaken] = useState(false);
  return <InteractivePlayground title="Trace a load-use and branch hazard" description="The detector holds IF/ID, inserts one invalid EX entry, then either keeps the fall-through instruction or flushes it after branch resolution." status={taken ? 'taken: younger work flushed' : 'not taken: fall-through retained'} onReset={() => setTaken(false)} staticContent={<Trace taken={true} />} staticCaption="Static state: I0 writes back at cycle 5, I1 at cycle 7, and I2 reaches WB at cycle 8. The taken branch squashes I3 before EX; the target reaches WB at cycle 11.">
    <label className="interactive-playground-controls mb-4 flex min-h-11 items-center gap-3 text-sm font-semibold"><input className="size-5" aria-label="Branch taken" type="checkbox" checked={taken} onChange={(event) => setTaken(event.target.checked)} /> Branch taken</label>
    <Trace taken={taken} />
    <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: single issue, five stages, separate instruction/data memory, one-cycle load-use stall, ALU and load forwarding to EX, and predict-not-taken with EX resolution. Branch outcome is supplied, not computed from registers. The branch traverses WB without writing a register.</p>
  </InteractivePlayground>;
}
