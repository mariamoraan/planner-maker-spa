import './slider-stepper.scss';

import { NumericStepper } from './numeric-stepper';

interface SliderStepperProps {
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}

export function SliderStepper({
  label,
  value,
  min = 0,
  max,
  onChange,
  onCommit,
}: SliderStepperProps) {
  return (
    <div className="slider-stepper">
      <div className="slider-stepper__header">
        <span className="slider-stepper__label">{label}</span>
        <span className="slider-stepper__value">{value}px</span>
      </div>
      <div className="slider-stepper__controls">
        <input
          type="range"
          className="slider-stepper__range"
          min={min}
          max={max}
          value={value}
          onChange={event => onChange(Number(event.target.value))}
          onMouseUp={event => onCommit(Number((event.target as HTMLInputElement).value))}
          onTouchEnd={event => onCommit(Number((event.target as HTMLInputElement).value))}
        />
        <NumericStepper
          className="slider-stepper__fine"
          value={value}
          min={min}
          max={max}
          onCommit={onCommit}
          onAdjust={delta => onCommit(Math.min(max, Math.max(min, value + delta)))}
        />
      </div>
    </div>
  );
}
