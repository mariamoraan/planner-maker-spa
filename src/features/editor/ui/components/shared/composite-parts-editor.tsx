import './composite-parts-editor.scss';

import clsx from 'clsx';
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  COMPOSITE_PRESETS,
  DEFAULT_COMPOSITE_PARTS,
  type CompositePart,
  type Rectangle,
} from '@/features/template';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';
import { resolveCompositeParts } from '@/features/editor/domain/services/planner-utils';

interface CompositePartsEditorProps {
  rectangle: Rectangle;
}

type TokenKind = Exclude<CompositePart['kind'], 'literal'>;

const TOKEN_OPTIONS: { kind: TokenKind; labelKey: string; part: CompositePart }[] = [
  { kind: 'weekday', labelKey: 'editor.compositePartWeekday', part: { kind: 'weekday', variant: 'full' } },
  { kind: 'day', labelKey: 'editor.compositePartDay', part: { kind: 'day', variant: 'numeric' } },
  { kind: 'month', labelKey: 'editor.compositePartMonth', part: { kind: 'month', variant: 'name' } },
  { kind: 'year', labelKey: 'editor.compositePartYear', part: { kind: 'year', variant: 'YYYY' } },
  { kind: 'weekNumber', labelKey: 'editor.compositePartWeekNumber', part: { kind: 'weekNumber' } },
];

function partLabel(part: CompositePart, t: (key: string) => string): string {
  switch (part.kind) {
    case 'weekday':
      return t('editor.compositePartWeekday');
    case 'day':
      return t('editor.compositePartDay');
    case 'month':
      return part.variant === 'numeric'
        ? t('editor.compositePartMonthNumeric')
        : t('editor.compositePartMonth');
    case 'year':
      return part.variant === 'YY'
        ? t('editor.compositePartYearShort')
        : t('editor.compositePartYear');
    case 'weekNumber':
      return t('editor.compositePartWeekNumber');
    case 'literal':
      return part.value === '\n' ? '↵' : `"${part.value}"`;
  }
}

export const CompositePartsEditor = ({ rectangle }: CompositePartsEditorProps) => {
  const { t } = useTranslation();
  const { updateArea } = useManageAreas();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const parts = resolveCompositeParts(rectangle);

  const close = () => {
    setIsOpen(false);
    setMenuPosition(null);
  };

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPosition({ top: rect.bottom + 12, left: rect.left });
    setIsOpen(true);
  };

  const toggle = (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      close();
      return;
    }
    openMenu();
  };

  useEffect(() => {
    close();
  }, [rectangle.id]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    };

    const handleScrollOrResize = () => close();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const setParts = (next: CompositePart[]) => {
    updateArea(rectangle.id, { compositeParts: next });
  };

  const applyPreset = (presetParts: CompositePart[]) => {
    setParts(presetParts.map(part => ({ ...part })));
  };

  const movePart = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= parts.length) return;
    const next = [...parts];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setParts(next);
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const addToken = (part: CompositePart) => {
    setParts([...parts, { ...part }]);
  };

  const addLiteral = (value: string) => {
    setParts([...parts, { kind: 'literal', value }]);
  };

  const updateLiteral = (index: number, value: string) => {
    setParts(
      parts.map((part, i) =>
        i === index && part.kind === 'literal' ? { ...part, value } : part,
      ),
    );
  };

  return (
    <div ref={containerRef} className="composite-parts-editor">
      <button
        ref={triggerRef}
        type="button"
        className={clsx('composite-parts-editor__trigger', {
          'composite-parts-editor__trigger--open': isOpen,
        })}
        onClick={toggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {t('editor.compositeEditContent')}
      </button>

      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="composite-parts-editor__popover"
              {...blockSelectionZoneProps}
              style={{ top: menuPosition.top, left: menuPosition.left }}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
            >
              <p className="composite-parts-editor__section-label">
                {t('editor.compositePresets')}
              </p>
              <div className="composite-parts-editor__presets">
                {COMPOSITE_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    className="composite-parts-editor__preset"
                    title={preset.preview}
                    onClick={() => applyPreset(preset.parts)}
                  >
                    {preset.preview}
                  </button>
                ))}
                <button
                  type="button"
                  className="composite-parts-editor__preset"
                  onClick={() => applyPreset(DEFAULT_COMPOSITE_PARTS)}
                >
                  {t('editor.compositeReset')}
                </button>
              </div>

              <p className="composite-parts-editor__section-label">
                {t('editor.compositeParts')}
              </p>
              <div className="composite-parts-editor__parts">
                {parts.length === 0 ? (
                  <p className="composite-parts-editor__empty">{t('editor.compositePartsEmpty')}</p>
                ) : (
                  parts.map((part, index) => (
                    <div key={`${part.kind}-${index}`} className="composite-parts-editor__part">
                      {part.kind === 'literal' ? (
                        <input
                          className="composite-parts-editor__literal-input"
                          value={part.value === '\n' ? '\\n' : part.value}
                          placeholder={t('editor.compositeLiteralPlaceholder')}
                          onChange={e => {
                            const raw = e.target.value;
                            updateLiteral(index, raw === '\\n' ? '\n' : raw);
                          }}
                          aria-label={t('editor.compositeLiteralPlaceholder')}
                        />
                      ) : (
                        <span className="composite-parts-editor__part-label">
                          {partLabel(part, t)}
                        </span>
                      )}
                      <div className="composite-parts-editor__part-actions">
                        <button
                          type="button"
                          onClick={() => movePart(index, -1)}
                          aria-label={t('editor.compositeMoveUp')}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => movePart(index, 1)}
                          aria-label={t('editor.compositeMoveDown')}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removePart(index)}
                          aria-label={t('editor.compositeRemovePart')}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <p className="composite-parts-editor__section-label">{t('editor.compositeAdd')}</p>
              <div className="composite-parts-editor__add">
                {TOKEN_OPTIONS.map(option => (
                  <button
                    key={option.kind}
                    type="button"
                    className="composite-parts-editor__add-btn"
                    onClick={() => addToken(option.part)}
                  >
                    + {t(option.labelKey)}
                  </button>
                ))}
                <button
                  type="button"
                  className="composite-parts-editor__add-btn"
                  onClick={() => addLiteral(' ')}
                >
                  + {t('editor.compositeAddSpace')}
                </button>
                <button
                  type="button"
                  className="composite-parts-editor__add-btn"
                  onClick={() => addLiteral('/')}
                >
                  + /
                </button>
                <button
                  type="button"
                  className="composite-parts-editor__add-btn"
                  onClick={() => addLiteral('\n')}
                >
                  + ↵
                </button>
                <button
                  type="button"
                  className="composite-parts-editor__add-btn"
                  onClick={() => addLiteral(t('editor.compositeDefaultText'))}
                >
                  + {t('editor.compositeAddText')}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};
