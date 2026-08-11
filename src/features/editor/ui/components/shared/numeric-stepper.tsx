import './numeric-stepper.scss';

import { useState } from 'react';

interface NumericStepperProps {
  value: number;
  min?: number;
  max?: number;
  onCommit: (value: number) => void;
  onAdjust: (delta: number) => void;
  decrementLabel?: string;
  incrementLabel?: string;
  className?: string;
}

export function NumericStepper({
  value,
  min = 0,
  max,
  onCommit,
  onAdjust,
  decrementLabel = 'Decrease',
  incrementLabel = 'Increase',
  className,
}: NumericStepperProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue = draft ?? String(value);

  const commitDraft = () => {
    if (draft === null || draft.trim() === '') {
      setDraft(null);
      return;
    }

    const parsed = Number(draft);
    if (Number.isFinite(parsed)) {
      onCommit(parsed);
    }
    setDraft(null);
  };

  return (
    <div className={className ? `numeric-stepper ${className}` : 'numeric-stepper'}>
      <button
        type="button"
        className="numeric-stepper__button"
        onClick={() => onAdjust(-1)}
        aria-label={decrementLabel}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        className="numeric-stepper__input"
        value={displayValue}
        aria-valuemin={min}
        aria-valuemax={max}
        onFocus={() => setDraft(String(value))}
        onChange={event => setDraft(event.target.value.replace(/\D/g, ''))}
        onBlur={commitDraft}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />
      <button
        type="button"
        className="numeric-stepper__button"
        onClick={() => onAdjust(1)}
        aria-label={incrementLabel}
      >
        +
      </button>
    </div>
  );
}
