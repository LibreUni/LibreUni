import { useState } from 'react';
import { BookOpen, Eye, RefreshCw } from 'lucide-react';
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
  const [draft, setDraft] = useState('');
  const [revealed, setRevealed] = useState(false);

  const firstQuestion = props.questions?.[0];
  const title = props.title || 'Case analysis';
  const scenario = props.scenario || '';
  const question = props.question || firstQuestion?.question || '';
  const options = props.options?.length ? props.options : (firstQuestion?.options || []);
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

  return (
    <section className="case-study-container assessment-shell" aria-label={title}>
      <div className="print-static-assessment hidden">
        <div className="print-static-label">{title}</div>
        {scenario && <p className="print-static-scenario"><MathText>{scenario}</MathText></p>}
        {question && <p className="print-static-question"><MathText>{question}</MathText></p>}
        {referenceDecision && (
          <p className="print-static-answer"><strong>Reference decision:</strong> <MathText>{referenceDecision.text}</MathText></p>
        )}
        {explanation && <p className="print-static-explanation"><MathText>{explanation}</MathText></p>}
      </div>

      <div className="mb-4 flex items-center gap-2 text-primary">
        <BookOpen size={16} />
        <p className="label-caps m-0">{title}</p>
      </div>

      {scenario && (
        <div className="mb-4 rounded-lg border border-light-border bg-light-bg/70 p-4 dark:border-dark-border dark:bg-dark-bg/40">
          <p className="m-0 text-sm leading-relaxed text-light-text dark:text-dark-text"><MathText>{scenario}</MathText></p>
        </div>
      )}

      {question && (
        <h3 className="mb-4 break-words text-lg font-semibold leading-snug text-light-text dark:text-dark-text">
          <MathText>{question}</MathText>
        </h3>
      )}

      {!revealed ? (
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-light-text dark:text-dark-text">
            Record a decision and the constraint that controls it
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              className="input-field resize-y font-normal"
              placeholder="State the decision, then justify it from the scenario evidence."
            />
          </label>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            disabled={draft.trim().length < 20}
            className="assessment-action-primary sm:w-fit"
          >
            <Eye size={15} /> Compare with the reference analysis
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-lg border border-light-border bg-light-bg/70 p-4 text-sm dark:border-dark-border dark:bg-dark-bg/40">
            <div className="mb-1 font-bold text-light-text dark:text-dark-text">Your decision</div>
            <p className="m-0 whitespace-pre-wrap leading-relaxed text-light-muted dark:text-dark-muted">{draft}</p>
          </div>

          {referenceDecision && (
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
              <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-primary">Reference decision</div>
              <p className="m-0 text-sm font-semibold leading-relaxed text-light-text dark:text-dark-text">
                <MathText>{referenceDecision.text}</MathText>
              </p>
            </div>
          )}

          {explanation && (
            <div className="feedback-info text-sm leading-relaxed text-light-text dark:text-dark-text">
              <strong>Analysis:</strong>{' '}<MathText>{explanation}</MathText>
            </div>
          )}

          {normalizedOptions.length > 1 && (
            <details className="rounded-lg border border-light-border p-3 dark:border-dark-border">
              <summary className="min-h-11 cursor-pointer text-sm font-bold text-light-text dark:text-dark-text">Compare the alternatives</summary>
              <ul className="mb-0 mt-2 grid gap-2 pl-5 text-sm leading-relaxed text-light-muted dark:text-dark-muted">
                {normalizedOptions.map((option) => (
                  <li key={option.id}>
                    <MathText>{option.text}</MathText>
                    {option.feedback && <span> — <MathText>{option.feedback}</MathText></span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <button type="button" onClick={() => setRevealed(false)} className="assessment-action-secondary">
            <RefreshCw size={14} /> Revise the decision
          </button>
        </div>
      )}
    </section>
  );
}
