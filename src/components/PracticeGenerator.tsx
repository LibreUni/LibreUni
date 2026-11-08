import React, { useState, useEffect } from 'react';
import MathText from './MathText';
import {
  generateQuestion,
  repairStoredQuestion,
  type TopicId,
  type DifficultyLevel,
  type StoredPracticeQuestion,
} from '../lib/practiceGenerators';

interface PracticeGeneratorProps {
  courseId: string;
}

export default function PracticeGenerator({ courseId }: PracticeGeneratorProps) {
  const storageKey = `libreuni-practice-${courseId}`;
  const [questions, setQuestions] = useState<StoredPracticeQuestion[]>([]);
  const [topic, setTopic] = useState<TopicId | 'all'>('all');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved questions from localStorage on client mount, automatically repairing legacy questions
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const repaired = parsed.map(repairStoredQuestion);
          setQuestions(repaired);
          // Persist the repaired questions back so localStorage is cleaned up
          try {
            localStorage.setItem(storageKey, JSON.stringify(repaired));
          } catch {
            // Ignore localStorage errors
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  // Persist questions to localStorage
  const saveQuestions = (updated: StoredPracticeQuestion[]) => {
    setQuestions(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleGenerate = () => {
    const newQ = generateQuestion(topic, difficulty);
    const storedQ: StoredPracticeQuestion = {
      ...newQ,
      revealedHintsCount: 0,
      showSolution: false,
      isMastered: false,
    };
    const updated = [storedQ, ...questions];
    saveQuestions(updated);
  };

  const handleRevealNextHint = (id: string) => {
    const updated = questions.map((q) => {
      if (q.id === id) {
        const maxHints = q.hints.length;
        return {
          ...q,
          revealedHintsCount: Math.min(maxHints, q.revealedHintsCount + 1),
        };
      }
      return q;
    });
    saveQuestions(updated);
  };

  const handleToggleSolution = (id: string) => {
    const updated = questions.map((q) => {
      if (q.id === id) {
        return {
          ...q,
          showSolution: !q.showSolution,
        };
      }
      return q;
    });
    saveQuestions(updated);
  };

  const handleToggleMastered = (id: string) => {
    const updated = questions.map((q) => {
      if (q.id === id) {
        return {
          ...q,
          isMastered: !q.isMastered,
        };
      }
      return q;
    });
    saveQuestions(updated);
  };

  const handleDelete = (id: string) => {
    const updated = questions.filter((q) => q.id !== id);
    saveQuestions(updated);
  };

  const handleClearAll = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all generated practice questions? This cannot be undone.'
    );
    if (!confirmed) return;
    saveQuestions([]);
  };

  const handleNotesChange = (id: string, notes: string) => {
    const updated = questions.map((q) => {
      if (q.id === id) {
        return { ...q, notes };
      }
      return q;
    });
    saveQuestions(updated);
  };

  const getDifficultyBadge = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'foundational':
        return (
          <span className="inline-flex items-center rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
            Foundational
          </span>
        );
      case 'intermediate':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            Intermediate
          </span>
        );
      case 'advanced':
        return (
          <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
            Advanced
          </span>
        );
    }
  };

  const masteredCount = questions.filter((q) => q.isMastered).length;

  return (
    <div className="not-prose my-8 space-y-8" id="practice-workshop-container">
      {/* Control Panel Card */}
      <div className="rounded-2xl border border-light-border bg-light-surface p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-light-border/60 pb-5 dark:border-dark-border/60">
          <div>
            <h2 className="text-xl font-black text-light-text dark:text-dark-text">
              Practice Question Generator
            </h2>
            <p className="mt-1 text-sm font-medium text-light-muted dark:text-dark-muted">
              Select topic and difficulty, then generate fresh problems with randomized numbers.
            </p>
          </div>

          {questions.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-light-border bg-light-bg px-3 py-1.5 text-xs font-bold text-light-text dark:border-dark-border dark:bg-dark-bg dark:text-dark-text">
                {questions.length} {questions.length === 1 ? 'question' : 'questions'} generated
                {masteredCount > 0 && ` · ${masteredCount} mastered`}
              </span>
              <button
                type="button"
                onClick={handleClearAll}
                className="cursor-pointer rounded-xl border border-light-border px-3 py-1.5 text-xs font-bold text-light-muted transition-colors hover:border-red-400 hover:text-red-500 dark:border-dark-border dark:text-dark-muted dark:hover:text-red-400"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="practice-topic-select"
              className="block text-xs font-black uppercase tracking-wider text-light-muted dark:text-dark-muted mb-2"
            >
              Topic
            </label>
            <select
              id="practice-topic-select"
              value={topic}
              onChange={(e) => setTopic(e.target.value as TopicId | 'all')}
              className="w-full rounded-xl border border-light-border bg-light-bg px-3.5 py-2.5 text-sm font-bold text-light-text shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text cursor-pointer"
            >
              <option value="all">All Topics (Comprehensive)</option>
              <option value="limits">Limits & Continuity</option>
              <option value="derivatives">Derivatives & Applications</option>
              <option value="integrals">Integration & Accumulation</option>
              <option value="approximations">Series & Approximations</option>
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label
              htmlFor="practice-difficulty-select"
              className="block text-xs font-black uppercase tracking-wider text-light-muted dark:text-dark-muted mb-2"
            >
              Difficulty
            </label>
            <select
              id="practice-difficulty-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel | 'all')}
              className="w-full rounded-xl border border-light-border bg-light-bg px-3.5 py-2.5 text-sm font-bold text-light-text shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text cursor-pointer"
            >
              <option value="all">Any Difficulty</option>
              <option value="foundational">Foundational (Core concepts)</option>
              <option value="intermediate">Intermediate (Multi-step)</option>
              <option value="advanced">Advanced (Rigorous proofs)</option>
            </select>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              id="generate-question-btn"
              onClick={handleGenerate}
              className="btn-primary !rounded-xl !px-6 !py-2.5 text-sm font-bold shadow-md shadow-primary/20 cursor-pointer flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Generate Question</span>
            </button>
          </div>
        </div>
      </div>

      {/* Questions List */}
      {!isLoaded ? (
        <div className="rounded-2xl border border-light-border bg-light-surface/50 p-12 text-center text-sm font-medium text-light-muted dark:border-dark-border dark:bg-dark-surface/50 dark:text-dark-muted">
          Loading practice questions...
        </div>
      ) : questions.length === 0 ? (
        <div
          id="practice-empty-state"
          className="rounded-2xl border-2 border-dashed border-light-border bg-light-surface/40 p-12 text-center dark:border-dark-border dark:bg-dark-surface/30"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-black text-light-text dark:text-dark-text">
            No practice questions generated yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-light-muted dark:text-dark-muted">
            Choose your target topic and difficulty above and click{' '}
            <strong className="text-light-text dark:text-dark-text font-bold">
              Generate Question
            </strong>{' '}
            to start practicing. All questions you generate remain saved across refreshes.
          </p>
        </div>
      ) : (
        <div className="space-y-6" id="generated-questions-list">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              data-question-id={q.id}
              data-mastered={q.isMastered}
              className={`rounded-2xl border transition-all ${
                q.isMastered
                  ? 'border-emerald-500/40 bg-emerald-50/20 dark:border-emerald-700/40 dark:bg-emerald-950/10'
                  : 'border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface'
              } p-6 shadow-sm`}
            >
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-light-border/60 pb-4 dark:border-dark-border/60">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-light-muted dark:text-dark-muted">
                    #{questions.length - idx}
                  </span>
                  {getDifficultyBadge(q.difficulty)}
                  <span className="rounded-md border border-light-border bg-light-bg px-2 py-0.5 text-xs font-semibold text-light-text dark:border-dark-border dark:bg-dark-bg dark:text-dark-text">
                    {q.topicName}
                  </span>
                  <h3 className="font-bold text-base text-light-text dark:text-dark-text ml-1">
                    {q.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleMastered(q.id)}
                    className={`cursor-pointer rounded-xl px-3 py-1 text-xs font-bold transition-colors ${
                      q.isMastered
                        ? 'bg-emerald-500/20 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-300'
                        : 'border border-light-border text-light-muted hover:border-emerald-400 hover:text-emerald-600 dark:border-dark-border dark:text-dark-muted'
                    }`}
                  >
                    {q.isMastered ? '✓ Mastered' : 'Mark mastered'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(q.id)}
                    aria-label={`Remove question ${q.title}`}
                    className="cursor-pointer rounded-xl border border-transparent p-1.5 text-light-muted hover:border-red-300 hover:text-red-500 dark:text-dark-muted dark:hover:text-red-400 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Question Statement */}
              <div className="mt-5 text-base leading-relaxed text-light-text dark:text-dark-text">
                <MathText>{q.questionMath}</MathText>
              </div>

              {/* Hints Section */}
              {q.revealedHintsCount > 0 && (
                <div className="mt-6 space-y-3">
                  {q.hints.slice(0, q.revealedHintsCount).map((hintText, hIdx) => (
                    <div
                      key={hIdx}
                      className="rounded-xl border border-amber-500/30 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-950/20"
                    >
                      <div className="flex items-center gap-2 mb-2 text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        <span>Hint {hIdx + 1} of {q.hints.length}</span>
                      </div>
                      <div className="text-sm leading-relaxed text-light-text dark:text-dark-text">
                        <MathText>{hintText}</MathText>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Solution Section */}
              {q.showSolution && (
                <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-50/70 p-5 dark:border-emerald-700/50 dark:bg-emerald-950/30">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Worked Solution
                      </span>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Step-by-step reasoning & derivation
                      </span>
                    </div>
                    <div className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-900 dark:text-emerald-200">
                      Answer: <MathText>{q.keyAnswer.includes('$') ? q.keyAnswer : `$${q.keyAnswer}$`}</MathText>
                    </div>
                  </div>

                  <div className="text-sm leading-relaxed text-light-text dark:text-dark-text space-y-3">
                    <MathText>{q.solutionMath}</MathText>
                  </div>
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-light-border/60 dark:border-dark-border/60">
                <div className="flex flex-wrap items-center gap-3">
                  {q.revealedHintsCount < q.hints.length && (
                    <button
                      type="button"
                      onClick={() => handleRevealNextHint(q.id)}
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-50/50 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-950/30 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                      <span>
                        {q.revealedHintsCount === 0
                          ? 'Get Hint'
                          : `Next Hint (${q.revealedHintsCount + 1}/${q.hints.length})`}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleSolution(q.id)}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                  >
                    <span>{q.showSolution ? 'Hide Solution' : 'Show Solution'}</span>
                  </button>
                </div>

                {/* Personal Notes Toggle */}
                <details className="group">
                  <summary className="cursor-pointer list-none text-xs font-bold text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text transition-colors">
                    {q.notes ? 'Edit notes' : '+ Add personal notes'}
                  </summary>
                  <div className="mt-3">
                    <textarea
                      value={q.notes || ''}
                      onChange={(e) => handleNotesChange(q.id, e.target.value)}
                      placeholder="Record your thoughts, alternate methods, or personal takeaway for this problem..."
                      rows={2}
                      className="w-full rounded-xl border border-light-border bg-light-bg p-3 text-xs text-light-text focus:border-primary focus:outline-none dark:border-dark-border dark:bg-dark-bg dark:text-dark-text"
                    />
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
