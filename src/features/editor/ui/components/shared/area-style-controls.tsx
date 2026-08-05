import './area-style-controls.scss';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Input } from '@/core/components/ui/input';
import useOnClickOutside from '@/core/hooks/use-on-click-outside';
import { useAreaStyleEditing, type AreaStyleEditing } from '@/features/editor/ui/hooks/use-area-style-editing';
import {
  COLOR_PRESET_REGISTRY,
  FONT_REGISTRY,
  TEXT_ALIGN_REGISTRY,
  TEXT_CASE_REGISTRY,
} from '@/features/editor/domain/services/field-style-config';
import type { FontId, FormatVariant, Rectangle, TextAlign, TextCase } from '@/features/template';
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, CaseSensitiveIcon, FontIcon } from '@/core/icons';

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

interface AreaStyleControlsProps {
  rectangle: Rectangle;
  variant: 'sidebar' | 'toolbar';
  editing?: AreaStyleEditing | null;
}

export const AreaStyleControls = ({ rectangle, variant, editing: editingOverride }: AreaStyleControlsProps) => {
  const internalEditing = useAreaStyleEditing(editingOverride === undefined ? rectangle : null);
  const editing = editingOverride === undefined ? internalEditing : editingOverride;
  const [openPopover, setOpenPopover] = useState<PopoverId>(null);
  const formatRef = useRef<HTMLButtonElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const fontRef = useRef<HTMLButtonElement>(null);
  const styleRef = useRef<HTMLButtonElement>(null);

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
    updateStyle,
    handleFormatChange,
    handleColorPreset,
    handleHexBlur,
    handleHexKeyDown,
    setHexInput,
    displayHex,
  } = editing;

  const togglePopover = (id: PopoverId) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenPopover(prev => (prev === id ? null : id));
  };

  const formatGroup = (
    <div className="area-style-controls__group">
      <p className="area-style-controls__label">Formato</p>
      <div className="area-style-controls__options">
        {formatOptions.map(option => (
          <button
            key={option.id}
            type="button"
            className={clsx('area-style-controls__option', {
              'area-style-controls__option--active': formatVariant === option.id,
            })}
            title={option.preview}
            onClick={() => handleFormatChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  const colorGroup = (
    <div className="area-style-controls__group">
      <p className="area-style-controls__label">Color</p>
      <div className="area-style-controls__color-row">
        {COLOR_PRESET_REGISTRY.map(preset => (
          <button
            key={preset.id}
            type="button"
            className={clsx('area-style-controls__color-swatch', {
              'area-style-controls__color-swatch--active':
                style.color.toLowerCase() === preset.value.toLowerCase(),
              'area-style-controls__color-swatch--white': preset.id === 'white',
            })}
            style={{ backgroundColor: preset.value }}
            title={preset.label}
            onClick={() => handleColorPreset(preset.value)}
          />
        ))}
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
      <div className="area-style-controls__options area-style-controls__options--fonts">
        {FONT_REGISTRY.map(font => (
          <button
            key={font.id}
            type="button"
            className={clsx('area-style-controls__font-option', {
              'area-style-controls__font-option--active': style.fontId === font.id,
            })}
            style={{ fontFamily: font.family }}
            onClick={() => updateStyle({ fontId: font.id as FontId })}
          >
            {font.label}
          </button>
        ))}
      </div>
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

  if (variant === 'sidebar') {
    return (
      <div className="area-style-controls area-style-controls--sidebar">
        {formatGroup}
        {colorGroup}
        {fontGroup}
        {styleGroup}
      </div>
    );
  }

  const activeFormat = formatOptions.find(o => o.id === formatVariant)?.label ?? 'Formato';
  const activeFont = FONT_REGISTRY.find(f => f.id === style.fontId)?.label ?? 'Tipografía';

  return (
    <div className="area-style-controls area-style-controls--toolbar">
      <button
        ref={formatRef}
        type="button"
        className="area-style-controls__toolbar-trigger"
        onClick={togglePopover('format')}
      >
        {activeFormat}
        <div
          className={clsx('area-style-controls__popover', {
            'area-style-controls__popover--visible': openPopover === 'format',
          })}
        >
          <div className="area-style-controls__options">
            {formatOptions.map(option => (
              <button
                key={option.id}
                type="button"
                className={clsx('area-style-controls__option', {
                  'area-style-controls__option--active': formatVariant === option.id,
                })}
                title={option.preview}
                onClick={() => {
                  handleFormatChange(option.id as FormatVariant);
                  setOpenPopover(null);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </button>

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
            <div className="area-style-controls__color-row__presets">
            {COLOR_PRESET_REGISTRY.map(preset => (
              <button
                key={preset.id}
                type="button"
                className={clsx('area-style-controls__color-swatch', {
                  'area-style-controls__color-swatch--active':
                    style.color.toLowerCase() === preset.value.toLowerCase(),
                  'area-style-controls__color-swatch--white': preset.id === 'white',
                })}
                style={{ backgroundColor: preset.value }}
                title={preset.label}
                onClick={() => handleColorPreset(preset.value)}
              />
            ))}
            </div>
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

      <button
        ref={fontRef}
        type="button"
        className="area-style-controls__toolbar-trigger"
        onClick={togglePopover('font')}
      >
        <FontIcon size={12} />
        {activeFont}
        <div
          className={clsx('area-style-controls__popover', {
            'area-style-controls__popover--visible': openPopover === 'font',
          })}
        >
          <div className="area-style-controls__options area-style-controls__options--fonts">
            {FONT_REGISTRY.map(font => (
              <button
                key={font.id}
                type="button"
                className={clsx('area-style-controls__font-option', {
                  'area-style-controls__font-option--active': style.fontId === font.id,
                })}
                style={{ fontFamily: font.family }}
                onClick={() => {
                  updateStyle({ fontId: font.id as FontId });
                  setOpenPopover(null);
                }}
              >
                {font.label}
              </button>
            ))}
          </div>
        </div>
      </button>

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
  );
};
