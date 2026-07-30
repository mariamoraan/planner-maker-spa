import './area-style-panel.scss';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Input } from '@/components/ui/input';
import { useManageAreas } from '@/hooks/use-manage-areas';
import { useCurrentImage } from '@/hooks/use-current-image';
import { useTemplateStore } from '@/stores/template-store';
import {
  COLOR_PRESET_REGISTRY,
  FIELD_FORMAT_REGISTRY,
  FONT_REGISTRY,
  getFormatVariant,
  isValidHexColor,
  resolveFieldStyle,
  TEXT_CASE_REGISTRY,
} from '@/lib/field-style-config';

import type { FontId, FormatVariant, TextCase } from '@/types/planner';

export const AreaStylePanel = () => {
  const selectedRectangleId = useTemplateStore(state => state.selectedRectangleId);
  const currentImage = useCurrentImage();
  const { updateArea } = useManageAreas();

  const selectedRectangle = selectedRectangleId
    ? currentImage?.rectangles.find(r => r.id === selectedRectangleId)
    : null;

  const [hexInput, setHexInput] = useState('');

  useEffect(() => {
    setHexInput('');
  }, [selectedRectangleId]);

  if (!selectedRectangle || !currentImage) {
    return null;
  }

  const style = resolveFieldStyle(selectedRectangle);
  const formatVariant = getFormatVariant(selectedRectangle);
  const formatOptions = FIELD_FORMAT_REGISTRY[selectedRectangle.fieldType];

  const updateStyle = (updates: Partial<typeof style>) => {
    updateArea(selectedRectangle.id, {
      style: { ...style, ...updates },
    });
  };

  const handleFormatChange = (variant: FormatVariant) => {
    updateArea(selectedRectangle.id, { formatVariant: variant });
  };

  const handleColorPreset = (color: string) => {
    setHexInput(color);
    updateStyle({ color });
  };

  const handleHexBlur = () => {
    const value = hexInput.trim();
    if (isValidHexColor(value)) {
      updateStyle({ color: value });
    } else {
      setHexInput(style.color);
    }
  };

  const handleHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleHexBlur();
    }
  };

  const displayHex = hexInput || style.color;

  return (
    <div className="area-style-panel">
      <div className="area-style-panel__group">
        <p className="area-style-panel__label">Formato</p>
        <div className="area-style-panel__options">
          {formatOptions.map(option => (
            <button
              key={option.id}
              type="button"
              className={clsx('area-style-panel__option', {
                'area-style-panel__option--active': formatVariant === option.id,
              })}
              onClick={() => handleFormatChange(option.id)}
            >
              {option.preview}
            </button>
          ))}
        </div>
      </div>

      <div className="area-style-panel__group">
        <p className="area-style-panel__label">Color</p>
        <div className="area-style-panel__color-row">
          {COLOR_PRESET_REGISTRY.map(preset => (
            <button
              key={preset.id}
              type="button"
              className={clsx('area-style-panel__color-swatch', {
                'area-style-panel__color-swatch--active': style.color.toLowerCase() === preset.value.toLowerCase(),
                'area-style-panel__color-swatch--white': preset.id === 'white',
              })}
              style={{ backgroundColor: preset.value }}
              title={preset.label}
              onClick={() => handleColorPreset(preset.value)}
            />
          ))}
          <Input
            className="area-style-panel__hex-input"
            value={displayHex}
            placeholder="#1f2a3d"
            onChange={e => setHexInput(e.target.value)}
            onBlur={handleHexBlur}
            onKeyDown={handleHexKeyDown}
            onFocus={() => setHexInput(style.color)}
          />
        </div>
      </div>

      <div className="area-style-panel__group">
        <p className="area-style-panel__label">Tipografía</p>
        <div className="area-style-panel__options area-style-panel__options--fonts">
          {FONT_REGISTRY.map(font => (
            <button
              key={font.id}
              type="button"
              className={clsx('area-style-panel__font-option', {
                'area-style-panel__font-option--active': style.fontId === font.id,
              })}
              style={{ fontFamily: font.family }}
              onClick={() => updateStyle({ fontId: font.id as FontId })}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

      <div className="area-style-panel__group">
        <p className="area-style-panel__label">Estilo</p>
        <div className="area-style-panel__options">
          <button
            type="button"
            className={clsx('area-style-panel__style-toggle', {
              'area-style-panel__style-toggle--active': style.bold,
            })}
            onClick={() => updateStyle({ bold: !style.bold })}
          >
            B
          </button>
          <button
            type="button"
            className={clsx('area-style-panel__style-toggle', 'area-style-panel__style-toggle--italic', {
              'area-style-panel__style-toggle--active': style.italic,
            })}
            onClick={() => updateStyle({ italic: !style.italic })}
          >
            I
          </button>
        </div>
      </div>

      <div className="area-style-panel__group">
        <p className="area-style-panel__label">Capitalización</p>
        <div className="area-style-panel__options">
          {TEXT_CASE_REGISTRY.map(option => (
            <button
              key={option.id}
              type="button"
              className={clsx('area-style-panel__option', 'area-style-panel__option--text-case', {
                'area-style-panel__option--active': style.textCase === option.id,
              })}
              title={option.label}
              onClick={() => updateStyle({ textCase: option.id as TextCase })}
            >
              {option.preview}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
