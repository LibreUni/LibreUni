import { useEffect, useId, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { formatCell } from '../lib/sqlRunnerModel.mjs';

interface SqlRunnerProps {
  title?: string;
  description?: string;
  /** SQL statements that create and seed the in-browser fixture. */
  schema?: string;
  initialQuery?: string;
}

interface QueryResult {
  columns: string[];
  values: unknown[][];
  truncated: boolean;
}

type WorkerReply = { ok: true; result: QueryResult } | { ok: false; error: string };
const TIMEOUT_MS = 10_000;

export default function SqlRunner({
  title = 'Run SQL',
  description,
  schema = '',
  initialQuery = 'SELECT 1 AS ok;',
}: SqlRunnerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready. A fresh fixture is created for each query.');
  const [isRunning, setIsRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldId = useId();

  const stopWorker = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    workerRef.current?.terminate();
    workerRef.current = null;
  };

  useEffect(() => () => stopWorker(), []);

  const runQuery = () => {
    stopWorker();
    setResult(null);
    setError(null);
    setIsRunning(true);
    setStatus('Running query in a temporary SQLite database.');
    try {
      const worker = new Worker(new URL('../lib/sqlRunner.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        stopWorker();
        setIsRunning(false);
        if (!event.data.ok) {
          setError(event.data.error);
          setStatus('The query did not execute.');
          return;
        }
        const next = event.data.result;
        setResult(next);
        const count = next.values.length;
        setStatus(next.truncated
          ? `Showing the first ${count} rows; additional rows were not displayed.`
          : `${count} row${count === 1 ? '' : 's'} returned.`);
      };
      worker.onerror = () => {
        stopWorker();
        setIsRunning(false);
        setError('The SQLite worker could not start. Reload the page and try again.');
        setStatus('The query did not execute.');
      };
      timerRef.current = setTimeout(() => {
        stopWorker();
        setIsRunning(false);
        setError('The query exceeded the 10-second limit. Reduce its scope and try again.');
        setStatus('The query was stopped.');
      }, TIMEOUT_MS);
      worker.postMessage({ schema, query });
    } catch (failure) {
      stopWorker();
      setIsRunning(false);
      setError(failure instanceof Error ? failure.message : String(failure));
      setStatus('The query did not execute.');
    }
  };

  const reset = () => {
    stopWorker();
    setIsRunning(false);
    setQuery(initialQuery);
    setResult(null);
    setError(null);
    setStatus('Starting query restored. The next run uses a fresh fixture.');
  };

  return (
    <section className="lu-card-tier3 not-prose my-8" aria-label={title} data-component="SqlRunner">
      <div className="print-static-assessment hidden">
        <div className="print-static-label">{title}</div>
        {description && <p>{description}</p>}
        <pre className="print-static-code"><code>{initialQuery.trim()}</code></pre>
        <p className="print-static-explanation">The screen version executes this query against the fixture in SQLite. Predict the output before checking it in an engine.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-light-border bg-light-surface/90 px-4 py-3 dark:border-dark-border dark:bg-dark-surface/90">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-blue-700 dark:text-blue-300">
            SQL
          </span>
          <h3 className="m-0 truncate text-sm font-bold text-light-text dark:text-dark-text">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-light-border bg-light-bg px-2.5 py-1.5 text-xs font-semibold text-light-muted transition-colors hover:border-primary/40 hover:text-light-text dark:border-dark-border dark:bg-dark-bg dark:text-dark-muted dark:hover:text-dark-text">
            <RotateCcw size={14} /> Reset query
          </button>
          <button type="button" onClick={runQuery} disabled={isRunning} className="assessment-action-primary min-h-9 px-3.5 py-1.5 text-xs">
            <Play size={14} /> {isRunning ? 'Running…' : 'Run query'}
          </button>
        </div>
      </div>

      <div className="p-4">
        {description && <p className="mb-2 text-sm leading-relaxed text-light-text dark:text-dark-text">{description}</p>}
        <p className="mb-3 text-xs text-light-muted dark:text-dark-muted">Read-only SQLite fixture; reloaded fresh on each execution (100-row display limit).</p>
        <label className="sr-only" htmlFor={fieldId}>SQL query</label>
        <textarea
          id={fieldId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={Math.max(4, Math.min(12, query.split('\n').length + 1))}
          spellCheck={false}
          className="w-full resize-y rounded-lg border border-light-border bg-light-bg p-3.5 font-mono text-sm leading-6 text-light-text focus:border-primary focus:outline-none dark:border-dark-border dark:bg-dark-bg dark:text-dark-text"
          aria-describedby={`${fieldId}-status`}
        />
        <p id={`${fieldId}-status`} role="status" aria-live="polite" className="mb-0 mt-2 text-xs font-medium text-light-muted dark:text-dark-muted">{status}</p>
        {error && <div className="feedback-diagnostic mt-3 text-sm" role="alert"><strong>Query error.</strong> {error}</div>}
        {result && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-light-border dark:border-dark-border" role="region" aria-label="Query results" tabIndex={0}>
            {result.columns.length === 0 ? (
              <p className="m-0 p-4 text-sm text-light-muted dark:text-dark-muted">No columns were returned.</p>
            ) : (
              <table className="min-w-full border-collapse text-sm">
                <caption className="sr-only">Results for the submitted SQLite query</caption>
                <thead>
                  <tr className="border-b border-light-border bg-light-bg dark:border-dark-border dark:bg-dark-bg/40">
                    {result.columns.map((column, index) => <th key={index} scope="col" className="px-3 py-2 text-left font-mono text-xs font-bold">{column}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.values.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-light-border/60 last:border-0 dark:border-dark-border/60">
                      {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2 font-mono text-xs">{formatCell(cell)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
