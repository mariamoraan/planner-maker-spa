import './empty-planner-setup.scss';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Label } from '@/core/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select';
import { ImageUploader } from '@/features/editor/ui/components/canvas/ImageUploader';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import type { PlannerLocale, WeekStartsOn } from '@/features/template';
import {
  DEFAULT_PAPER_SIZE,
  paperSizeToPoints,
} from '@/features/template/domain/services/paper-size';
import { DEFAULT_WEEK_STARTS_ON } from '@/features/template/domain/services/locale-config';
import { markPendingControlsTour } from '@/features/editor/ui/components/editor-controls-tour/controls-tour-storage';

type SetupStep = 'preferences' | 'upload';

export const EmptyPlannerSetup = () => {
  const { t } = useTranslation();
  const template = useCurrentTemplate();
  const updateTemplate = useTemplateStore(state => state.updateTemplate);
  const [step, setStep] = useState<SetupStep>('preferences');

  const locale = template?.locale ?? 'es';
  const weekStartsOn = template?.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON;

  const pageAspect = useMemo(() => {
    const paperSize = template?.paperSize ?? DEFAULT_PAPER_SIZE;
    const points = paperSizeToPoints(paperSize);
    return `${points.width} / ${points.height}`;
  }, [template?.paperSize]);

  if (!template) return null;

  const handleLocaleChange = (next: PlannerLocale) => {
    updateTemplate(template.id, { locale: next });
  };

  const handleWeekStartsOnChange = (next: WeekStartsOn) => {
    updateTemplate(template.id, { weekStartsOn: next });
  };

  const handleContinue = () => {
    updateTemplate(template.id, { locale, weekStartsOn });
    setStep('upload');
  };

  const handleUploadComplete = () => {
    markPendingControlsTour();
  };

  const stepIndex = step === 'preferences' ? 1 : 2;

  return (
    <div className="empty-planner-setup">
      <div
        className="empty-planner-setup__page animate-fade-in"
        style={{ aspectRatio: pageAspect }}
      >
        <div className="empty-planner-setup__page-header">
          <span className="empty-planner-setup__step-indicator">
            {t('editor.setup.stepIndicator', { current: stepIndex, total: 2 })}
          </span>
          <div className="empty-planner-setup__step-dots" aria-hidden="true">
            <span className={step === 'preferences' ? 'is-active' : 'is-done'} />
            <span className={step === 'upload' ? 'is-active' : undefined} />
          </div>
        </div>

        <div className="empty-planner-setup__page-body">
          {step === 'preferences' ? (
            <>
              <div className="empty-planner-setup__intro">
                <h2 className="empty-planner-setup__title">{t('editor.setup.preferencesTitle')}</h2>
                <p className="empty-planner-setup__description">
                  {t('editor.setup.preferencesDescription')}
                </p>
              </div>

              <div className="empty-planner-setup__fields">
                <div className="empty-planner-setup__field">
                  <Label className="empty-planner-setup__label" htmlFor="setup-planner-locale">
                    {t('editor.plannerLocale')}
                  </Label>
                  <p className="empty-planner-setup__hint">{t('editor.plannerLocaleHint')}</p>
                  <Select value={locale} onValueChange={(value) => handleLocaleChange(value as PlannerLocale)}>
                    <SelectTrigger id="setup-planner-locale" className="empty-planner-setup__select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="empty-planner-setup__field">
                  <Label className="empty-planner-setup__label" htmlFor="setup-week-starts-on">
                    {t('editor.weekStartsOn')}
                  </Label>
                  <p className="empty-planner-setup__hint">{t('editor.weekStartsOnHint')}</p>
                  <Select
                    value={weekStartsOn}
                    onValueChange={(value) => handleWeekStartsOnChange(value as WeekStartsOn)}
                  >
                    <SelectTrigger id="setup-week-starts-on" className="empty-planner-setup__select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">{t('editor.weekStartsOnMonday')}</SelectItem>
                      <SelectItem value="sunday">{t('editor.weekStartsOnSunday')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="empty-planner-setup__actions">
                <Button variant="accent" onClick={handleContinue}>
                  {t('common.continue')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="empty-planner-setup__intro">
                <h2 className="empty-planner-setup__title">{t('editor.setup.uploadTitle')}</h2>
                <p className="empty-planner-setup__description">
                  {t('editor.setup.uploadDescription')}
                </p>
              </div>

              <div className="empty-planner-setup__dropzone">
                <ImageUploader
                  onUploadComplete={handleUploadComplete}
                  customButton={
                    <div className="empty-planner-setup__dropzone-inner">
                      <span className="empty-planner-setup__dropzone-icon" aria-hidden="true">
                        <Upload />
                      </span>
                      <span className="empty-planner-setup__dropzone-label">
                        {t('editor.setup.uploadCta')}
                      </span>
                      <span className="empty-planner-setup__dropzone-hint">
                        {t('editor.setup.uploadFormats')}
                      </span>
                    </div>
                  }
                />
              </div>

              <div className="empty-planner-setup__actions">
                <button
                  type="button"
                  className="empty-planner-setup__back"
                  onClick={() => setStep('preferences')}
                >
                  {t('editor.setup.backToPreferences')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
