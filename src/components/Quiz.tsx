import { useMemo, useState } from 'react';
import { ArrowRight, Check, RefreshCw, X } from 'lucide-react';
import MathText from './MathText';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
}

interface Question {
  question: string;
  options?: (string | Option)[];
  correctIndex?: number;
  explanation?: string;
}

interface QuizProps {
  title?: string;
  question?: string;
  options?: (string | Option)[];
  correctIndex?: number;
  explanation?: string;
  questions?: Question[];
}

function hash(text: string) {
  let value = 2166136261;
  for (const character of text) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function normalizeOptions(question: Question): Option[] {
  return (question.options ?? []).map((option, index) => {
    if (typeof option === 'string') {
      return {
        id: String(index),
        text: option,
        isCorrect: index === question.correctIndex,
      };
    }

    return {
      ...option,
      id: option.id?.toString() || String(index),
      text: option.text ?? '',
      isCorrect: Boolean(option.isCorrect) || index === question.correctIndex,
    };
  });
}

function orderClaims(options: Option[], question: string) {
  return [...options].sort(
    (left, right) =>
      hash(`${question}:${left.id}:${left.text}`) - hash(`${question}:${right.id}:${right.text}`),
  );
}

export default function Quiz({
  title,
  question,
  options,
  correctIndex,
  explanation,
  questions,
}: QuizProps) {
  const quizQuestions: Question[] = questions?.length
    ? questions
    : [{ question: question ?? '', options, correctIndex, explanation }];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [judgements, setJudgements] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const normalizedOptions = useMemo(
    () => normalizeOptions(currentQuestion),
    [currentQuestion],
  );
  const orderedOptions = useMemo(
    () => orderClaims(normalizedOptions, currentQuestion?.question ?? ''),
    [normalizedOptions, currentQuestion?.question],
  );

  if (!currentQuestion?.question || orderedOptions.length === 0) return null;

  const classifiedCount = orderedOptions.filter(
    (option) => judgements[option.id] !== undefined,
  ).length;
  const allClassified = classifiedCount === orderedOptions.length;
  const canSubmit = allClassified || Object.values(judgements).some((v) => v !== undefined);

  const correctCount = orderedOptions.filter(
    (option) => judgements[option.id] === option.isCorrect,
  ).length;
  const missedSupported = orderedOptions.filter(
    (option) => option.isCorrect && judgements[option.id] !== true,
  );
  const acceptedUnsupported = orderedOptions.filter(
    (option) => !option.isCorrect && judgements[option.id] === true,
  );
  const acceptedCount = orderedOptions.filter(
    (option) => judgements[option.id] === true,
  ).length;
  const completeReasoning =
    allClassified && missedSupported.length === 0 && acceptedUnsupported.length === 0;

  const setOptionEvaluation = (optionId: string, isCorrect: boolean) => {
    setJudgements((prev) => ({ ...prev, [optionId]: isCorrect }));
    if (submitted) {
      setSubmitted(false);
    }
  };

  const submitVerification = () => {
    setJudgements((prev) => {
      const next = { ...prev };
      for (const opt of orderedOptions) {
        if (next[opt.id] === undefined) {
          next[opt.id] = false;
        }
      }
      return next;
    });
    setSubmitted(true);
  };

  const resetQuestion = () => {
    setJudgements({});
    setSubmitted(false);
  };

  const nextQuestion = () => {
    setCurrentQuestionIndex((index) => index + 1);
    resetQuestion();
  };

  const allQuestions = quizQuestions.map((quizQuestion) => ({
    ...quizQuestion,
    answers: normalizeOptions(quizQuestion).filter((option) => option.isCorrect),
  }));

  return (
    <section
      className="quiz-container lu-card-tier2 assessment-shell not-prose"
      aria-label={title || 'Knowledge check'}
      data-component="Quiz"
    >
      <div className="print-static-assessment hidden">
        <div className="print-static-label">{title || 'Knowledge Check'}</div>
        {allQuestions.map((quizQuestion, index) => (
          <div className="print-static-item" key={`${quizQuestion.question}-${index}`}>
            <p className="print-static-question">
              <MathText>{quizQuestion.question}</MathText>
            </p>
            <p className="print-static-answer">
              <strong>Answer:</strong>{' '}
              <MathText>
                {quizQuestion.answers.map((answer) => answer.text).join('; ')}
              </MathText>
            </p>
            {quizQuestion.explanation && (
              <p className="print-static-explanation">
                <MathText>{quizQuestion.explanation}</MathText>
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="label-caps m-0 text-primary dark:text-blue-400">{title || 'Verification Check'}</p>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium tabular-nums text-light-muted dark:text-dark-muted">
            {classifiedCount} / {orderedOptions.length} evaluated
          </span>
          {quizQuestions.length > 1 && (
            <span className="text-xs font-semibold tabular-nums text-light-muted dark:text-dark-muted">
              Question {currentQuestionIndex + 1} of {quizQuestions.length}
            </span>
          )}
        </div>
      </div>

      <h3 className="mb-2 text-base font-bold leading-snug text-light-text dark:text-dark-text md:text-lg">
        <MathText>{currentQuestion.question}</MathText>
      </h3>
      <p className="mb-4 text-xs font-medium text-light-muted dark:text-dark-muted">
        Evaluate each candidate option independently as correct or incorrect before verifying.
      </p>

      <div className="quiz-phase-container grid gap-2.5">
        {orderedOptions.map((option, idx) => {
          const choice = judgements[option.id];
          const isCorrectChoice = submitted && choice === option.isCorrect;
          const isWrongChoice = submitted && choice !== option.isCorrect;

          let rowBorder =
            'border-light-border bg-light-bg/70 dark:border-dark-border dark:bg-dark-bg/50';
          if (isCorrectChoice) {
            rowBorder = 'border-emerald-500/35 bg-emerald-500/[0.04]';
          } else if (isWrongChoice) {
            rowBorder = 'border-rose-500/35 bg-rose-500/[0.04]';
          } else if (choice !== undefined) {
            rowBorder = 'border-primary/35 bg-primary/[0.03]';
          }

          return (
            <div
              key={option.id}
              className={`rounded-lg border p-3.5 transition-colors ${rowBorder}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5 text-sm leading-relaxed text-light-text dark:text-dark-text">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-light-surface font-mono text-[11px] font-bold text-light-muted dark:bg-dark-surface dark:text-dark-muted">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 font-medium">
                    <MathText>{option.text}</MathText>
                  </div>
                </div>

                <div
                  className="inline-flex shrink-0 items-center gap-1.5 self-end sm:self-center"
                  role="group"
                  aria-label={`Evaluate option ${idx + 1}`}
                >
                  <button
                    type="button"
                    aria-pressed={choice === true}
                    onClick={() => setOptionEvaluation(option.id, true)}
                    className={`min-h-9 cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      choice === true
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600 dark:text-white'
                        : 'border-light-border bg-light-surface text-light-text hover:border-emerald-500/50 hover:bg-emerald-500/5 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10'
                    }`}
                  >
                    Correct
                  </button>
                  <button
                    type="button"
                    aria-pressed={choice === false}
                    onClick={() => setOptionEvaluation(option.id, false)}
                    className={`min-h-9 cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      choice === false
                        ? 'border-slate-700 bg-slate-800 text-white shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white'
                        : 'border-light-border bg-light-surface text-light-muted hover:border-slate-400 hover:text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-muted dark:hover:border-slate-500 dark:hover:text-dark-text'
                    }`}
                  >
                    Incorrect
                  </button>
                </div>
              </div>

              {submitted && (
                <div className="mt-2.5 flex items-start gap-2 border-t border-light-border/60 pt-2 text-xs leading-relaxed dark:border-dark-border/60">
                  {isCorrectChoice ? (
                    <Check className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" size={14} />
                  ) : (
                    <X className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" size={14} />
                  )}
                  <div className="text-light-muted dark:text-dark-muted">
                    <span className="font-semibold text-light-text dark:text-dark-text">
                      {option.isCorrect
                        ? 'Correct option.'
                        : 'Incorrect distractor.'}
                    </span>{' '}
                    {option.feedback && <MathText>{option.feedback}</MathText>}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submitVerification}
            className="assessment-action-primary"
          >
            Verify answers <ArrowRight size={15} />
          </button>

          {(classifiedCount > 0 || submitted) && (
            <button
              type="button"
              onClick={resetQuestion}
              className="assessment-action-secondary"
            >
              <RefreshCw size={14} /> Reset
            </button>
          )}

          {submitted && currentQuestionIndex < quizQuestions.length - 1 && (
            <button
              type="button"
              onClick={nextQuestion}
              className="assessment-action-secondary ml-auto"
            >
              Next question <ArrowRight size={15} />
            </button>
          )}
        </div>

        {submitted && (
          <div className="mt-2 grid gap-3">
            <div className={completeReasoning ? 'feedback-success text-sm' : 'feedback-diagnostic text-sm'}>
              {completeReasoning ? (
                <>
                  <strong>All options evaluated accurately.</strong> You identified every correct option and rejected every incorrect distractor.
                </>
              ) : acceptedCount === 0 && missedSupported.length > 0 ? (
                <>
                  <strong>No correct option selected.</strong> Identify which option is substantiated by the concept or model.
                </>
              ) : (
                <>
                  <strong>Evaluation mismatch ({correctCount} of {orderedOptions.length} aligned).</strong>{' '}
                  You missed {missedSupported.length} correct option{missedSupported.length === 1 ? '' : 's'} and selected {acceptedUnsupported.length} incorrect distractor{acceptedUnsupported.length === 1 ? '' : 's'}.
                </>
              )}
            </div>

            {currentQuestion.explanation && (
              <div className="feedback-info text-sm leading-relaxed text-light-text dark:text-dark-text">
                <strong>Analysis:</strong> <MathText>{currentQuestion.explanation}</MathText>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
