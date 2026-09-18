import './area-style-controls.scss';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Input } from '@/core/components/ui/input';
import useOnClickOutside from '@/core/hooks/use-on-click-outside';
import { useAreaStyleEditing, type AreaStyleEditing } from '@/features/editor/ui/hooks/use-area-style-editing';
import {
  COLOR_PRESET_REGISTRY,
  START_END_DATE_PART_OPTIONS,
  TEXT_ALIGN_REGISTRY,
  TEXT_CASE_REGISTRY,
  getStartEndDatePart,
  getDefaultStartEndVariantForPart,
  getStartEndFormatOptionsForPart,
  getStartEndPartLabel,
  normalizeHexColor,
  type StartEndDatePart,
} from '@/features/editor/domain/services/field-style-config';
import type { FontId, FormatVariant, Rectangle, TextAlign, TextCase } from '@/features/template';
import { toCustomFontId } from '@/features/template';
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, CaseSensitiveIcon, FontIcon } from '@/core/icons';
import {
  FontPickerList,
  resolveFontLabel,
} from '@/features/fonts/ui/components/font-picker-list/font-picker-list';
import { UploadFontFamilyDialog } from '@/features/fonts/ui/components/upload-font-family-dialog/upload-font-family-dialog';
import { ManageFontsDialog } from '@/features/fonts/ui/components/manage-fonts-dialog/manage-fonts-dialog';
import { useFontLibraryStore } from '@/features/fonts/ui/stores/font-library-store';

type PopoverId = 'format' | 'color' | 'font' | 'style' | null;

function TextAlignIcon({ align, size = 16 }: { align: TextAlign; size?: number }) {
  switch (align) {
    case 'left':
      return <AlignLeftIcon size={size} />;
    case 'center':
      return <AlignCenterIcon size={size} />;
    case 'right':
      return <AlignRightIcon size={size} />;
  }
}

function isNearWhite(color: string): boolean {
  return normalizeHexColor(color) === '#ffffff';
}

interface AreaStyleControlsProps {
  rectangle: Rectangle;
  variant: 'sidebar' | 'toolbar';
  editing?: AreaStyleEditing | null;
}

