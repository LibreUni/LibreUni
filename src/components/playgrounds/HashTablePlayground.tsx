import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type SlotValue = number | 'T' | null;

const SAMPLE_SLOTS: SlotValue[] = [null, null, null, 10, 'T', 24, null];

export default function HashTablePlayground() {
  const [slots, setSlots] = useState<SlotValue[]>(() => Array(7).fill(null));
  const [next, setNext] = useState(10);

  const isFull = slots.every((value) => value !== null && value !== 'T');

  const insert = () => {
    const value = next;
    const start = value % slots.length;
    const copy = [...slots];
    for (let offset = 0; offset < slots.length; offset += 1) {
      const index = (start + offset) % slots.length;
      if (copy[index] === null || copy[index] === 'T') {
        copy[index] = value;
        setSlots(copy);
        setNext(next + 7);
        return;
      }
    }
  };

  const remove = (index: number) => {
    if (slots[index] === null || slots[index] === 'T') return;
    const copy = [...slots];
    copy[index] = 'T';
    setSlots(copy);
  };

  const reset = () => {
    setSlots(Array(7).fill(null));
    setNext(10);
  };

  return (
    <InteractivePlayground
      title="Probe collisions and tombstones"
      description="Insert keys that collide under h(k)=k mod 7, then remove one without breaking later searches."
      staticCaption="Open addressing must distinguish an unused slot from a deleted slot."
      staticContent={
        <div className="grid grid-cols-7 gap-1">
          {SAMPLE_SLOTS.map((value, index) => (
            <div
              key={index}
              className="rounded border border-light-border p-2 text-center text-sm dark:border-dark-border"
            >
              {value ?? '∅'}
            </div>
          ))}
        </div>
      }
      status={`load = ${slots.filter((value) => value !== null && value !== 'T').length}/${slots.length}`}
      onReset={reset}
    >
      <div className="grid grid-cols-7 gap-1">
        {slots.map((value, index) => (
          <button
            type="button"
            key={index}
            aria-label={`slot ${index}, ${value ?? 'empty'}`}
            onClick={() => remove(index)}
            disabled={value === null || value === 'T'}
            className={`min-h-14 rounded border p-2 text-center text-sm ${
              value === 'T'
                ? 'border-amber-500 bg-amber-100 text-slate-900 dark:bg-amber-900/60 dark:text-amber-100'
                : value === null
                  ? 'border-slate-300 text-light-text dark:border-slate-600 dark:text-dark-text'
                  : 'border-primary bg-primary/10 font-bold text-light-text dark:text-dark-text'
            }`}
          >
            <span
              className={`block text-xs ${
                value === 'T'
                  ? 'text-slate-800 dark:text-amber-200'
                  : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {index}
            </span>
            {value ?? '∅'}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={insert}
          disabled={isFull}
        >
          Insert colliding key
        </button>
      </div>
      <p className="mt-3 text-sm">
        Click a stored key to create a tombstone. Searches must continue past <code>T</code>.
      </p>
    </InteractivePlayground>
  );
}
