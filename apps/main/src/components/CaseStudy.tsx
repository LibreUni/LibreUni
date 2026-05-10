import React, { useState } from 'react';
import { Check, X, RefreshCw, BookOpen, Eye } from 'lucide-react';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface CaseStudyProps {
  title?: string;
  scenario?: string;
  question?: string;
  options?: (string | Option)[];
  correctIndex?: number;
  explanation?: string;
  questions?: any[];
}

export default function CaseStudy(props: CaseStudyProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const title = props.title;
  const scenario = props.scenario || '';

  let qText = props.question || '';
  let opts = props.options || [];
  let correctIdx = props.correctIndex;
  let exp = props.explanation || '';

  if (props.questions && props.questions.length > 0) {
    qText = qText || props.questions[0].question;
    opts = opts.length ? opts : (props.questions[0].options || []);
    correctIdx = correctIdx ?? props.questions[0].correctIndex;
    exp = exp || props.questions[0].explanation;
  }

  // Normalize options to the object format
  const normalizedOptions: Option[] = opts.map((opt, index) => {
    if (typeof opt === 'string') {
      return {
        id: index.toString(),
        text: opt,
        isCorrect: index === correctIdx
      };
    }
    const optObj = opt as any;
    return {
      ...optObj,
      id: optObj.id?.toString() || index.toString(),
      isCorrect: Boolean(optObj.isCorrect) || index === correctIdx
    };
  });

  const hasOptions = normalizedOptions.length > 0;

  const handleOptionClick = (id: string | number) => {
    if (submitted) return;
    setSelected(id.toString());
  };

  const isCorrect = selected !== null && normalizedOptions.find(o => o.id === selected)?.isCorrect;
  const showFeedback = submitted && (!hasOptions || (isCorrect && Boolean(exp)));
  const showSubmittedAction = !hasOptions || !isCorrect;

  const getOptionClass = (option: Option) => {
    const isSelected = selected === option.id;
    const resultClass = submitted && isSelected && option.isCorrect
      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
      : submitted && isSelected
        ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10'
        : isSelected
          ? 'border-primary bg-primary/10 dark:bg-primary/10'
          : 'border-light-border dark:border-dark-border hover:border-primary/60 hover:bg-light-bg dark:hover:bg-dark-bg';

    return [
      'w-full rounded-lg border bg-transparent px-4 py-3 text-left transition-colors',
      'flex items-start gap-3 break-words disabled:cursor-default',
      resultClass
    ].join(' ');
  };

  const reset = () => {
    setSubmitted(false);
    setSelected(null);
  };

  return (
    <div className="case-study-container my-8 rounded-lg border border-primary/20 bg-primary/[0.03] p-4 dark:border-primary/25 dark:bg-primary/[0.06] md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-light-bg px-2.5 py-1 text-xs font-semibold text-primary shadow-sm dark:bg-dark-surface">
                <BookOpen size={13} strokeWidth={2.25} />
                <span>{title || 'Case Study Setup'}</span>
            </div>
        </div>
      </div>

      {(scenario) && (
        <div className="mb-4 rounded-lg border border-light-border bg-light-bg p-4 dark:border-dark-border dark:bg-dark-surface">
          <p className="text-sm leading-relaxed text-light-text dark:text-dark-text">
            {scenario}
          </p>
        </div>
      )}

      {qText && (
        <h3 className="mb-4 break-words text-lg font-semibold leading-snug text-light-text dark:text-dark-text">{qText}</h3>
      )}
      
      {hasOptions ? (
          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))' }}
          >
            {normalizedOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                disabled={submitted}
                className={getOptionClass(option)}
              >
                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${selected === option.id ? 'border-primary bg-primary' : 'border-light-border bg-transparent dark:border-dark-border'}`}>
                  {selected === option.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <span className={`flex-1 break-words text-sm leading-relaxed transition-colors ${selected === option.id ? 'font-medium text-light-text dark:text-dark-text' : 'text-light-muted dark:text-dark-muted'}`}>
                  {option.text}
                </span>
                
                {submitted && selected === option.id && option.isCorrect && (
                    <div className="ml-auto shrink-0 rounded-md bg-emerald-500/10 p-1 text-emerald-500">
                        <Check size={16} strokeWidth={3} />
                    </div>
                )}
                {submitted && selected === option.id && !option.isCorrect && (
                     <div className="ml-auto shrink-0 rounded-md bg-rose-500/10 p-1 text-rose-500">
                        <X size={16} strokeWidth={3} />
                    </div>
                )}
              </button>
            ))}
          </div>
      ) : null}

      {(!submitted || showFeedback || showSubmittedAction) && (
      <div className="mt-5 flex shrink-0 flex-col gap-4">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={hasOptions && !selected}
            className={`
                w-full shrink-0 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors sm:w-auto
                ${(!hasOptions || selected) 
                    ? 'bg-primary hover:bg-primary-dark text-white dark:text-white flex items-center justify-center'
                    : 'bg-light-border text-light-muted dark:bg-dark-border dark:text-dark-muted cursor-not-allowed flex items-center justify-center'}
            `}
          >
             {hasOptions ? 'Check answer' : 'Reveal analysis'}
          </button>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {showFeedback && (
              <div className={`rounded-lg border p-4 transition-colors ${hasOptions ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300' : 'border-primary/20 bg-primary/5 text-primary'}`}>
                {!hasOptions && (
                    <div className="mb-2 flex items-center gap-2">
                        <div className="rounded-md bg-primary p-1.5 text-white">
                            <Eye size={16} strokeWidth={3} />
                        </div>
                        <span className="text-sm font-semibold">Analysis</span>
                    </div>
                )}
                
                {exp && (
                    <div className={`break-words leading-relaxed ${!hasOptions ? 'mt-3 pt-3' : ''}`}>
                        <div className="text-sm whitespace-pre-wrap">{exp}</div>
                    </div>
                )}
              </div>
            )}
            
            {(!hasOptions || !isCorrect) && (
              <div className="flex items-center justify-end">
                <button
                    onClick={reset}
                    className="flex items-center gap-2 rounded-md border border-light-border px-3 py-2 text-sm font-medium text-light-muted transition-colors hover:bg-light-bg hover:text-light-text dark:border-dark-border dark:text-dark-muted dark:hover:bg-dark-bg dark:hover:text-dark-text"
                >
                    <RefreshCw size={14} strokeWidth={2.5} /> Try again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
