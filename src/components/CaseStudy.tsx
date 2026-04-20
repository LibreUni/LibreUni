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

  const reset = () => {
    setSubmitted(false);
    setSelected(null);
  };

  return (
    <div className="case-study-container my-12 p-6 md:p-10 bg-white dark:bg-dark-surface border border-indigo-200 dark:border-indigo-900/50 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none relative">
      <div className="absolute top-0 left-0 w-full h-1 rounded-t-3xl bg-indigo-500/30"></div>
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 shadow-sm">
                <BookOpen size={14} strokeWidth={2.5} />
                <span>{title || 'Case Study Setup'}</span>
            </div>
        </div>
      </div>

      {(scenario) && (
        <div className="bg-light-bg dark:bg-dark-bg p-6 rounded-2xl border border-light-border dark:border-dark-border mb-8">
          <p className="text-base md:text-lg font-medium text-light-text dark:text-dark-text leading-relaxed">
            {scenario}
          </p>
        </div>
      )}

      {qText && (
        <h3 className="text-xl md:text-2xl font-black text-light-text dark:text-dark-text mb-8 tracking-tight break-words">{qText}</h3>
      )}
      
      {hasOptions ? (
          <div className="grid grid-cols-1 gap-4">
            {normalizedOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                disabled={submitted}
                className={`
                  w-full p-4 md:p-6 rounded-2xl border-2 text-left transition-all flex items-start gap-4 group relative overflow-hidden break-words
                  ${selected === option.id 
                    ? 'border-indigo-500 bg-indigo-500/5' 
                    : 'border-light-border dark:border-dark-border bg-transparent hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-light-bg dark:hover:bg-dark-bg'}
                  ${submitted && option.isCorrect ? '!border-emerald-500 !bg-emerald-500/5' : ''}
                  ${submitted && selected === option.id && !option.isCorrect ? '!border-rose-500 !bg-rose-500/5' : ''}
                `}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${selected === option.id ? 'border-indigo-500 bg-indigo-500' : 'border-light-border dark:border-dark-border bg-transparent'}`}>
                  {selected === option.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className={`flex-1 text-sm md:text-base font-bold transition-colors leading-snug break-words ${selected === option.id ? 'text-light-text dark:text-dark-text' : 'text-light-muted dark:text-dark-muted'}`}>
                  {option.text}
                </span>
                
                {submitted && option.isCorrect && (
                    <div className="ml-auto text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg shrink-0">
                        <Check size={16} strokeWidth={3} />
                    </div>
                )}
                {submitted && selected === option.id && !option.isCorrect && (
                     <div className="ml-auto text-rose-500 bg-rose-500/10 p-1.5 rounded-lg shrink-0">
                        <X size={16} strokeWidth={3} />
                    </div>
                )}
              </button>
            ))}
          </div>
      ) : null}

      <div className="mt-12 md:mt-16 flex flex-col gap-4 shrink-0">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={hasOptions && !selected}
            className={`
                w-full sm:w-auto shrink-0 px-12 py-4 min-h-[56px] rounded-xl font-black transition-all uppercase tracking-[0.2em] text-xs
                ${(!hasOptions || selected) 
                    ? 'bg-primary hover:bg-primary-dark text-white dark:text-white flex items-center justify-center hover:-translate-y-1 active:translate-y-0 shadow-lg shadow-primary/20'
                    : 'bg-primary/50 text-white/70 dark:text-white/50 cursor-not-allowed flex items-center justify-center'}
            `}
          >
             {hasOptions ? 'Analyze Decision' : 'Reveal Solution'}
          </button>
        ) : (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`p-8 rounded-2xl border-2 transition-all shadow-xl ${hasOptions ? (isCorrect ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400') : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'}`}>
                {hasOptions && (
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-xl ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {isCorrect ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}
                        </div>
                        <span className="font-black text-xl uppercase tracking-wider">{isCorrect ? 'Analysis Confirmed' : 'Divergent Analysis'}</span>
                    </div>
                )}
                {!hasOptions && (
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-indigo-500 text-white">
                            <Eye size={20} strokeWidth={3} />
                        </div>
                        <span className="font-black text-xl uppercase tracking-wider">Analysis Breakdown</span>
                    </div>
                )}
                {hasOptions && !isCorrect && (
                    <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <p className="font-bold text-sm tracking-tight text-rose-700 dark:text-rose-300">
                           <span className="uppercase text-[10px] tracking-widest opacity-80 block mb-1">Optimal Approach</span>
                           {normalizedOptions.find(o => o.isCorrect)?.text}
                        </p>
                    </div>
                )}
                {hasOptions && isCorrect && <p className="font-bold text-sm opacity-80 italic tracking-tight underline decoration-emerald-500/30 underline-offset-8">Your structural reasoning aligns with established engineering principles.</p>}
                
                {exp && (
                    <div className={`mt-6 pt-6 opacity-90 leading-relaxed font-medium break-words ${hasOptions ? 'border-t border-current/10' : ''}`}>
                        <div className="text-sm whitespace-pre-wrap">{exp}</div>
                    </div>
                )}
            </div>
            
            <div className="flex items-center justify-end">
                <button
                    onClick={reset}
                    className="flex items-center gap-2 text-[10px] font-black text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text transition-all uppercase tracking-[0.2em] px-6 py-3 rounded-xl border border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg"
                >
                    <RefreshCw size={12} strokeWidth={3} /> Re-evaluate Scenario
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
