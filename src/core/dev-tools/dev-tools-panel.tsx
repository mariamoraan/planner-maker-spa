import './dev-tools-panel.scss';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/core/components/ui/button';
import { Label } from '@/core/components/ui/label';
import { isDevToolsEnabled } from './is-dev-tools-enabled';
import { useDevToolsStore } from './dev-tools-store';

const APP_LOCALES = ['en', 'es'] as const;

function normalizeLocale(lng: string | undefined): (typeof APP_LOCALES)[number] {
  if (lng?.startsWith('es')) return 'es';
  return 'en';
}

export function DevToolsPanel() {
  if (!isDevToolsEnabled()) return null;
  return <DevToolsPanelInner />;
}

function DevToolsPanelInner() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const limitsDisabled = useDevToolsStore((s) => s.limitsDisabled);
  const setLimitsDisabled = useDevToolsStore((s) => s.setLimitsDisabled);
  const locale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="dev-tools-panel">
      {open && (
        <div
          id={panelId}
          className="dev-tools-panel__menu"
          role="dialog"
          aria-label="Developer tools"
        >
          <p className="dev-tools-panel__title">Developer tools</p>

          <div className="dev-tools-panel__field">
            <Label htmlFor="dev-tools-language" className="dev-tools-panel__label">
              Language
            </Label>
            <select
              id="dev-tools-language"
              className="dev-tools-panel__select"
              value={locale}
              onChange={(event) => {
                void i18n.changeLanguage(event.target.value);
              }}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>

          <label className="dev-tools-panel__toggle">
            <input
              type="checkbox"
              checked={limitsDisabled}
              onChange={(event) => setLimitsDisabled(event.target.checked)}
            />
            <span>Disable plan limits</span>
          </label>
          <p className="dev-tools-panel__hint">
            Client only. Cloud uploads still use server limits.
          </p>
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="dev-tools-panel__trigger"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        Dev
      </Button>
    </div>
  );
}