export const AreaStyleControls = ({ rectangle, variant, editing: editingOverride }: AreaStyleControlsProps) => {
  const internalEditing = useAreaStyleEditing(editingOverride === undefined ? rectangle : null);
  const editing = editingOverride === undefined ? internalEditing : editingOverride;
  const [openPopover, setOpenPopover] = useState<PopoverId>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const formatRef = useRef<HTMLButtonElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const fontRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLButtonElement>(null);
  const customFonts = useFontLibraryStore(state => state.fonts);

  useOnClickOutside(formatRef, () => setOpenPopover(prev => (prev === 'format' ? null : prev)));
  useOnClickOutside(colorRef, () => setOpenPopover(prev => (prev === 'color' ? null : prev)));
  useOnClickOutside(fontRef, () => setOpenPopover(prev => (prev === 'font' ? null : prev)));
  useOnClickOutside(styleRef, () => setOpenPopover(prev => (prev === 'style' ? null : prev)));

  useEffect(() => {
    setOpenPopover(null);
  }, [rectangle.id]);

  if (!editing) {
    return null;
  }

  const {
    style,
    formatVariant,
    formatOptions,
    customColors,
    updateStyle,
    handleFormatChange,
    handleColorPreset,
    handleHexBlur,
    handleHexKeyDown,
    setHexInput,
    displayHex,
  } = editing;

  const activeColor = normalizeHexColor(style.color) ?? style.color.toLowerCase();

  const togglePopover = (id: PopoverId) => (e: React.MouseEvent) => {
    e.stopPropagation();
    // Popovers are nested inside the trigger button; ignore option clicks
    // so selecting does not toggle the menu closed.
    if ((e.target as HTMLElement).closest('.area-style-controls__popover')) {
      return;
    }
    setOpenPopover(prev => (prev === id ? null : id));
  };

  const colorSwatches = (
    <div className="area-style-controls__color-row__presets">
      {COLOR_PRESET_REGISTRY.map(preset => (
        <button
          key={preset.id}
          type="button"
          className={clsx('area-style-controls__color-swatch', {
            'area-style-controls__color-swatch--active':
              activeColor === normalizeHexColor(preset.value),
            'area-style-controls__color-swatch--white': preset.id === 'white',
          })}
          style={{ backgroundColor: preset.value }}
          title={preset.label}
          onClick={() => handleColorPreset(preset.value)}
        />
      ))}
      {customColors.map(color => (
        <button
          key={color}
          type="button"
          className={clsx('area-style-controls__color-swatch', {
            'area-style-controls__color-swatch--active': activeColor === color,
            'area-style-controls__color-swatch--white': isNearWhite(color),
          })}
          style={{ backgroundColor: color }}
          title={color}
          onClick={() => handleColorPreset(color)}
        />
      ))}
    </div>
  );

  const isStartEndField =
    rectangle.fieldType === 'startDay' || rectangle.fieldType === 'endDay';
  const startEndPart = isStartEndField ? getStartEndDatePart(formatVariant) : null;
  const startEndFormatOptions =
    startEndPart !== null ? getStartEndFormatOptionsForPart(startEndPart) : formatOptions;

  const handleStartEndPartChange = (part: StartEndDatePart) => {
    handleFormatChange(getDefaultStartEndVariantForPart(part));
  };

  const formatOptionButtons = (
    options: typeof formatOptions,
    { closeOnSelect = false }: { closeOnSelect?: boolean } = {},
  ) =>
    options.map(option => (
      <button
        key={option.id}
        type="button"
        className={clsx('area-style-controls__format-row', {
          'area-style-controls__format-row--active': formatVariant === option.id,
        })}
        title={option.preview}
        onClick={() => {
          handleFormatChange(option.id as FormatVariant);
          if (closeOnSelect) setOpenPopover(null);
        }}
      >
        <span className="area-style-controls__format-row-label">{option.label}</span>
        <span className="area-style-controls__format-row-preview">{option.preview}</span>
      </button>
    ));

  const startEndPartButtons = () => (
    <div className="area-style-controls__segmented" role="group" aria-label="Mostrar">
      {START_END_DATE_PART_OPTIONS.map(option => (
        <button
          key={option.id}
          type="button"
          className={clsx('area-style-controls__segmented-item', {
            'area-style-controls__segmented-item--active': startEndPart === option.id,
          })}
          onClick={() => handleStartEndPartChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  const formatList = (options: typeof formatOptions, closeOnSelect = false) => (
    <div className="area-style-controls__format-list">
      {formatOptionButtons(options, { closeOnSelect })}
    </div>
  );

  const formatGroup = isStartEndField ? (
    <>
      <div className="area-style-controls__group">
        <p className="area-style-controls__label">Mostrar</p>
        {startEndPartButtons()}
      </div>
      <div className="area-style-controls__group">
        <p className="area-style-controls__label">Formato</p>
        {formatList(startEndFormatOptions)}
      </div>
    </>
  ) : (
    <div className="area-style-controls__group">
      <p className="area-style-controls__label">Formato</p>
      {formatList(formatOptions)}
    </div>
  );

  const colorGroup = (
    <div className="area-style-controls__group">
      <p className="area-style-controls__label">Color</p>
      <div className="area-style-controls__color-row">
        {colorSwatches}
        <Input
          className="area-style-controls__hex-input"
          value={displayHex}
          placeholder="#1f2a3d"
          onChange={e => setHexInput(e.target.value)}
          onBlur={handleHexBlur}
          onKeyDown={handleHexKeyDown}
          onFocus={() => setHexInput(style.color)}
        />
      </div>
    </div>
  );

  const fontGroup = (
    <div className="area-style-controls__group">
      <p className="area-style-controls__label">Tipografía</p>
      <FontPickerList
        selectedFontId={style.fontId}
        onSelect={fontId => updateStyle({ fontId })}
        onUploadClick={() => setUploadOpen(true)}
        onManageClick={() => setManageOpen(true)}
      />
    </div>
  );

  const styleGroup = (
    <>
      <div className="area-style-controls__group">
        <p className="area-style-controls__label">Estilo</p>
        <div className="area-style-controls__options">
          <button
            type="button"
            className={clsx('area-style-controls__style-toggle', {
              'area-style-controls__style-toggle--active': style.bold,
            })}
            onClick={() => updateStyle({ bold: !style.bold })}
          >
            B
          </button>
          <button
            type="button"
            className={clsx(
              'area-style-controls__style-toggle',
              'area-style-controls__style-toggle--italic',
              {
                'area-style-controls__style-toggle--active': style.italic,
              },
            )}
            onClick={() => updateStyle({ italic: !style.italic })}
          >
            I
          </button>
        </div>
      </div>

      <div className="area-style-controls__group">
        <p className="area-style-controls__label">Alineación</p>
        <div className="area-style-controls__options">
          {TEXT_ALIGN_REGISTRY.map(option => (
            <button
              key={option.id}
              type="button"
              className={clsx('area-style-controls__style-toggle', {
                'area-style-controls__style-toggle--active': style.textAlign === option.id,
              })}
              title={option.label}
              onClick={() => updateStyle({ textAlign: option.id })}
            >
              <TextAlignIcon align={option.id} />
            </button>
          ))}
        </div>
      </div>

      <div className="area-style-controls__group">
        <p className="area-style-controls__label">Capitalización</p>
        <div className="area-style-controls__options">
          {TEXT_CASE_REGISTRY.map(option => (
            <button
              key={option.id}
              type="button"
              className={clsx('area-style-controls__option', 'area-style-controls__option--text-case', {
                'area-style-controls__option--active': style.textCase === option.id,
              })}
              title={option.label}
              onClick={() => updateStyle({ textCase: option.id as TextCase })}
            >
              {option.preview}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  const hasFormatOptions = formatOptions.length > 0;

  if (variant === 'sidebar') {
    return (
      <>
        <div className="area-style-controls area-style-controls--sidebar">
          {hasFormatOptions ? formatGroup : null}
          {colorGroup}
          {fontGroup}
          {styleGroup}
        </div>
        <UploadFontFamilyDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onCreated={fontId => updateStyle({ fontId: toCustomFontId(fontId) })}
        />
        <ManageFontsDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          onRequestUpload={() => setUploadOpen(true)}
        />
      </>
    );
  }

  const activeFormat = isStartEndField && startEndPart !== null
    ? getStartEndPartLabel(startEndPart)
    : (formatOptions.find(o => o.id === formatVariant)?.label ?? 'Formato');
  const activeFont = resolveFontLabel(style.fontId, customFonts);

  return (
    <>
    <div className="area-style-controls area-style-controls--toolbar">
      {hasFormatOptions ? (
      <button
        ref={formatRef}
        type="button"
        className="area-style-controls__toolbar-trigger"
        onClick={togglePopover('format')}
      >
        {activeFormat}
        <div
          className={clsx('area-style-controls__popover', 'area-style-controls__popover--format', {
            'area-style-controls__popover--format-start-end': isStartEndField,
            'area-style-controls__popover--visible': openPopover === 'format',
          })}
          onMouseDown={e => e.stopPropagation()}
        >
          {isStartEndField ? (
            <div className="area-style-controls__format-panel">
              <p className="area-style-controls__label">Mostrar</p>
              {startEndPartButtons()}
              <p className="area-style-controls__label area-style-controls__label--nested">
                Formato
              </p>
              {formatList(startEndFormatOptions, true)}
            </div>
          ) : (
            formatList(formatOptions, true)
          )}
        </div>
      </button>
      ) : null}

      <div ref={colorRef} className="area-style-controls__toolbar-popover-anchor">
        <button
          type="button"
          className="area-style-controls__toolbar-trigger area-style-controls__toolbar-trigger--color"
          onClick={togglePopover('color')}
        >
          <span
            className="area-style-controls__toolbar-color-preview"
            style={{ backgroundColor: style.color }}
          />
        </button>
        <div
          className={clsx('area-style-controls__popover', 'area-style-controls__popover--color', {
            'area-style-controls__popover--visible': openPopover === 'color',
          })}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="area-style-controls__color-row area-style-controls__color-row--toolbar-popover">
            {colorSwatches}
            <Input
              className="area-style-controls__hex-input"
              value={displayHex}
              placeholder="#1f2a3d"
              onChange={e => setHexInput(e.target.value)}
              onBlur={handleHexBlur}
              onKeyDown={handleHexKeyDown}
              onFocus={() => setHexInput(style.color)}
            />
          </div>
        </div>
      </div>

      <div ref={fontRef} className="area-style-controls__toolbar-popover-anchor">
        <button
          type="button"
          className="area-style-controls__toolbar-trigger"
          onClick={togglePopover('font')}
        >
          <FontIcon size={12} />
          {activeFont}
        </button>
        <div
          className={clsx('area-style-controls__popover', {
            'area-style-controls__popover--visible': openPopover === 'font',
          })}
          onMouseDown={e => e.stopPropagation()}
        >
          <FontPickerList
            selectedFontId={style.fontId}
            onSelect={fontId => {
              updateStyle({ fontId });
              setOpenPopover(null);
            }}
            onUploadClick={() => {
              setOpenPopover(null);
              setUploadOpen(true);
            }}
            onManageClick={() => {
              setOpenPopover(null);
              setManageOpen(true);
            }}
            compact
            autoFocusSearch={openPopover === 'font'}
          />
        </div>
      </div>

      <button
        ref={styleRef}
        type="button"
        className="area-style-controls__toolbar-trigger"
        onClick={togglePopover('style')}
      >
        <CaseSensitiveIcon size={12} />
        Estilo
        <div
          className={clsx('area-style-controls__popover', {
            'area-style-controls__popover--visible': openPopover === 'style',
          })}
        >
          <div className="area-style-controls__options">
            <button
              type="button"
              className={clsx('area-style-controls__style-toggle', {
                'area-style-controls__style-toggle--active': style.bold,
              })}
              onClick={() => updateStyle({ bold: !style.bold })}
            >
              B
            </button>
            <button
              type="button"
              className={clsx(
                'area-style-controls__style-toggle',
                'area-style-controls__style-toggle--italic',
                {
                  'area-style-controls__style-toggle--active': style.italic,
                },
              )}
              onClick={() => updateStyle({ italic: !style.italic })}
            >
              I
            </button>
          </div>
          <div className="area-style-controls__options">
            {TEXT_ALIGN_REGISTRY.map(option => (
              <button
                key={option.id}
                type="button"
                className={clsx('area-style-controls__style-toggle', {
                  'area-style-controls__style-toggle--active': style.textAlign === option.id,
                })}
                title={option.label}
                onClick={() => updateStyle({ textAlign: option.id })}
              >
                <TextAlignIcon align={option.id} />
              </button>
            ))}
          </div>
          <div className="area-style-controls__options area-style-controls__options--text-case">
            {TEXT_CASE_REGISTRY.map(option => (
              <button
                key={option.id}
                type="button"
                className={clsx('area-style-controls__option', 'area-style-controls__option--text-case', {
                  'area-style-controls__option--active': style.textCase === option.id,
                })}
                title={option.label}
                onClick={() => updateStyle({ textCase: option.id as TextCase })}
              >
                {option.preview}
              </button>
            ))}
          </div>
        </div>
      </button>
    </div>
    <UploadFontFamilyDialog
      open={uploadOpen}
      onOpenChange={setUploadOpen}
      onCreated={fontId => updateStyle({ fontId: toCustomFontId(fontId) })}
    />
    <ManageFontsDialog
      open={manageOpen}
      onOpenChange={setManageOpen}
      onRequestUpload={() => setUploadOpen(true)}
    />
    </>
  );
};
