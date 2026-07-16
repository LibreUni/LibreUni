import React, { useState } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';
import MathText from './MathText';

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
      text: optObj.text ?? optObj.label ?? '',
      id: optObj.id?.toString() || index.toString()
    };
  });

  const handleOptionClick = (id: string | number) => {
    if (submitted) return;
    setSelected(id.toString());
  };

  const isCorrect = selected !== null && normalizedOptions.find(o => o.id === selected)?.isCorrect;
  const showFeedback = submitted && isCorrect && Boolean(currentQuestion.explanation);
  const showSubmittedAction = (isCorrect && currentQuestionIndex < quizQuestions.length - 1) || !isCorrect;

  const getOptionClass = (option: Option) => {
    const isSelected = selected === option.id;
    const resultClass = submitted && isSelected && option.isCorrect
      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
      : submitted && isSelected
        ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10'
        : isSelected
          ? 'border-primary bg-primary/10 dark:bg-primary/10'
          : 'border-light-border dark:border-dark-border hover:border-primary/60 hover:bg-light-surface dark:hover:bg-dark-bg';

    return [
      'w-full rounded-lg border bg-transparent px-4 py-3 text-left transition-colors',
      'flex items-start gap-3 disabled:cursor-default',
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

  const retryCurrent = () => {
    setSubmitted(false);
    setSelected(null);
  };

  const allQuestions = quizQuestions
    .map((quizQuestion) => {
      const questionOptions = quizQuestion.options || [];
      const questionCorrectIndex = quizQuestion.correctIndex;
      const normalizedQuestionOptions: Option[] = questionOptions.map((opt, index) => {
        if (typeof opt === 'string') {
          return {
            id: index.toString(),
            text: opt,
            isCorrect: index === questionCorrectIndex
          };
        }

        const optObj = opt as any;
        return {
          ...optObj,
          text: optObj.text ?? optObj.label ?? '',
          id: optObj.id?.toString() || index.toString(),
          isCorrect: Boolean(optObj.isCorrect) || index === questionCorrectIndex
        };
      });

      const answer = normalizedQuestionOptions.find((option) => option.isCorrect);
      return {
        ...quizQuestion,
        answerText: answer?.text,
      };
    });

  return (
    <div className="quiz-container my-8 rounded-lg border border-primary/20 bg-primary/[0.03] p-4 dark:border-primary/25 dark:bg-primary/[0.06] md:p-5">
      <div className="print-static-assessment hidden">
        <div className="print-static-label">Knowledge Check</div>
        {allQuestions.map((quizQuestion, index) => (
          <div className="print-static-item" key={`${quizQuestion.question}-${index}`}>
            <p className="print-static-question"><MathText>{quizQuestion.question}</MathText></p>
            {quizQuestion.answerText && (
              <p className="print-static-answer"><strong>Answer:</strong> <MathText>{quizQuestion.answerText}</MathText></p>
            )}
            {quizQuestion.explanation && (
              <p className="print-static-explanation"><MathText>{quizQuestion.explanation}</MathText></p>
            )}
          </div>
        ))}
      </div>

      <h3 className="mb-4 text-lg font-semibold leading-snug text-light-text dark:text-dark-text"><MathText>{currentQuestion.question}</MathText></h3>
      
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
            <span className={`text-sm leading-relaxed transition-colors ${selected === option.id ? 'font-medium text-light-text dark:text-dark-text' : 'text-light-muted dark:text-dark-muted'}`}><MathText>{option.text}</MathText></span>
            
            {submitted && selected === option.id && option.isCorrect && (
                <div className="ml-auto rounded-md bg-emerald-500/10 p-1 text-emerald-500">
                    <Check size={16} strokeWidth={3} />
                </div>
            )}
            {submitted && selected === option.id && !option.isCorrect && (
                 <div className="ml-auto rounded-md bg-rose-500/10 p-1 text-rose-500">
                    <X size={16} strokeWidth={3} />
                </div>
            )}
          </button>
        ))}
      </div>

      {(!submitted || showFeedback || showSubmittedAction) && (
      <div className="mt-5 flex flex-col gap-4">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={!selected}
            className={`
                w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-colors sm:w-auto
                ${selected 
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-light-border dark:bg-dark-border text-light-muted dark:text-dark-muted cursor-not-allowed'}
            `}
          >
             Check answer
          </button>
        ) : (
          <div className="flex flex-col gap-4">
            {showFeedback && (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4 text-emerald-700 transition-colors dark:text-emerald-300">
                {currentQuestion.explanation && (
                    <div className="leading-relaxed">
                        <p className="text-sm"><MathText>{currentQuestion.explanation}</MathText></p>
                    </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-3">
                {isCorrect && currentQuestionIndex < quizQuestions.length - 1 ? (
                    <button
                        onClick={handleNext}
                        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark sm:w-auto"
                    >
                        Next question
                    </button>
                ) : !isCorrect ? (
                    <button
                        onClick={retryCurrent}
                        className="flex w-fit items-center gap-2 rounded-md border border-light-border px-3 py-2 text-sm font-medium text-light-muted transition-colors hover:bg-light-bg hover:text-light-text dark:border-dark-border dark:text-dark-muted dark:hover:bg-dark-bg dark:hover:text-dark-text"
                    >
                        <RefreshCw size={14} strokeWidth={2.5} /> Try again
                    </button>
                ) : null}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
