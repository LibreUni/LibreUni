import React, { useState } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
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

export default function Quiz({
  title,
  question,
  options,
  correctIndex,
  explanation,
  questions
}: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // If questions array is provided, use it, otherwise wrap the single question
  const quizQuestions: Question[] = questions || [
    { question: question!, options, correctIndex, explanation }
  ];

  const currentQuestion = quizQuestions[currentQuestionIndex];
  if (!currentQuestion) return null;

  const finalOptions = currentQuestion.options || [];
  const finalIndex = currentQuestion.correctIndex;

  // Normalize options to the object format
  const normalizedOptions: Option[] = finalOptions.map((opt, index) => {
    if (typeof opt === 'string') {
      return {
        id: index.toString(),
        text: opt,
        isCorrect: index === finalIndex
      };
    }
    // Ensure object options have an ID
    const optObj = opt as any;
    return {
      ...optObj,
      id: optObj.id?.toString() || index.toString()
    };
  });

  const handleOptionClick = (id: string | number) => {
    if (submitted) return;
    setSelected(id.toString());
  };

  const isCorrect = selected !== null && normalizedOptions.find(o => o.id === selected)?.isCorrect;

  const getOptionClass = (option: Option) => {
    const isSelected = selected === option.id;
    const resultClass = submitted && option.isCorrect
      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
      : submitted && isSelected
        ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10'
        : isSelected
          ? 'border-primary bg-blue-50 dark:bg-primary/10'
          : 'border-light-border dark:border-dark-border hover:border-primary/60 hover:bg-light-surface dark:hover:bg-dark-bg';

    return [
      'w-full rounded-2xl border-2 bg-transparent p-5 text-left transition-colors',
      'flex items-center gap-4 disabled:cursor-default',
      resultClass
    ].join(' ');
  };

  const handleNext = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelected(null);
      setSubmitted(false);
    }
  };

  const reset = () => {
    setSubmitted(false);
    setSelected(null);
    setCurrentQuestionIndex(0);
  };

  return (
    <div className="quiz-container my-12 rounded-3xl border border-light-border bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface md:p-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <div className="rounded-xl border border-light-border bg-light-bg px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-light-muted shadow-sm dark:border-dark-border dark:bg-dark-bg dark:text-dark-muted">
                {title || 'Conceptual Check'}
            </div>
            {quizQuestions.length > 1 && (
                <div className="rounded-lg bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                    {currentQuestionIndex + 1} / {quizQuestions.length}
                </div>
            )}
        </div>
      </div>

      <h3 className="mb-10 text-2xl font-black leading-tight text-light-text dark:text-dark-text md:text-3xl">{currentQuestion.question}</h3>
      
      <div className="flex flex-col gap-4">
        {normalizedOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleOptionClick(option.id)}
            disabled={submitted}
            className={getOptionClass(option)}
          >
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selected === option.id ? 'border-primary bg-primary' : 'border-light-border bg-transparent dark:border-dark-border'}`}>
                {selected === option.id && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <span className={`text-base font-bold transition-colors ${selected === option.id ? 'text-light-text dark:text-dark-text' : 'text-light-muted dark:text-dark-muted'}`}>{option.text}</span>
            
            {submitted && option.isCorrect && (
                <div className="ml-auto text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg">
                    <Check size={16} strokeWidth={3} />
                </div>
            )}
            {submitted && selected === option.id && !option.isCorrect && (
                 <div className="ml-auto text-rose-500 bg-rose-500/10 p-1.5 rounded-lg">
                    <X size={16} strokeWidth={3} />
                </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-5">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={!selected}
            className={`
                w-full sm:w-auto px-12 py-4 rounded-xl font-black transition-all uppercase tracking-[0.2em] text-xs
                ${selected 
                    ? 'bg-primary text-white hover:scale-[1.03] active:scale-95 shadow-xl shadow-primary/20' 
                    : 'bg-light-border dark:bg-dark-border text-light-muted dark:text-dark-muted cursor-not-allowed'}
            `}
          >
             {quizQuestions.length > 1 ? 'Logic Confirmation' : 'Verify Prediction'}
          </button>
        ) : (
          <div className="flex flex-col gap-6">
            <div className={`p-8 rounded-2xl border-2 transition-all shadow-xl ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-xl ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {isCorrect ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}
                    </div>
                    <span className="font-black text-2xl uppercase tracking-tighter">{isCorrect ? 'Insight Confirmed' : 'Conceptual Divergence'}</span>
                </div>
                {!isCorrect && (
                    <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                        <p className="font-bold text-base italic tracking-tight text-rose-700 dark:text-rose-300">Correct Path: {normalizedOptions.find(o => o.isCorrect)?.text}</p>
                    </div>
                )}
                {isCorrect && <p className="font-bold text-base opacity-80 italic tracking-tight underline decoration-emerald-500/30 underline-offset-8">Precision achieved. Your understanding aligns with the methodology.</p>}
                {currentQuestion.explanation && (
                    <div className="mt-6 border-t border-current/10 pt-6 opacity-90 leading-relaxed font-medium">
                        <p className="text-sm">{currentQuestion.explanation}</p>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-3">
                {currentQuestionIndex < quizQuestions.length - 1 ? (
                    <button
                        onClick={handleNext}
                        className="w-full sm:w-auto px-10 py-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-primary/20"
                    >
                        Next Intelligence Check
                    </button>
                ) : (
                    <button
                        onClick={reset}
                        className="w-fit flex items-center gap-2 text-[10px] font-black text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text transition-all uppercase tracking-[0.2em] px-6 py-3 rounded-xl border border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg"
                    >
                        <RefreshCw size={12} strokeWidth={3} /> Reset Assessment
                    </button>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
