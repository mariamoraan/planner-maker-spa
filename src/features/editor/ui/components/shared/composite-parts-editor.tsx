import './composite-parts-editor.scss';

import clsx from 'clsx';
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import {
  COMPOSITE_PRESETS,
  DEFAULT_COMPOSITE_PARTS,
  type CompositeDateSource,
  type CompositePart,
  type Rectangle,
} from '@/features/template';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';
import { resolveCompositeParts } from '@/features/editor/domain/services/planner-utils';

interface CompositePartsEditorProps {
  rectangle: Rectangle;
}

interface FormatChoice {
  variant: string;
  labelKey: string;
  preview: string;
}

interface AddTokenOption {
  id: string;
  labelKey: string;
  part: CompositePart;
  group: 'current' | 'range' | 'separator';
}

const CURRENT_TOKEN_OPTIONS: AddTokenOption[] = [
  {
    id: 'weekday',
    labelKey: 'editor.compositePartWeekday',
    part: { kind: 'weekday', variant: 'full' },
    group: 'current',
  },
  {
    id: 'day',
    labelKey: 'editor.compositePartDay',
    part: { kind: 'day', variant: 'numeric' },
    group: 'current',
  },
  {
    id: 'month',
    labelKey: 'editor.compositePartMonth',
    part: { kind: 'month', variant: 'name' },
    group: 'current',
  },
  {
    id: 'year',
    labelKey: 'editor.compositePartYear',
    part: { kind: 'year', variant: 'YYYY' },
    group: 'current',
  },
  {
    id: 'weekNumber',
    labelKey: 'editor.compositePartWeekNumber',
    part: { kind: 'weekNumber' },
    group: 'current',
  },
];

const RANGE_TOKEN_OPTIONS: AddTokenOption[] = [
  {
    id: 'start-day',
    labelKey: 'editor.compositePartStartDay',
    part: { kind: 'day', variant: 'numeric', source: 'start' },
    group: 'range',
  },
  {
    id: 'end-day',
    labelKey: 'editor.compositePartEndDay',
    part: { kind: 'day', variant: 'numeric', source: 'end' },
    group: 'range',
  },
  {
    id: 'start-month',
    labelKey: 'editor.compositePartStartMonth',
    part: { kind: 'month', variant: 'name', source: 'start' },
    group: 'range',
  },
  {
    id: 'end-month',
    labelKey: 'editor.compositePartEndMonth',
    part: { kind: 'month', variant: 'name', source: 'end' },
    group: 'range',
  },
  {
    id: 'start-year',
    labelKey: 'editor.compositePartStartYear',
    part: { kind: 'year', variant: 'YYYY', source: 'start' },
    group: 'range',
  },
  {
    id: 'end-year',
    labelKey: 'editor.compositePartEndYear',
    part: { kind: 'year', variant: 'YYYY', source: 'end' },
    group: 'range',
  },
];

