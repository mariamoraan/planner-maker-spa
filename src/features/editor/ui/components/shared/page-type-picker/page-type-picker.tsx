import './page-type-picker.scss';

import { useCallback, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/core/functions/cn';
import {
  TEMPLATE_TYPE_CONFIG,
  TEMPLATE_TYPE_PICKER_GROUPS,
  pageTypeDescriptionKey,
  pageTypeLabelKey,
  type TemplateType,
  type TemplateTypeCategory,
} from '@/features/template';
import { PageTypeGlyph } from './page-type-glyph';

interface PageTypePickerProps {
  value: TemplateType;
  onChange: (type: TemplateType) => void;
  className?: string;
  /** Show the contextual hint under the selected category. Default true. */
  showHint?: boolean;
}

const FLAT_ORDER = TEMPLATE_TYPE_PICKER_GROUPS.flatMap(group => group.types);

function categoryLabelKey(category: TemplateTypeCategory): string {
  return category === 'structure'
    ? 'editor.addPage.categoryStructure'
    : 'editor.addPage.categoryPlanning';
}

function hintKey(category: TemplateTypeCategory): string {
  return category === 'structure'
    ? 'editor.addPage.hintStructure'
    : 'editor.addPage.hintPlanning';
}

export function PageTypePicker({
  value,
  onChange,
  className,
  showHint = true,
}: PageTypePickerProps) {
  const { t } = useTranslation();
  const optionRefs = useRef<Partial<Record<TemplateType, HTMLButtonElement | null>>>({});

  const focusType = useCallback((type: TemplateType) => {
    optionRefs.current[type]?.focus();
  }, []);

  const moveSelection = useCallback(
    (current: TemplateType, delta: number) => {
      const index = FLAT_ORDER.indexOf(current);
      if (index < 0) return;
      const next = FLAT_ORDER[(index + delta + FLAT_ORDER.length) % FLAT_ORDER.length]!;
      onChange(next);
      focusType(next);
    },
    [focusType, onChange],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent, type: TemplateType) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          moveSelection(type, 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          moveSelection(type, -1);
          break;
        case 'Home':
          event.preventDefault();
          onChange(FLAT_ORDER[0]!);
          focusType(FLAT_ORDER[0]!);
          break;
        case 'End':
          event.preventDefault();
          onChange(FLAT_ORDER[FLAT_ORDER.length - 1]!);
          focusType(FLAT_ORDER[FLAT_ORDER.length - 1]!);
          break;
        default:
          break;
      }
    },
    [focusType, moveSelection, onChange],
  );

  const selectedCategory = TEMPLATE_TYPE_CONFIG[value].category;

  return (
    <div className={cn('page-type-picker', className)}>
      {TEMPLATE_TYPE_PICKER_GROUPS.map(group => (
        <section key={group.category} className="page-type-picker__group">
          <h3 className="page-type-picker__group-label">{t(categoryLabelKey(group.category))}</h3>
          <div
            className="page-type-picker__grid"
            role="radiogroup"
            aria-label={t(categoryLabelKey(group.category))}
          >
            {group.types.map(type => {
              const selected = value === type;
              return (
                <button
                  key={type}
                  ref={node => {
                    optionRefs.current[type] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  className={cn(
                    'page-type-picker__option',
                    selected && 'page-type-picker__option--selected',
                  )}
                  onClick={() => onChange(type)}
                  onKeyDown={event => handleKeyDown(event, type)}
                >
                  <PageTypeGlyph type={type} className="page-type-picker__glyph" />
                  <span className="page-type-picker__text">
                    <span className="page-type-picker__title">{t(pageTypeLabelKey(type))}</span>
                    <span className="page-type-picker__description">
                      {t(pageTypeDescriptionKey(type))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {showHint ? (
        <p className="page-type-picker__hint" key={selectedCategory}>
          {t(hintKey(selectedCategory))}
        </p>
      ) : null}
    </div>
  );
}
