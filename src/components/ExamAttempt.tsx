import React, { useState, useEffect, useRef } from 'react';

interface ExamAttemptProps {
  courseId: string;
  examSlug: string;
  durationMinutes: number;
  totalPoints: number;
}

type AttemptStatus = 'not-started' | 'in-progress' | 'finished';

interface StoredAttempt {
  status: AttemptStatus;
  score?: number;
  secondsRemaining?: number;
  finishedAt?: string;
}

export default function ExamAttempt({
  courseId,
  examSlug,
  durationMinutes,
  totalPoints,
}: ExamAttemptProps) {
  const storageKey = `exam-attempt-${courseId}-${examSlug}`;
  const [status, setStatus] = useState<AttemptStatus>('not-started');
  const [secondsRemaining, setSecondsRemaining] = useState(durationMinutes * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [awardedScore, setAwardedScore] = useState<number | ''>('');
  const timerRef = useRef<number | null>(null);

  const applySchemesVisibility = (show: boolean) => {
    const schemes = document.querySelectorAll<HTMLElement>('[data-marking-scheme]');
    schemes.forEach((el) => {
      if (show) {
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', '');
      }
    });
  };

  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        const saved: StoredAttempt = JSON.parse(savedRaw);
        if (saved.status === 'finished') {
          setStatus('finished');
          if (typeof saved.score === 'number') {
            setAwardedScore(saved.score);
          }
          applySchemesVisibility(true);
        } else if (saved.status === 'in-progress' && typeof saved.secondsRemaining === 'number') {
          setStatus('in-progress');
          setSecondsRemaining(saved.secondsRemaining);
          applySchemesVisibility(false);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey]);

  useEffect(() => {
    if (status === 'in-progress' && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            window.clearInterval(timerRef.current!);
            handleFinish();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [status, isPaused]);

  const handleStart = () => {
    setStatus('in-progress');
    setIsPaused(false);
    setSecondsRemaining(durationMinutes * 60);
    applySchemesVisibility(false);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ status: 'in-progress', secondsRemaining: durationMinutes * 60 })
      );
    } catch {}
  };

  const handleFinish = () => {
    if (status === 'in-progress') {
      const confirmFinish = window.confirm(
        'Finish examination? This will stop the timer and reveal the marking schemes.'
      );
      if (!confirmFinish) return;
    }

    setStatus('finished');
    applySchemesVisibility(true);

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ status: 'finished', finishedAt: new Date().toISOString() })
      );
      localStorage.setItem(`completed-${examSlug}`, 'true');
      window.dispatchEvent(new CustomEvent('lesson-completed', { detail: { slug: examSlug } }));
    } catch {}
  };

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (awardedScore === '') return;
    const scoreVal = Number(awardedScore);
    try {
      const savedRaw = localStorage.getItem(storageKey);
      const prev = savedRaw ? JSON.parse(savedRaw) : {};
      localStorage.setItem(storageKey, JSON.stringify({ ...prev, score: scoreVal }));
    } catch {}
  };

  const handleReset = () => {
    const confirmReset = window.confirm(
      'Start a new attempt? This will reset your score and hide all marking schemes.'
    );
    if (!confirmReset) return;

    setStatus('not-started');
    setSecondsRemaining(durationMinutes * 60);
    setIsPaused(false);
    setAwardedScore('');
    applySchemesVisibility(false);

    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      id="exam-attempt-card"
      data-exam-status={status}
      className="my-8 rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 dark:border-primary/40 dark:bg-primary/10 not-prose"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-primary">
            Examination Mode
          </span>
          <h2 className="text-xl font-black text-light-text dark:text-dark-text mt-1">
            {status === 'not-started' && 'Examination Ready'}
            {status === 'in-progress' && 'Attempt in Progress'}
            {status === 'finished' && 'Attempt Complete · Marking Open'}
          </h2>
          <p className="text-sm font-medium text-light-muted dark:text-dark-muted mt-1">
            Duration: {durationMinutes} min · Total Points: {totalPoints}
          </p>
        </div>

        {status === 'not-started' && (
          <button
            type="button"
            id="start-exam-btn"
            onClick={handleStart}
            className="btn-primary !rounded-xl !px-6 !py-3 text-sm font-bold shadow-lg shadow-primary/20 cursor-pointer"
          >
            Start examination
          </button>
        )}

        {status === 'in-progress' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-primary/30 bg-light-surface dark:bg-dark-surface px-4 py-2 font-mono text-xl font-bold tabular-nums text-primary">
              {formatTime(secondsRemaining)}
            </div>
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface px-3 py-2 text-xs font-bold text-light-text dark:text-dark-text hover:border-primary cursor-pointer"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              id="finish-exam-btn"
              onClick={handleFinish}
              className="btn-primary !rounded-xl !px-5 !py-2.5 text-sm font-bold cursor-pointer"
            >
              Finish attempt
            </button>
          </div>
        )}

        {status === 'finished' && (
          <div className="flex flex-wrap items-center gap-4">
            <form onSubmit={handleSaveScore} className="flex items-center gap-2">
              <label htmlFor="self-awarded-score" className="text-xs font-bold text-light-text dark:text-dark-text">
                Your score:
              </label>
              <input
                id="self-awarded-score"
                type="number"
                min="0"
                max={totalPoints}
                value={awardedScore}
                onChange={(e) => setAwardedScore(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={`0-${totalPoints}`}
                className="w-20 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface px-3 py-1.5 text-sm font-bold tabular-nums text-light-text dark:text-dark-text focus:border-primary"
              />
              <span className="text-xs font-bold text-light-muted dark:text-dark-muted">/ {totalPoints}</span>
              <button
                type="submit"
                className="rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/30 cursor-pointer"
              >
                Save
              </button>
            </form>
            <button
              type="button"
              id="reset-exam-btn"
              onClick={handleReset}
              className="rounded-xl border border-light-border dark:border-dark-border px-3 py-1.5 text-xs font-bold text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text cursor-pointer"
            >
              Start new attempt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