function createPartId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `part-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ensurePartIds(parts: CompositePart[]): CompositePart[] {
  return parts.map(part => (part.id ? part : { ...part, id: createPartId() }));
}

function partSource(part: CompositePart): CompositeDateSource | undefined {
  if (part.kind === 'literal' || part.kind === 'linebreak') return undefined;
  return part.source;
}

function partLabel(part: CompositePart, t: (key: string) => string): string {
  const source = partSource(part);
  switch (part.kind) {
    case 'weekday':
      return t('editor.compositePartWeekday');
    case 'day':
      if (source === 'start') return t('editor.compositePartStartDay');
      if (source === 'end') return t('editor.compositePartEndDay');
      return t('editor.compositePartDay');
    case 'month':
      if (source === 'start') return t('editor.compositePartStartMonth');
      if (source === 'end') return t('editor.compositePartEndMonth');
      return t('editor.compositePartMonth');
    case 'year':
      if (source === 'start') return t('editor.compositePartStartYear');
      if (source === 'end') return t('editor.compositePartEndYear');
      return t('editor.compositePartYear');
    case 'weekNumber':
      return t('editor.compositePartWeekNumber');
    case 'linebreak':
      return t('editor.compositePartLinebreak');
    case 'literal':
      return `"${part.value}"`;
  }
}

function formatChoicesForPart(part: CompositePart): FormatChoice[] | null {
  switch (part.kind) {
    case 'month':
      return [
        { variant: 'name', labelKey: 'editor.compositeFormatText', preview: 'mayo' },
        { variant: 'numeric', labelKey: 'editor.compositeFormatNumber', preview: '5' },
      ];
    case 'year':
      return [
        { variant: 'YYYY', labelKey: 'editor.compositeFormatYearLong', preview: '2026' },
        { variant: 'YY', labelKey: 'editor.compositeFormatYearShort', preview: '26' },
      ];
    default:
      return null;
  }
}

interface SortablePartRowProps {
  part: CompositePart;
  id: string;
  onRemove: () => void;
  onUpdateLiteral: (value: string) => void;
  onUpdateVariant: (variant: string) => void;
  t: (key: string) => string;
}

const SortablePartRow = ({
  part,
  id,
  onRemove,
  onUpdateLiteral,
  onUpdateVariant,
  t,
}: SortablePartRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const formatChoices = formatChoicesForPart(part);
  const currentVariant =
    part.kind === 'month' || part.kind === 'year' ? part.variant : undefined;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx('composite-parts-editor__part', {
        'composite-parts-editor__part--dragging': isDragging,
        'composite-parts-editor__part--linebreak': part.kind === 'linebreak',
      })}
    >
      <button
        type="button"
        className="composite-parts-editor__drag-handle"
        aria-label={t('editor.compositeDragPart')}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      {part.kind === 'literal' ? (
        <input
          className="composite-parts-editor__literal-input"
          value={part.value}
          placeholder={t('editor.compositeLiteralPlaceholder')}
          onChange={e => onUpdateLiteral(e.target.value)}
          aria-label={t('editor.compositeLiteralPlaceholder')}
        />
      ) : part.kind === 'linebreak' ? (
        <span className="composite-parts-editor__linebreak-chip">
          {t('editor.compositePartLinebreak')}
        </span>
      ) : (
        <span className="composite-parts-editor__part-label">{partLabel(part, t)}</span>
      )}

      {formatChoices && currentVariant !== undefined ? (
        <select
          className="composite-parts-editor__format-select"
          value={currentVariant}
          aria-label={t('editor.compositePartFormat')}
          onChange={e => onUpdateVariant(e.target.value)}
        >
          {formatChoices.map(choice => (
            <option key={choice.variant} value={choice.variant}>
              {t(choice.labelKey)} ({choice.preview})
            </option>
          ))}
        </select>
      ) : null}

      <button
        type="button"
        className="composite-parts-editor__remove"
        onClick={onRemove}
        aria-label={t('editor.compositeRemovePart')}
      >
        ×
      </button>
    </div>
  );
};

export const CompositePartsEditor = ({ rectangle }: CompositePartsEditorProps) => {
  const { t } = useTranslation();
  const { updateArea } = useManageAreas();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const parts = resolveCompositeParts(rectangle);
  const partIds = parts.map((part, index) => part.id ?? `idx-${index}`);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

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

  // Stamp stable ids once when the content menu opens
  useEffect(() => {
    if (!isOpen) return;
    const resolved = resolveCompositeParts(rectangle);
    if (resolved.every(part => part.id)) return;
    updateArea(rectangle.id, { compositeParts: ensurePartIds(resolved) });
  }, [isOpen, rectangle.id, rectangle.compositeParts, updateArea]);

  const setParts = (next: CompositePart[]) => {
    updateArea(rectangle.id, { compositeParts: ensurePartIds(next) });
  };

  const applyPreset = (presetParts: CompositePart[]) => {
    setParts(presetParts.map(part => ({ ...part, id: createPartId() })));
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const addToken = (part: CompositePart) => {
    setParts([...parts, { ...part, id: createPartId() }]);
  };

  const addLiteral = (value: string) => {
    setParts([...parts, { kind: 'literal', value, id: createPartId() }]);
  };

  const addLinebreak = () => {
    setParts([...parts, { kind: 'linebreak', id: createPartId() }]);
  };

  const updateLiteral = (index: number, value: string) => {
    setParts(
      parts.map((part, i) =>
        i === index && part.kind === 'literal' ? { ...part, value } : part,
      ),
    );
  };

  const updateVariant = (index: number, variant: string) => {
    setParts(
      parts.map((part, i) => {
        if (i !== index) return part;
        if (part.kind === 'month' && (variant === 'numeric' || variant === 'name')) {
          return { ...part, variant };
        }
        if (part.kind === 'year' && (variant === 'YYYY' || variant === 'YY')) {
          return { ...part, variant };
        }
        return part;
      }),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = partIds.indexOf(String(active.id));
    const newIndex = partIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setParts(arrayMove(parts, oldIndex, newIndex));
  };

  const renderAddButtons = (options: AddTokenOption[]) =>
    options.map(option => (
      <button
        key={option.id}
        type="button"
        className="composite-parts-editor__add-btn"
        onClick={() => addToken(option.part)}
      >
        + {t(option.labelKey)}
      </button>
    ));

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
              </div>

              <p className="composite-parts-editor__section-label">
                {t('editor.compositeParts')}
              </p>
              <div className="composite-parts-editor__parts">
                {parts.length === 0 ? (
                  <p className="composite-parts-editor__empty">{t('editor.compositePartsEmpty')}</p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={partIds} strategy={verticalListSortingStrategy}>
                      {parts.map((part, index) => (
                        <SortablePartRow
                          key={partIds[index]}
                          id={partIds[index]}
                          part={part}
                          t={t}
                          onRemove={() => removePart(index)}
                          onUpdateLiteral={value => updateLiteral(index, value)}
                          onUpdateVariant={variant => updateVariant(index, variant)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              <p className="composite-parts-editor__section-label">
                {t('editor.compositeAddCurrent')}
              </p>
              <div className="composite-parts-editor__add">
                {renderAddButtons(CURRENT_TOKEN_OPTIONS)}
              </div>

              <p className="composite-parts-editor__section-label">
                {t('editor.compositeAddRange')}
              </p>
              <div className="composite-parts-editor__add">
                {renderAddButtons(RANGE_TOKEN_OPTIONS)}
              </div>

              <p className="composite-parts-editor__section-label">
                {t('editor.compositeAddSeparators')}
              </p>
              <div className="composite-parts-editor__add">
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
                  onClick={addLinebreak}
                >
                  + {t('editor.compositeAddLinebreak')}
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
