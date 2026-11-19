import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

const MAX_CAPACITY = 32;

function ArrayState({
  values,
  capacity,
  copies,
}: {
  values: number[];
  capacity: number;
  copies: number;
}) {
  return (
    <div
      className="overflow-x-auto py-4"
      aria-label={`Dynamic array with ${values.length} values and capacity ${capacity}`}
    >
      <div className="flex min-w-max gap-1">
        {Array.from({ length: capacity }, (_, index) => (
          <div
            key={index}
            className={`flex h-14 w-14 flex-col items-center justify-center rounded border text-sm ${
              index < values.length
                ? 'border-primary bg-primary/10 font-bold text-light-text dark:text-dark-text'
                : 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200'
            }`}
          >
            <span>{index < values.length ? values[index] : '·'}</span>
            <small>{index}</small>
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-light-muted dark:text-dark-muted">
        size = {values.length}, capacity = {capacity}, copies so far = {copies}
      </p>
    </div>
  );
}

export default function DynamicArrayPlayground() {
  const [values, setValues] = useState([4, 7, 2]);
  const [capacity, setCapacity] = useState(4);
  const [copies, setCopies] = useState(0);

  const append = () => {
    if (values.length >= MAX_CAPACITY) return;
    if (values.length === capacity) {
      setCapacity(capacity * 2);
      setCopies(copies + values.length);
    }
    setValues([...values, values.length * 3 + 1]);
  };

  const reset = () => {
    setValues([4, 7, 2]);
    setCapacity(4);
    setCopies(0);
  };

  return (
    <InteractivePlayground
      title="Watch geometric growth"
      description="Append values until a full array must be copied into a larger allocation."
      staticCaption="A dynamic array keeps a logical prefix and grows geometrically when full."
      staticContent={<ArrayState values={[4, 7, 2, 10, 13]} capacity={8} copies={4} />}
      status={`amortized copies = ${copies}`}
      onReset={reset}
    >
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={append}
          disabled={values.length >= MAX_CAPACITY}
        >
          Append value
        </button>
      </div>
      <ArrayState values={values} capacity={capacity} copies={copies} />
      <p className="text-sm">
        The next resize, when it occurs, copies the entire logical prefix once.
      </p>
    </InteractivePlayground>
  );
}
