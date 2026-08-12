import './grid-alignment-picker.scss';

import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import type { GridAlignH, GridAlignV } from '@/features/editor/domain/services/grid-edit-types';

interface GridAlignmentPickerProps {
  alignH: GridAlignH;
  alignV: GridAlignV;
  onChange: (alignH: GridAlignH, alignV: GridAlignV) => void;
  label?: string;
  variant?: 'inline' | 'dropdown';
}

const ALIGN_H: GridAlignH[] = ['left', 'center', 'right'];
const ALIGN_V: GridAlignV[] = ['top', 'center', 'bottom'];

export const GRID_ALIGNMENT_OPTION_KEYS: Record<string, string> = {
  'left-top': 'editor.gridAlignTopLeft',
  'center-top': 'editor.gridAlignTopCenter',
  'right-top': 'editor.gridAlignTopRight',
  'left-center': 'editor.gridAlignCenterLeft',
  'center-center': 'editor.gridAlignCenter',
  'right-center': 'editor.gridAlignCenterRight',
  'left-bottom': 'editor.gridAlignBottomLeft',
  'center-bottom': 'editor.gridAlignBottomCenter',
  'right-bottom': 'editor.gridAlignBottomRight',
};

export function gridAlignmentValue(alignH: GridAlignH, alignV: GridAlignV): string {
  return `${alignH}-${alignV}`;
}

interface AlignmentGridProps {
  alignH: GridAlignH;
  alignV: GridAlignV;
  onSelect: (alignH: GridAlignH, alignV: GridAlignV) => void;
}

function AlignmentGrid({ alignH, alignV, onSelect }: AlignmentGridProps) {
  const { t } = useTranslation();

  return (
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
              onClick={() => onSelect(h, v)}
              aria-label={t(GRID_ALIGNMENT_OPTION_KEYS[gridAlignmentValue(h, v)]!)}
              aria-pressed={isActive}
            >
              <span className="grid-alignment-picker__dot" />
            </button>
          );
        }),
      )}
    </div>
  );
}

function AlignmentTriggerPreview({
  alignH,
  alignV,
}: {
  alignH: GridAlignH;
  alignV: GridAlignV;
}) {
  return (
    <span
      className="grid-alignment-picker__trigger-cell"
      data-align-h={alignH}
      data-align-v={alignV}
      aria-hidden
    >
      <span className="grid-alignment-picker__dot" />
    </span>
  );
}

function useAlignmentPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setMenuPosition(null);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setMenuPosition({ top: rect.bottom + 6, left: rect.left });
    setIsOpen(true);
  }, [close, isOpen]);

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
  }, [close, isOpen]);

  return {
    isOpen,
    menuPosition,
    triggerRef,
    containerRef,
    menuRef,
    close,
    toggle,
  };
}

export function GridAlignmentPicker({
  alignH,
  alignV,
  onChange,
  label,
  variant = 'dropdown',
}: GridAlignmentPickerProps) {
  const { t } = useTranslation();
  const popover = useAlignmentPopover();

  if (variant === 'dropdown') {
    return (
      <div ref={popover.containerRef} className="grid-alignment-picker grid-alignment-picker--dropdown">
        <button
          ref={popover.triggerRef}
          type="button"
          className={clsx('grid-alignment-picker__trigger', {
            'grid-alignment-picker__trigger--open': popover.isOpen,
          })}
          onClick={popover.toggle}
          title={label ?? t('editor.gridAlignment')}
          aria-label={label ?? t('editor.gridAlignment')}
          aria-expanded={popover.isOpen}
          aria-haspopup="true"
        >
          <AlignmentTriggerPreview alignH={alignH} alignV={alignV} />
        </button>

        {popover.isOpen && popover.menuPosition &&
          createPortal(
            <div
              ref={popover.menuRef}
              className="grid-alignment-picker__popover"
              {...blockSelectionZoneProps}
              style={{
                top: popover.menuPosition.top,
                left: popover.menuPosition.left,
              }}
            >
              {label && (
                <span className="grid-alignment-picker__popover-label">{label}</span>
              )}
              <AlignmentGrid
                alignH={alignH}
                alignV={alignV}
                onSelect={(h, v) => {
                  onChange(h, v);
                  popover.close();
                }}
              />
            </div>,
            document.body,
          )}
      </div>
    );
  }

  return (
    <div className="grid-alignment-picker grid-alignment-picker--inline">
      {label && <span className="grid-alignment-picker__label">{label}</span>}
      <AlignmentGrid alignH={alignH} alignV={alignV} onSelect={onChange} />
    </div>
  );
}
