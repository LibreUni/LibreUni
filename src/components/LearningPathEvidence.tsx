import { useEffect, useState } from 'react';

type Gate = { id: string; title: string };
type Evidence = Record<string, { notes: string; reviewed: boolean }>;

export default function LearningPathEvidence({ pathId, gates }: { pathId: string; gates: Gate[] }) {
  const [evidence, setEvidence] = useState<Evidence>({});
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const key = `libreuni:path-evidence:v1:${pathId}`;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      const valid: Evidence = {};
      for (const gate of gates) {
        const value = stored?.[gate.id];
        if (value && typeof value.notes === 'string') valid[gate.id] = { notes: value.notes, reviewed: value.reviewed === true && Boolean(value.notes.trim()) };
      }
      setEvidence(valid);
    } catch { setStorageError(true); }
    setReady(true);
  }, [key]);

  function update(id: string, value: { notes: string; reviewed: boolean }) {
    const next = { ...evidence, [id]: { ...value, reviewed: value.reviewed && Boolean(value.notes.trim()) } };
    setEvidence(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageError(false); }
    catch { setStorageError(true); }
  }

  function download() {
    const blob = new Blob([JSON.stringify({ pathId, version: 1, exportedAt: new Date().toISOString(), evidence }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${pathId}-evidence.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const reviewed = gates.filter(gate => evidence[gate.id]?.reviewed).length;
  return <section aria-labelledby="evidence-heading" className="rounded-2xl border border-light-border bg-white p-5 dark:border-dark-border dark:bg-dark-surface sm:p-8">
    <h2 id="evidence-heading" className="text-2xl font-bold">Your evidence record</h2>
    <p className="mt-3 text-sm leading-relaxed text-light-muted dark:text-dark-muted">Record artifact locations, test results, and unresolved questions. These notes stay in this browser; they are not uploaded or assessed by LibreUni. Keep a downloaded copy before clearing browser data. Do not enter credentials or sensitive data.</p>
    <p role="status" className="mt-3 text-sm font-semibold">{storageError ? 'Browser storage is unavailable or unreadable. Changes remain in memory; download your record to keep them.' : ready ? `${reviewed} of ${gates.length} review checkpoints self-attested. This is not a certificate or an automatic assessment.` : 'Loading local evidence…'}</p>
    <div className="mt-6 space-y-6">
      {gates.map(gate => {
        const value = evidence[gate.id] || { notes: '', reviewed: false };
        return <fieldset key={gate.id} className="min-w-0 rounded-xl border border-light-border p-4 dark:border-dark-border">
          <legend className="px-2 font-bold">{gate.title}</legend>
          <label htmlFor={`evidence-${gate.id}`} className="block text-sm">Evidence and revision notes</label>
          <textarea id={`evidence-${gate.id}`} disabled={!ready} rows={4} value={value.notes} className="input-field mt-2 w-full resize-y" onChange={event => update(gate.id, { notes: event.target.value, reviewed: false })} />
          <label className="mt-3 flex min-h-11 items-start gap-3 text-sm leading-relaxed">
            <input type="checkbox" className="mt-1 size-5 shrink-0" disabled={!ready || !value.notes.trim()} checked={value.reviewed} onChange={event => update(gate.id, { ...value, reviewed: event.target.checked })} />
            I discussed this evidence with an independent reviewer and addressed their requested revisions.
          </label>
          <p className="mt-1 text-xs text-light-muted dark:text-dark-muted">Editing the evidence clears this attestation so the revised work can be reviewed again.</p>
        </fieldset>;
      })}
    </div>
    <button type="button" disabled={!ready} onClick={download} className="assessment-action-primary mt-6">Download evidence record</button>
  </section>;
}
