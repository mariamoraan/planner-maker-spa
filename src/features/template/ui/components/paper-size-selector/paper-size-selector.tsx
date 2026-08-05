import { useTranslation } from 'react-i18next';
import { cn } from '@/core/functions/cn';
import { Label } from '@/core/components/ui/label';
import {
  DEFAULT_PAPER_SIZE,
  PAPER_SIZE_PRESETS,
  type PaperSize,
} from '@/features/template/domain/services/paper-size';
import './paper-size-selector.scss';

const PRESET_I18N_KEYS: Record<string, string> = {
  'A4-portrait': 'template.paperSize.a4Portrait',
  'A4-landscape': 'template.paperSize.a4Landscape',
  'A5-portrait': 'template.paperSize.a5Portrait',
  'A5-landscape': 'template.paperSize.a5Landscape',
};

function presetKey(size: PaperSize): string {
  return `${size.kind}-${size.orientation}`;
}

function isSamePaperSize(a: PaperSize, b: PaperSize): boolean {
  return a.kind === b.kind && a.orientation === b.orientation;
}

interface PaperSizeSelectorProps {
  value?: PaperSize;
  onChange: (size: PaperSize) => void;
  className?: string;
}

export const PaperSizeSelector = ({
  value = DEFAULT_PAPER_SIZE,
  onChange,
  className,
}: PaperSizeSelectorProps) => {
  const { t } = useTranslation();

  return (
    <div className={cn('paper-size-selector', className)}>
      <Label>{t('template.paperSize.label')}</Label>
      <div className="paper-size-selector__grid" role="radiogroup" aria-label={t('template.paperSize.label')}>
        {PAPER_SIZE_PRESETS.map(preset => {
          const selected = isSamePaperSize(preset, value);
          return (
            <button
              key={presetKey(preset)}
              type="button"
              role="radio"
              aria-checked={selected}
              className={cn('paper-size-selector__option', selected && 'paper-size-selector__option--selected')}
              onClick={() => onChange(preset)}
            >
              <span
                className={cn(
                  'paper-size-selector__preview',
                  preset.orientation === 'landscape' && 'paper-size-selector__preview--landscape',
                )}
                aria-hidden="true"
              />
              <span className="paper-size-selector__label">{t(PRESET_I18N_KEYS[presetKey(preset)])}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
