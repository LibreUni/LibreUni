import { useState } from 'react';
import { ArrowRight, BookOpen, Check, RefreshCw, X } from 'lucide-react';
import MathText from './MathText';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
}

interface CaseStudyProps {
  title?: string;
  scenario?: string;
  question?: string;
  options?: (string | Option)[];
  correctIndex?: number;
  explanation?: string;
  questions?: Array<{
    question?: string;
    options?: (string | Option)[];
    correctIndex?: number;
    explanation?: string;
  }>;
}

export default function CaseStudy(props: CaseStudyProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');
  const [revealed, setRevealed] = useState(false);

  const firstQuestion = props.questions?.[0];
  const title = props.title || 'Case Study';
  const scenario = props.scenario || '';
  const question = props.question || firstQuestion?.question || '';
  const options = props.options?.length ? props.options : firstQuestion?.options || [];
  const correctIndex = props.correctIndex ?? firstQuestion?.correctIndex;
  const explanation = props.explanation || firstQuestion?.explanation || '';

  const normalizedOptions: Option[] = options.map((option, index) => {
    if (typeof option === 'string') {
      return {
        id: String(index),
        text: option,
        isCorrect: index === correctIndex,
      };
    }

    return {
      ...option,
      id: option.id?.toString() || String(index),
      text: option.text ?? '',
      isCorrect: Boolean(option.isCorrect) || index === correctIndex,
    };
  });

  const referenceDecision = normalizedOptions.find((option) => option.isCorrect);
  const hasOptions = normalizedOptions.length > 0;
  const canEvaluate = hasOptions ? selectedId !== null : rationale.trim().length >= 8;
  const selectedOption = normalizedOptions.find((opt) => opt.id === selectedId);
  const matchedReference = selectedOption?.isCorrect === true;

  const resetCase = () => {
    setSelectedId(null);
    setRationale('');
    setRevealed(false);
  };

  return (
    <section
      className="case-study-container lu-card-tier2 assessment-shell not-prose"
      aria-label={title}
      data-component="CaseStudy"
    >
      <div className="print-static-assessment hidden">
        <div className="print-static-label">{title}</div>
        {scenario && (
          <p className="print-static-scenario">
            <MathText>{scenario}</MathText>
          </p>
        )}
        {question && (
          <p className="print-static-question">
            <MathText>{question}</MathText>
          </p>
        )}
        {referenceDecision && (
          <p className="print-static-answer">
            <strong>Reference decision:</strong>{' '}
            <MathText>{referenceDecision.text}</MathText>
          </p>
        )}
        {explanation && (
          <p className="print-static-explanation">
            <MathText>{explanation}</MathText>
          </p>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2 text-primary dark:text-blue-400">
        <BookOpen size={15} />
        <p className="label-caps m-0 text-primary dark:text-blue-400">{title}</p>
      </div>

      {scenario && (
        <div className="mb-4 rounded-lg border border-light-border bg-light-bg/70 p-4 dark:border-dark-border dark:bg-dark-bg/50">
          <p className="m-0 text-sm leading-relaxed text-light-text dark:text-dark-text">
            <MathText>{scenario}</MathText>
          </p>
        </div>
      )}

      {question && (
        <h3 className="mb-3 break-words text-base font-bold leading-snug text-light-text dark:text-dark-text md:text-lg">
          <MathText>{question}</MathText>
        </h3>
      )}

      <div className="case-study-phase-container grid gap-3">
        {hasOptions ? (
          <div className="grid gap-2" role="radiogroup" aria-label={question || title}>
            {normalizedOptions.map((option, idx) => {
              const isSelected = selectedId === option.id;
              let cardStyle =
                'border-light-border bg-light-bg/70 hover:border-primary/40 dark:border-dark-border dark:bg-dark-bg/50 dark:hover:border-blue-400/40';
              if (revealed) {
                if (option.isCorrect) {
                  cardStyle = 'border-emerald-500/40 bg-emerald-500/[0.05] dark:border-emerald-500/50 dark:bg-emerald-500/10';
                } else if (isSelected) {
                  cardStyle = 'border-rose-500/40 bg-rose-500/[0.05] dark:border-rose-500/50 dark:bg-rose-500/10';
                }
              } else if (isSelected) {
                cardStyle = 'border-primary bg-primary/[0.06] ring-1 ring-primary/30 dark:border-blue-400 dark:bg-blue-500/10 dark:ring-blue-400/40';
              }

              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setSelectedId(option.id);
                    if (revealed) setRevealed(false);
                  }}
                  className={`flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border p-3.5 text-left transition-colors ${cardStyle}`}
                >
                  <div className="flex w-full items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-bold ${
                        isSelected
                          ? 'border-primary bg-primary text-white dark:border-blue-400 dark:bg-blue-400 dark:text-slate-950'
                          : 'border-light-border bg-light-surface text-light-muted dark:border-dark-border dark:bg-dark-surface dark:text-dark-muted'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium leading-relaxed text-light-text dark:text-dark-text">
                      <MathText>{option.text}</MathText>
                    </span>
                  </div>

                  {revealed && (option.isCorrect || isSelected || option.feedback) && (
                    <div className="mt-1 flex items-start gap-2 border-t border-light-border/60 pl-8 pt-2 text-xs leading-relaxed dark:border-dark-border/60">
                      {option.isCorrect ? (
                        <Check className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" size={14} />
                      ) : (
                        <X className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" size={14} />
                      )}
                      <div className="text-light-muted dark:text-dark-muted">
                        <span className="font-semibold text-light-text dark:text-dark-text">
                          {option.isCorrect ? 'Recommended design choice.' : 'Suboptimal trade-off.'}
                        </span>{' '}
                        {option.feedback && <MathText>{option.feedback}</MathText>}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <label className="grid gap-1.5 text-xs font-semibold text-light-muted dark:text-dark-muted">
            <span>State your engineering decision and governing constraint:</span>
            <textarea
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
              rows={3}
              className="input-field resize-y font-normal text-sm"
              placeholder="Identify the primary constraint and the design choice it requires..."
            />
          </label>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canEvaluate}
            onClick={() => setRevealed(true)}
            className="assessment-action-primary"
          >
            Evaluate engineering trade-offs <ArrowRight size={15} />
          </button>

          {(selectedId !== null || rationale.trim().length > 0 || revealed) && (
            <button
              type="button"
              onClick={resetCase}
              className="assessment-action-secondary"
            >
              <RefreshCw size={14} /> Reset
            </button>
          )}
        </div>

        {revealed && (
          <div className="mt-2 grid gap-3">
            {hasOptions && (
              <div className={matchedReference ? 'feedback-success text-sm' : 'feedback-diagnostic text-sm'}>
                {matchedReference ? (
                  <>
                    <strong>Aligned with reference design.</strong> Your selected decision satisfies the governing system constraints.
                  </>
                ) : (
                  <>
                    <strong>Trade-off mismatch.</strong> Compare your selected option against the reference decision and constraint analysis below.
                  </>
                )}
              </div>
            )}

            {referenceDecision && (
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-3.5">
                <div className="mb-1 text-xs font-extrabold uppercase tracking-wider text-primary">
                  Reference Decision
                </div>
                <p className="m-0 text-sm font-semibold leading-relaxed text-light-text dark:text-dark-text">
                  <MathText>{referenceDecision.text}</MathText>
                </p>
              </div>
            )}

            {explanation && (
              <div className="feedback-info text-sm leading-relaxed text-light-text dark:text-dark-text">
                <strong>Trade-off analysis:</strong> <MathText>{explanation}</MathText>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
