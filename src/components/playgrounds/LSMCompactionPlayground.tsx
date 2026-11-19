import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

const INITIAL_MEMTABLE = ['a:1', 'c:3'];
const INITIAL_LEVELS = [['d:4'], ['g:7']];
const WRITE_POOL = [
  'b:2',
  'e:5',
  'f:6',
  'h:8',
  'i:9',
  'j:10',
  'k:11',
  'l:12',
  'm:13',
  'n:14',
  'o:15',
  'p:16',
];

export default function LSMCompactionPlayground() {
  const [memtable, setMemtable] = useState(INITIAL_MEMTABLE);
  const [levels, setLevels] = useState(INITIAL_LEVELS);
  const [writeIndex, setWriteIndex] = useState(0);

  const flush = () => {
    if (!memtable.length) return;
    setLevels([[...memtable].sort(), ...levels]);
    setMemtable([]);
  };

  const add = () => {
    if (writeIndex >= WRITE_POOL.length) return;
    const entry = WRITE_POOL[writeIndex];
    setMemtable([...memtable, entry].sort());
    setWriteIndex(writeIndex + 1);
  };

  const compact = () => {
    if (levels.length < 2) return;
    setLevels([[...levels[0], ...levels[1]].sort(), ...levels.slice(2)]);
  };

  const reset = () => {
    setMemtable(INITIAL_MEMTABLE);
    setLevels(INITIAL_LEVELS);
    setWriteIndex(0);
  };

  const poolExhausted = writeIndex >= WRITE_POOL.length;

  return (
    <InteractivePlayground
      title="Observe LSM-tree compaction"
      description="Writes land in memory, flush to sorted runs, and compact to trade write cost for read amplification."
      staticCaption="LSM trees batch writes into sorted runs and periodically merge them."
      staticContent={
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded border border-light-border p-3 dark:border-dark-border">
            memtable: a:1, c:3
          </div>
          <div className="rounded border border-light-border p-3 dark:border-dark-border">
            L0: d:4
          </div>
          <div className="rounded border border-light-border p-3 dark:border-dark-border">
            L1: g:7
          </div>
        </div>
      }
      status={`${memtable.length} memory entries · ${levels.length} sorted runs`}
      onReset={reset}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-primary bg-primary/10 p-3">
          <strong>memtable</strong>
          {memtable.map((item) => (
            <div key={item} className="font-mono">
              {item}
            </div>
          ))}
        </div>
        {levels.map((level, index) => (
          <div
            key={index}
            className="rounded border border-light-border p-3 dark:border-dark-border"
          >
            <strong>L{index}</strong>
            {level.map((item) => (
              <div key={item} className="font-mono">
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={add}
          disabled={poolExhausted}
        >
          Write
        </button>
        <button
          type="button"
          className="rounded-lg border border-light-border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-border"
          onClick={flush}
          disabled={!memtable.length}
        >
          Flush
        </button>
        <button
          type="button"
          className="rounded-lg border border-light-border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-border"
          onClick={compact}
          disabled={levels.length < 2}
        >
          Compact
        </button>
      </div>
    </InteractivePlayground>
  );
}
