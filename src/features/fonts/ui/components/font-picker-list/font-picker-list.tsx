import './font-picker-list.scss';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Plus, Search, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/core/components/ui/input';
import { usePlanLimits } from '@/core/plans';
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
  autoFocusSearch?: boolean;
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function matchesSearch(label: string, query: string): boolean {
  if (!query) return true;
  return normalizeSearch(label).includes(query);
}

export function FontPickerList({
  selectedFontId,
  onSelect,
  onUploadClick,
  onManageClick,
  compact = false,
  autoFocusSearch = false,
}: FontPickerListProps) {
  const { t } = useTranslation();
  const customFonts = useFontLibraryStore(state => state.fonts);
  const syncError = useFontLibraryStore(state => state.syncError);
  const { limits, canUploadFont, fontCount } = usePlanLimits();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocusSearch) {
      searchRef.current?.focus();
      return;
    }
    setQuery('');
  }, [autoFocusSearch]);

  const normalizedQuery = normalizeSearch(query.trim());

  const filteredCustomFonts = useMemo(
    () => customFonts.filter(font => matchesSearch(font.name, normalizedQuery)),
    [customFonts, normalizedQuery],
  );

  const filteredSystemFonts = useMemo(
    () => FONT_REGISTRY.filter(font => matchesSearch(font.label, normalizedQuery)),
    [normalizedQuery],
  );

  const isSearching = normalizedQuery.length > 0;
  const noMatches = filteredCustomFonts.length === 0 && filteredSystemFonts.length === 0;
  const fontsLimitHint = t('limits.fontsLimitReached', { max: limits.maxFontFamilies });

  return (
    <div className={clsx('font-picker-list', { 'font-picker-list--compact': compact })}>
      <div
        className="font-picker-list__search"
        onMouseDown={event => event.stopPropagation()}
        onClick={event => event.stopPropagation()}
      >
        <Search className="font-picker-list__search-icon" size={14} aria-hidden />
        <Input
          ref={searchRef}
          type="search"
          className="font-picker-list__search-input"
          value={query}
          placeholder="Buscar tipografía"
          aria-label="Buscar tipografía"
          autoComplete="off"
          spellCheck={false}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            event.stopPropagation();
            if (event.key === 'Enter') event.preventDefault();
          }}
        />
      </div>

      <div className="font-picker-list__body">
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
                disabled={!canUploadFont}
                title={canUploadFont ? undefined : fontsLimitHint}
              >
                <Plus size={14} />
                Subir
              </button>
            </div>
          </div>

          <p className="font-picker-list__usage">
            {t('limits.fontsUsage', {
              used: fontCount,
              max: limits.maxFontFamilies,
            })}
          </p>

          {!canUploadFont ? (
            <p className="font-picker-list__limit">{fontsLimitHint}</p>
          ) : null}

          {customFonts.length === 0 && !isSearching ? (
            <p className="font-picker-list__empty">
              {syncError ?? 'Aún no has subido tipografías'}
            </p>
          ) : filteredCustomFonts.length > 0 ? (
            <div className="font-picker-list__options">
              {filteredCustomFonts.map(font => {
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
          ) : null}
        </div>

        {filteredSystemFonts.length > 0 ? (
          <div className="font-picker-list__section">
            <p className="font-picker-list__section-title">Tipografías del sistema</p>
            <div className="font-picker-list__options">
              {filteredSystemFonts.map(font => (
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
        ) : null}

        {isSearching && noMatches ? (
          <p className="font-picker-list__empty">No hay tipografías que coincidan</p>
        ) : null}
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
