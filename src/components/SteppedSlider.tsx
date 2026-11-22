import { useId } from 'react';

export interface SteppedSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  ariaLabel?: string;
  labels?: (string | number)[];
  disabled?: boolean;
  className?: string;
}

export default function SteppedSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
  labels,
  disabled = false,
  className = '',
}: SteppedSliderProps) {
  const datalistId = useId();
  const totalSteps = Math.round((max - min) / step);
  const stepsArray = Array.from({ length: totalSteps + 1 }, (_, index) => min + index * step);
  const currentFraction = totalSteps > 0 ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;

  return (
    <div className={`stepped-slider-container w-full ${className}`}>
      <div className="relative flex w-full flex-col pt-1 pb-4">
        {/* Track fill indicating progression */}
        <div
          className="pointer-events-none absolute top-[11px] left-0 right-0 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-150"
            style={{ width: `calc(8px + (100% - 16px) * ${currentFraction})` }}
          />
        </div>

        {/* Track and thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="stepped-slider-input relative z-10 w-full cursor-pointer bg-transparent"
        />

        {/* Semantic datalist for assistive tech */}
        <datalist id={datalistId}>
          {stepsArray.map((stepVal, index) => (
            <option
              key={stepVal}
              value={stepVal}
              label={labels ? String(labels[index] ?? stepVal) : String(stepVal)}
            />
          ))}
        </datalist>

        {/* Notches and labels accurately positioned at exact thumb center percentages */}
        <div
          className="slider-ticks pointer-events-none relative mt-1 h-6 w-full select-none"
          data-slider-ticks="true"
          aria-hidden="true"
        >
          {stepsArray.map((stepVal, index) => {
            const fraction = totalSteps > 0 ? index / totalSteps : 0;
            const isActive = stepVal === value;
            const isPassed = stepVal < value;
            const displayLabel = labels ? labels[index] : totalSteps <= 12 ? stepVal : null;

            return (
              <div
                key={stepVal}
                className="pointer-events-auto absolute flex cursor-pointer flex-col items-center"
                style={{
                  left: `calc(8px + (100% - 16px) * ${fraction})`,
                  transform: 'translateX(-50%)',
                }}
                onClick={() => !disabled && onChange(stepVal)}
              >
                {/* Notch marker */}
                <span
                  className={`block transition-all duration-150 ${
                    isActive
                      ? 'h-3.5 w-1.5 rounded-full bg-primary ring-2 ring-primary/40'
                      : isPassed
                        ? 'h-2.5 w-1 rounded-full bg-primary/70 dark:bg-primary/60'
                        : 'h-2 w-1 rounded-full bg-slate-300 hover:bg-primary/60 dark:bg-slate-600'
                  }`}
                />

                {/* Stage number or label */}
                {displayLabel !== undefined && displayLabel !== null && (
                  <span
                    className={`mt-1 text-[11px] font-bold tabular-nums transition-colors duration-150 ${
                      isActive
                        ? 'font-black text-primary scale-110'
                        : isPassed
                          ? 'text-light-text dark:text-dark-text opacity-90'
                          : 'text-light-text hover:text-primary dark:text-dark-text opacity-60'
                    }`}
                  >
                    {displayLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
