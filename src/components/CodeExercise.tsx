import React, { useState } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';
import { highlightCode } from './SyntaxHighlighter';

interface CodeExerciseProps {
  title?: string;
  code?: string; // Use [!blank!] for blanks
  answers?: string[];
  explanation?: string;
}

export default function CodeExercise({ title = "Complete the Code", code, answers, explanation }: CodeExerciseProps) {
  const actualCode = code || '';
  const actualAnswers = answers || [];
  
  // Split by [!blank!] or any sequence of 3 or more underscores
  const parts = actualCode.split(/\[!blank!]|_{3,}/);
  const completedCode = parts.reduce((result, part, index) => {
    const answer = index < actualAnswers.length ? actualAnswers[index] || '' : '';
    return result + part + answer;
  }, '');
  
  const [userInputs, setUserInputs] = useState<string[]>(new Array(actualAnswers.length).fill(''));
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleInputChange = (index: number, value: string) => {
    if (submitted) return;
    const newInputs = [...userInputs];
    newInputs[index] = value;
    setUserInputs(newInputs);
  };

  const checkAnswers = () => {
    const correct = userInputs.every((input, index) => 
      input.trim() === (actualAnswers[index] || '').trim()
    );
    setIsCorrect(correct);
    setSubmitted(true);
  };

  const reset = () => {
    setUserInputs(new Array(actualAnswers.length).fill(''));
    setSubmitted(false);
    setIsCorrect(false);
  };

  return (
    <div className="code-exercise my-12 group">
      <div className="print-static-assessment hidden">
        <div className="print-static-label">{title}</div>
        <pre className="print-static-code"><code>{completedCode}</code></pre>
        {explanation && <p className="print-static-explanation">{explanation}</p>}
      </div>

      <div className="code-exercise-shell bg-light-bg dark:bg-dark-surface rounded-3xl overflow-hidden border border-light-border dark:border-dark-border shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:border-primary/30">
        <div className="code-exercise-header bg-light-surface dark:bg-dark-bg/20 px-5 py-1 md:px-7 md:py-1.5 border-b border-light-border dark:border-dark-border flex items-center justify-start">
          <h3 className="code-exercise-title text-[0.78rem] md:text-sm font-black text-light-text dark:text-dark-text tracking-[0.18em] uppercase leading-none">{title}</h3>
        </div>

        <div className="code-exercise-body p-2 md:p-3">
          <pre className="code-exercise-codeframe hl-default whitespace-pre m-0 overflow-auto p-4 md:p-6 font-mono text-[14.5px] leading-[24px]">
            {parts.map((part, index) => (
              <React.Fragment key={index}>
                <span dangerouslySetInnerHTML={{ __html: highlightCode(part) }} />
                {index < parts.length - 1 && (
                  <input
                    type="text"
                    value={userInputs[index] || ''}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    aria-label={`Code blank ${index + 1}`}
                    disabled={submitted}
                    placeholder="?"
                    size={Math.max((actualAnswers[index] || '').length, 2)}
                    className={`code-exercise-blank
                      mx-1.5 px-2 py-0 h-[22px] rounded border-2 font-black text-center focus:outline-none transition-all duration-300 text-sm
                      ${submitted 
                        ? (userInputs[index]?.trim() === (actualAnswers[index] || '').trim() ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400') 
                        : 'bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:border-primary focus:bg-light-bg dark:focus:bg-dark-surface'}
                    `}
                  />
                )}
              </React.Fragment>
            ))}
          </pre>

          <div className="mt-6 flex flex-col gap-5">
            {!submitted ? (
              <button
                onClick={checkAnswers}
                disabled={userInputs.some(inp => !inp.trim())}
                className={`code-exercise-button
                    self-start px-10 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl
                    ${userInputs.every(inp => inp.trim()) 
                        ? 'bg-primary text-primary-foreground hover:scale-105 active:scale-95 shadow-primary/20'
                        : 'bg-light-border dark:bg-dark-border text-light-muted dark:text-dark-muted cursor-not-allowed'}
                `}
              >
                Compile & Run
              </button>
            ) : (
              <div className="space-y-4">
                <div className={`p-6 rounded-xl border-2 flex flex-col gap-3 ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {isCorrect ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
                    </div>
                    <span className="font-black uppercase tracking-tighter text-xl">
                      {isCorrect ? "Integration Successful" : "Compilation Error"}
                    </span>
                  </div>
                  {!isCorrect && (
                    <div className="text-[10px] font-mono opacity-80 p-4 bg-rose-500/10 rounded-lg border border-rose-500/10 mt-1">
                      <span className="text-rose-500 uppercase text-[9px] font-black tracking-[0.2em] block mb-1.5">Expected Stack Trace</span>
                      {actualAnswers.map((ans, i) => (
                        <div key={i} className="flex gap-3">
                           <span className="opacity-40">[{i}]</span>
                           <span className="font-bold">{ans}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {explanation && (
                    <div className="mt-3 pt-4 border-t border-current/10 opacity-80 leading-relaxed italic text-sm">
                        {explanation}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={reset}
                  className="flex items-center gap-2.5 px-5 py-2.5 bg-light-surface dark:bg-dark-bg/20 text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-white rounded-lg transition-all text-[9px] font-black uppercase tracking-[0.2em] border border-light-border dark:border-dark-border"
                >
                  <RefreshCw size={12} strokeWidth={3} />
                  Restart Simulation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
