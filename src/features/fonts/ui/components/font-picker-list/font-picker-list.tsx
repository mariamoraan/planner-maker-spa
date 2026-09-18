import './font-picker-list.scss';

import clsx from 'clsx';
import { Plus, Settings2 } from 'lucide-react';
import type { FontId } from '@/features/template';
import { toCustomFontId } from '@/features/template';
import { FONT_REGISTRY, resolveFontFamily } from '@/features/editor/domain/services/field-style-config';
import { cssFamilyNameForCustomFont } from '@/features/fonts/domain/entities/custom-font-family';
import { useFontLibraryStore } from '@/features/fonts/ui/stores/font-library-store';

interface FontPickerListProps {
  selectedFontId: FontId;
  onSelect: (fontId: FontId) => void;
  onUploadClick: () => void;
  onManageClick?: () => void;
  compact?: boolean;
}

export function FontPickerList({
  selectedFontId,
  onSelect,
  onUploadClick,
  onManageClick,
  compact = false,
}: FontPickerListProps) {
  const customFonts = useFontLibraryStore(state => state.fonts);

  return (
    <div className={clsx('font-picker-list', { 'font-picker-list--compact': compact })}>
      <div className="font-picker-list__section">
        <div className="font-picker-list__section-header">
          <p className="font-picker-list__section-title">Tus tipografías</p>
          <div className="font-picker-list__section-actions">
            {onManageClick ? (
              <button
                type="button"
                className="font-picker-list__icon-btn"
                onClick={onManageClick}
                title="Gestionar tipografías"
              >
                <Settings2 size={14} />
              </button>
            ) : null}
            <button
              type="button"
              className="font-picker-list__upload-btn"
              onClick={onUploadClick}
            >
              <Plus size={14} />
              Subir
            </button>
          </div>
        </div>

        {customFonts.length === 0 ? (
          <p className="font-picker-list__empty">Aún no has subido tipografías</p>
        ) : (
          <div className="font-picker-list__options">
            {customFonts.map(font => {
              const fontId = toCustomFontId(font.id);
              const family = cssFamilyNameForCustomFont(font.id);
              return (
                <button
                  key={font.id}
                  type="button"
                  className={clsx('font-picker-list__option', {
                    'font-picker-list__option--active': selectedFontId === fontId,
                  })}
                  style={{ fontFamily: `"${family}", system-ui, sans-serif` }}
                  onClick={() => onSelect(fontId)}
                >
                  {font.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="font-picker-list__section">
        <p className="font-picker-list__section-title">Tipografías del sistema</p>
        <div className="font-picker-list__options">
          {FONT_REGISTRY.map(font => (
            <button
              key={font.id}
              type="button"
              className={clsx('font-picker-list__option', {
                'font-picker-list__option--active': selectedFontId === font.id,
              })}
              style={{ fontFamily: font.family }}
              onClick={() => onSelect(font.id)}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function resolveFontLabel(fontId: FontId, customFonts: { id: string; name: string }[]): string {
  if (fontId.startsWith('custom:')) {
    const id = fontId.slice('custom:'.length);
    return customFonts.find(font => font.id === id)?.name ?? 'Tipografía';
  }
  return FONT_REGISTRY.find(font => font.id === fontId)?.label
    ?? resolveFontFamily(fontId);
}
