import './grid-alignment-picker.scss';

import clsx from 'clsx';
import type { GridAlignH, GridAlignV } from '@/features/editor/domain/services/grid-edit-types';

interface GridAlignmentPickerProps {
  alignH: GridAlignH;
  alignV: GridAlignV;
  onChange: (alignH: GridAlignH, alignV: GridAlignV) => void;
  label?: string;
}

const ALIGN_H: GridAlignH[] = ['left', 'center', 'right'];
const ALIGN_V: GridAlignV[] = ['top', 'center', 'bottom'];

export function GridAlignmentPicker({
  alignH,
  alignV,
  onChange,
  label,
}: GridAlignmentPickerProps) {
  return (
    <div className="grid-alignment-picker">
      {label && <span className="grid-alignment-picker__label">{label}</span>}
      <div className="grid-alignment-picker__grid">
        {ALIGN_V.map(v =>
          ALIGN_H.map(h => {
            const isActive = alignH === h && alignV === v;
            return (
              <button
                key={`${h}-${v}`}
                type="button"
                className={clsx('grid-alignment-picker__cell', {
                  'grid-alignment-picker__cell--active': isActive,
                })}
                onClick={() => onChange(h, v)}
                aria-label={`${h} ${v}`}
                aria-pressed={isActive}
              >
                <span className="grid-alignment-picker__dot" />
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
