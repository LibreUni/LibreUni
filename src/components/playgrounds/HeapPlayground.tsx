import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

const INITIAL_VALUES = [3, 8, 5, 14, 11];

function Heap({ values }: { values: number[] }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Heap array">
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className="rounded border border-primary bg-primary/10 px-4 py-3 text-center font-bold text-light-text dark:text-dark-text"
        >
          <span className="block text-xs text-slate-700 dark:text-slate-200">{index}</span>
          {value}
        </div>
      ))}
    </div>
  );
}

export default function HeapPlayground() {
  const [values, setValues] = useState(INITIAL_VALUES);

  const removeMin = () => {
    if (values.length <= 1) {
      setValues([]);
      return;
    }
    const copy = [...values];
    copy[0] = copy.pop() as number;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < copy.length && copy[left] < copy[smallest]) smallest = left;
      if (right < copy.length && copy[right] < copy[smallest]) smallest = right;
      if (smallest === index) break;
      [copy[index], copy[smallest]] = [copy[smallest], copy[index]];
      index = smallest;
    }
    setValues(copy);
  };

  const reset = () => {
    setValues(INITIAL_VALUES);
  };

  return (
    <InteractivePlayground
      title="Sift down after delete-min"
      description="Remove the root and repair only the path that can violate heap order."
      staticCaption="A binary heap stores a complete tree in an array; sift-down restores parent ≤ child order."
      staticContent={<Heap values={[5, 8, 11, 14]} />}
      status={`minimum = ${values[0] ?? 'empty'}`}
      onReset={reset}
    >
      <Heap values={values} />
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={removeMin}
          disabled={!values.length}
        >
          Delete minimum
        </button>
      </div>
    </InteractivePlayground>
  );
}
