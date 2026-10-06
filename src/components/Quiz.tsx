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

type Phase = 'retrieve' | 'evaluate' | 'review';

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
  return [...options].sort((left, right) => (
    hash(`${question}:${left.id}:${left.text}`) - hash(`${question}:${right.id}:${right.text}`)
  ));
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
  const [phase, setPhase] = useState<Phase>('retrieve');
  const [draft, setDraft] = useState('');
  const [claimIndex, setClaimIndex] = useState(0);
  const [judgements, setJudgements] = useState<Record<string, boolean>>({});

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const normalizedOptions = useMemo(
    () => normalizeOptions(currentQuestion),
    [currentQuestion],
  );
  const orderedOptions = useMemo(
    () => orderClaims(normalizedOptions, currentQuestion.question),
    [normalizedOptions, currentQuestion.question],
  );
  const currentClaim = orderedOptions[claimIndex];
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
  const completeReasoning = missedSupported.length === 0 && acceptedUnsupported.length === 0;

  if (!currentQuestion?.question || orderedOptions.length === 0) return null;

  const resetQuestion = () => {
    setPhase('retrieve');
    setDraft('');
    setClaimIndex(0);
    setJudgements({});
  };

  const judgeClaim = (fits: boolean) => {
    setJudgements((current) => ({ ...current, [currentClaim.id]: fits }));
    if (claimIndex === orderedOptions.length - 1) {
      setPhase('review');
    } else {
      setClaimIndex((index) => index + 1);
    }
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
    <section className="quiz-container assessment-shell" aria-label={title || 'Knowledge check'}>
      <div className="print-static-assessment hidden">
        <div className="print-static-label">{title || 'Knowledge Check'}</div>
        {allQuestions.map((quizQuestion, index) => (
          <div className="print-static-item" key={`${quizQuestion.question}-${index}`}>
            <p className="print-static-question"><MathText>{quizQuestion.question}</MathText></p>
            <p className="print-static-answer">
              <strong>Answer:</strong>{' '}
              <MathText>{quizQuestion.answers.map((answer) => answer.text).join('; ')}</MathText>
            </p>
            {quizQuestion.explanation && (
              <p className="print-static-explanation"><MathText>{quizQuestion.explanation}</MathText></p>
            )}
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="label-caps m-0">{title || 'Retrieval check'}</p>
        {quizQuestions.length > 1 && (
          <span className="text-xs font-semibold tabular-nums text-light-muted dark:text-dark-muted">
            Question {currentQuestionIndex + 1} of {quizQuestions.length}
          </span>
        )}
      </div>

      <h3 className="mb-4 text-lg font-semibold leading-snug text-light-text dark:text-dark-text">
        <MathText>{currentQuestion.question}</MathText>
      </h3>

      {phase === 'retrieve' && (
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-light-text dark:text-dark-text">
            Commit your criterion or answer before seeing the claims
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              className="input-field resize-y font-normal"
              placeholder="State the decisive condition, result, or counterexample."
            />
          </label>
          <button
            type="button"
            onClick={() => setPhase('evaluate')}
            disabled={draft.trim().length < 8}
            className="assessment-action-primary sm:w-fit"
          >
            Evaluate the claims <ArrowRight size={15} />
          </button>
        </div>
      )}

      {phase === 'evaluate' && currentClaim && (
        <div className="grid gap-4">
          <div className="rounded-lg border border-light-border bg-light-bg/70 p-3 text-sm dark:border-dark-border dark:bg-dark-bg/40">
            <span className="font-bold text-light-text dark:text-dark-text">Your retrieval:</span>{' '}
            <span className="text-light-muted dark:text-dark-muted">{draft}</span>
          </div>

          <div className="rounded-xl border border-primary/25 bg-primary/5 p-5">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-primary">
              Claim {claimIndex + 1} of {orderedOptions.length}
            </div>
            <p className="m-0 text-base font-semibold leading-relaxed text-light-text dark:text-dark-text">
              <MathText>{currentClaim.text}</MathText>
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => judgeClaim(true)} className="assessment-action-primary justify-center">
              Supported answer
            </button>
            <button type="button" onClick={() => judgeClaim(false)} className="assessment-action-secondary w-full justify-center">
              Not supported
            </button>
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="grid gap-4">
          <div className={completeReasoning ? 'feedback-success' : 'feedback-diagnostic'}>
            {completeReasoning ? (
              <><strong>Criterion applied consistently.</strong> You identified every supported answer and rejected every unsupported claim.</>
            ) : acceptedCount === 0 && missedSupported.length > 0 ? (
              <><strong>No supported answer was identified.</strong> Rejecting distractors is not enough; reconstruct the criterion and find the claim it entails.</>
            ) : (
              <><strong>Reasoning needs revision.</strong> You missed {missedSupported.length} supported claim{missedSupported.length === 1 ? '' : 's'} and accepted {acceptedUnsupported.length} unsupported claim{acceptedUnsupported.length === 1 ? '' : 's'}.</>
            )}
            {!completeReasoning && <span className="mt-1 block text-xs">Classification trace: {correctCount} of {orderedOptions.length}. This is diagnostic detail, not a passing score.</span>}
          </div>

          <div className="grid gap-2">
            {orderedOptions.map((option) => {
              const learnerAccepted = judgements[option.id];
              const correct = learnerAccepted === option.isCorrect;
              return (
                <div key={option.id} className={`rounded-lg border p-3 ${correct ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-rose-500/25 bg-rose-500/5'}`}>
                  <div className="flex items-start gap-2 text-sm leading-relaxed text-light-text dark:text-dark-text">
                    {correct
                      ? <Check className="mt-0.5 shrink-0 text-emerald-600" size={16} />
                      : <X className="mt-0.5 shrink-0 text-rose-600" size={16} />}
                    <div>
                      <MathText>{option.text}</MathText>
                      <div className="mt-1 text-xs font-semibold text-light-muted dark:text-dark-muted">
                        {option.isCorrect ? 'This is a supported answer.' : 'This claim is not supported.'}
                      </div>
                      {option.feedback && <p className="mb-0 mt-1 text-xs"><MathText>{option.feedback}</MathText></p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {currentQuestion.explanation && (
            <div className="feedback-info text-sm leading-relaxed text-light-text dark:text-dark-text">
              <strong>Reasoning:</strong>{' '}<MathText>{currentQuestion.explanation}</MathText>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {currentQuestionIndex < quizQuestions.length - 1 && completeReasoning ? (
              <button type="button" onClick={nextQuestion} className="assessment-action-primary">
                Next question <ArrowRight size={15} />
              </button>
            ) : (
              <button type="button" onClick={resetQuestion} className="assessment-action-secondary">
                <RefreshCw size={14} /> Reconstruct the answer
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
