import React, { useState } from 'react';
import { ArrowRight, Check, Code2, Eye, RefreshCw, X } from 'lucide-react';
import { highlightCode } from './SyntaxHighlighter';
import MathText from './MathText';

interface CodeExerciseProps {
  title?: string;
  code?: string; // Use [!blank!] for blanks
  answers?: string[];
  explanation?: string;
}

function normalizeAnswer(value: string) {
  return value
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, '')
    .trim();
}

export default function CodeExercise({
  title = 'Complete the Code',
  code,
  answers,
  explanation,
}: CodeExerciseProps) {
  const actualCode = code || '';
  const actualAnswers = answers || [];

  const parts = actualCode.split(/\[!blank!]|_{3,}/);
  const completedCode = parts.reduce((result, part, index) => {
    const answer = index < actualAnswers.length ? actualAnswers[index] || '' : '';
    return result + part + answer;
  }, '');

  const [userInputs, setUserInputs] = useState<string[]>(
    new Array(actualAnswers.length).fill(''),
  );
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [revealedSolution, setRevealedSolution] = useState(false);

  const blankMatches = actualAnswers.map(
    (expected, idx) =>
      normalizeAnswer(userInputs[idx] || '') === normalizeAnswer(expected || ''),
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

  const showExpectedTokens = () => {
    setUserInputs([...actualAnswers]);
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
      className="code-exercise lu-card-tier2 assessment-shell not-prose"
      aria-label={title}
      data-component="CodeExercise"
    >
      <div className="print-static-assessment hidden">
        <div className="print-static-label">{title}</div>
        <pre className="print-static-code">
          <code>{completedCode}</code>
        </pre>
        {explanation && (
          <p className="print-static-explanation">
            <MathText>{explanation}</MathText>
          </p>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Code2 size={15} />
          <p className="label-caps m-0 text-primary">Code Exercise</p>
        </div>
        <span className="text-xs font-medium text-light-muted dark:text-dark-muted">
          {actualAnswers.length} token{actualAnswers.length === 1 ? '' : 's'} to supply
        </span>
      </div>

      <h3 className="mb-3 text-base font-bold leading-snug text-light-text dark:text-dark-text md:text-lg">
        {title}
      </h3>

      <div className="code-exercise-shell overflow-hidden rounded-lg border border-light-border bg-light-bg dark:border-dark-border dark:bg-dark-bg">
        <pre className="code-exercise-codeframe hl-default m-0 overflow-x-auto whitespace-pre p-4 font-mono text-sm leading-7 border-0 rounded-none shadow-none bg-transparent">
          {parts.map((part, index) => {
            const matched = blankMatches[index];
            let blankClass =
              'border-light-border bg-light-surface text-light-text focus:border-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text';
            if (submitted) {
              blankClass = matched
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300';
            }

            return (
              <React.Fragment key={index}>
                <span dangerouslySetInnerHTML={{ __html: highlightCode(part) }} />
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
                    aria-label={`Code blank ${index + 1}`}
                    placeholder="?"
                    style={{
                      width: `${Math.max((actualAnswers[index] || '').length + 3, 5)}ch`,
                    }}
                    className={`code-exercise-blank mx-1 inline-block h-7 rounded-md border px-2 py-0 text-center font-mono text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/25 ${blankClass}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </pre>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={checkAnswers}
          disabled={!allFilled}
          className="code-exercise-button assessment-action-primary"
        >
          Check code <ArrowRight size={15} />
        </button>

        {attempts >= 1 && !isCorrect && (
          <button
            type="button"
            onClick={showExpectedTokens}
            className="assessment-action-secondary"
          >
            <Eye size={14} /> Show expected tokens
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
                    ? 'Expected tokens filled.'
                    : isCorrect
                    ? 'All tokens verified.'
                    : 'One or more tokens do not match.'}
                </strong>{' '}
                {!isCorrect && (
                  <span>
                    Check the highlighted blank{blankMatches.filter((m) => !m).length === 1 ? '' : 's'} above and try again, or click &ldquo;Show expected tokens&rdquo;.
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
