import React, { useState } from 'react';
import { ArrowRight, Check, Edit3, Eye, RefreshCw, X } from 'lucide-react';
import MathText from './MathText';

export interface FillInExerciseProps {
  title?: string;
  prompt?: string;
  text?: string;
  statement?: string;
  answers?: (string | string[])[];
  explanation?: string;
}

function normalizeAnswer(value: string) {
  return value
    .replace(/[−–—]/g, '-')
    .replace(/\\,/g, '')
    .replace(/\\;/g, '')
    .replace(/\\!/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function checkMatch(userInput: string, expected: string | string[]): boolean {
  const normInput = normalizeAnswer(userInput);
  const strippedInput = normInput.replace(/\s+/g, '');
  const candidates = Array.isArray(expected) ? expected : [expected];
  return candidates.some((cand) => {
    const normCand = normalizeAnswer(cand);
    const strippedCand = normCand.replace(/\s+/g, '');
    return normInput === normCand || strippedInput === strippedCand;
  });
}

function getPrimaryAnswer(expected: string | string[] | undefined): string {
  if (!expected) return '';
  return Array.isArray(expected) ? expected[0] || '' : expected;
}

function formatPrintAnswer(answer: string): string {
  if (!answer || answer.includes('$')) return answer;
  return /(?:\\[A-Za-z,;]+|[\^_{}])/.test(answer) ? `$${answer}$` : answer;
}

export function FillInExercise({
  title = 'Complete the Statement',
  prompt,
  text,
  statement,
  answers,
  explanation,
}: FillInExerciseProps) {
  const actualPrompt = prompt || text || statement || '';
  const actualAnswers = answers || [];

  const parts = actualPrompt.split(/(?:\[!blank!]|_{3,})/);
  const completedPrompt = parts.reduce((result, part, index) => {
    const answer = index < actualAnswers.length ? formatPrintAnswer(getPrimaryAnswer(actualAnswers[index])) : '';
    return result + part + answer;
  }, '');

  const [userInputs, setUserInputs] = useState<string[]>(
    new Array(actualAnswers.length).fill('')
  );
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [revealedSolution, setRevealedSolution] = useState(false);

  const blankMatches = actualAnswers.map((expected, idx) =>
    checkMatch(userInputs[idx] || '', expected)
  );
  const isCorrect = submitted && blankMatches.every(Boolean);
  const allFilled = userInputs.every((inp) => inp.trim().length > 0);

  const handleInputChange = (index: number, value: string) => {
    const next = [...userInputs];
    next[index] = value;
    setUserInputs(next);
    if (submitted) {
      setSubmitted(false);
      setRevealedSolution(false);
    }
  };

  const checkAnswers = () => {
    if (!allFilled) return;
    setSubmitted(true);
    setRevealedSolution(false);
    setAttempts((c) => c + 1);
  };

  const showExpectedAnswers = () => {
    const primaryAnswers = actualAnswers.map((a) => getPrimaryAnswer(a));
    setUserInputs(primaryAnswers);
    setSubmitted(true);
    setRevealedSolution(true);
  };

  const reset = () => {
    setUserInputs(new Array(actualAnswers.length).fill(''));
    setSubmitted(false);
    setRevealedSolution(false);
  };

  return (
    <section
      className="fill-in-exercise lu-card-tier2 assessment-shell not-prose"
      aria-label={title}
      data-component="FillInExercise"
    >
      <div className="print-static-assessment hidden">
        <div className="print-static-label">{title}</div>
        <div className="print-static-prompt my-2 leading-relaxed">
          <MathText>{completedPrompt}</MathText>
        </div>
        {explanation && (
          <p className="print-static-explanation text-sm text-light-muted dark:text-dark-muted">
            <MathText>{explanation}</MathText>
          </p>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Edit3 size={15} />
          <p className="label-caps m-0 text-primary">Fill-in Exercise</p>
        </div>
        <span className="text-xs font-medium text-light-muted dark:text-dark-muted">
          {actualAnswers.length} blank{actualAnswers.length === 1 ? '' : 's'} to complete
        </span>
      </div>

      <h3 className="mb-3 text-base font-bold leading-snug text-light-text dark:text-dark-text md:text-lg">
        {title}
      </h3>

      <div className="fill-in-exercise-shell overflow-hidden rounded-lg border border-light-border bg-light-surface/60 p-4 dark:border-dark-border dark:bg-dark-surface/60">
        <div className="fill-in-content text-sm leading-relaxed text-light-text dark:text-dark-text md:text-base">
          {parts.map((part, index) => {
            const matched = blankMatches[index];
            let blankClass =
              'border-light-border bg-light-bg text-light-text focus:border-primary dark:border-dark-border dark:bg-dark-bg dark:text-dark-text';
            if (submitted) {
              blankClass = matched
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300';
            }

            const primaryAnswer = getPrimaryAnswer(actualAnswers[index]);
            return (
              <React.Fragment key={index}>
                <MathText>{part}</MathText>
                {index < parts.length - 1 && (
                  <input
                    type="text"
                    value={userInputs[index] || ''}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && allFilled) {
                        e.preventDefault();
                        checkAnswers();
                      }
                    }}
                    aria-label={`Blank ${index + 1}`}
                    placeholder="?"
                    style={{
                      width: `${Math.max(primaryAnswer.length + 3, 6)}ch`,
                    }}
                    className={`fill-in-blank mx-1 inline-block h-8 rounded-md border px-2.5 py-0.5 text-center font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/25 ${blankClass}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={checkAnswers}
          disabled={!allFilled}
          className="assessment-action-primary"
        >
          Check answer <ArrowRight size={15} />
        </button>

        {attempts >= 1 && !isCorrect && (
          <button
            type="button"
            onClick={showExpectedAnswers}
            className="assessment-action-secondary"
          >
            <Eye size={14} /> Show expected answer
          </button>
        )}

        {(userInputs.some((inp) => inp.length > 0) || submitted) && (
          <button
            type="button"
            onClick={reset}
            className="assessment-action-secondary"
          >
            <RefreshCw size={14} /> Reset
          </button>
        )}
      </div>

      {submitted && (
        <div className="mt-4 grid gap-3">
          <div className={isCorrect ? 'feedback-success text-sm' : 'feedback-diagnostic text-sm'}>
            <div className="flex items-start gap-2">
              {isCorrect ? (
                <Check className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" size={16} />
              ) : (
                <X className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" size={16} />
              )}
              <div>
                <strong>
                  {revealedSolution
                    ? 'Expected answers filled.'
                    : isCorrect
                    ? 'All blanks verified correctly.'
                    : 'One or more blanks do not match.'}
                </strong>{' '}
                {!isCorrect && (
                  <span>
                    Check the highlighted blank{blankMatches.filter((m) => !m).length === 1 ? '' : 's'} above and try again, or click &ldquo;Show expected answer&rdquo;.
                  </span>
                )}
              </div>
            </div>
          </div>

          {(isCorrect || revealedSolution) && explanation && (
            <div className="feedback-info text-sm leading-relaxed text-light-text dark:text-dark-text">
              <strong>Explanation:</strong> <MathText>{explanation}</MathText>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export { FillInExercise as FillIn };
export default FillInExercise;
