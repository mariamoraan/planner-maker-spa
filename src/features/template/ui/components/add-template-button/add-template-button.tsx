import { Plus } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/components/ui/dialog';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanLimits } from '@/core/plans';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { PaperSizeSelector } from '@/features/template/ui/components/paper-size-selector/paper-size-selector';
import { DEFAULT_PAPER_SIZE, type PaperSize } from '@/features/template/domain/services/paper-size';
import './add-template-button.scss'
import { useNavigate } from 'react-router-dom';
import { getEditorPath } from '@/core/routes/paths';
import { PlanLimitError } from '@/core/plans';

interface Props {
    customButton?: React.ReactElement;
    label?: string;
}

export const AddTemplateButton = ({ customButton, label = 'Nuevo proyecto' }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setCurrentImage = useTemplateStore(state => state.setCurrentImage)
  const { canCreatePlanner, limits, plannerCount } = usePlanLimits();

  const [newTemplateDialogOpen, setNewTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [paperSize, setPaperSize] = useState<PaperSize>(DEFAULT_PAPER_SIZE);
  const [limitError, setLimitError] = useState<string | null>(null);

  const { createTemplate } = useTemplateStore();

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return;
    setLimitError(null);
    try {
      const templateId = createTemplate(newTemplateName.trim(), paperSize);
      setNewTemplateName('');
      setPaperSize(DEFAULT_PAPER_SIZE);
      setNewTemplateDialogOpen(false);
      setCurrentImage(null);
      navigate(getEditorPath(templateId));
    } catch (error) {
      if (error instanceof PlanLimitError) {
        setLimitError(
          t('home.plannerLimitReached', { max: limits.maxPlanners }),
        );
        return;
      }
      throw error;
    }
  };

  const limitHint = t('home.plannerLimitReached', { max: limits.maxPlanners });
  const usageLabel = t('home.plannerUsage', {
    used: plannerCount,
    max: limits.maxPlanners,
  });

  if (!canCreatePlanner) {
    const disabledTrigger = customButton ? (
      <span
        className="add-template-button__disabled-wrap"
        title={limitHint}
        aria-disabled="true"
      >
        {customButton}
      </span>
    ) : (
      <Button className="add-template-button__button" disabled title={limitHint}>
        <Plus className="add-template-button__button__icon" />
        {label}
      </Button>
    );

    return (
      <div className="add-template-button__limit">
        {disabledTrigger}
        <p className="add-template-button__limit-message">{limitHint}</p>
        <p className="add-template-button__limit-usage">{usageLabel}</p>
      </div>
    );
  }

  return (
    <Dialog open={newTemplateDialogOpen} onOpenChange={setNewTemplateDialogOpen}>
      <DialogTrigger asChild>
        {
          customButton
          ? customButton
          : (
              <Button className="add-template-button__button">
                  <Plus className="add-template-button__button__icon" />
                  {label}
              </Button>
          )
        }
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('template.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('template.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="add-template-button__dialog__content" >
          <Label htmlFor="template-name">{t('template.createNameLabel')}</Label>
          <Input
            id="template-name"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder={t('template.createNamePlaceholder')}
           className="add-template-button__dialog__content__input"
          />
          <PaperSizeSelector value={paperSize} onChange={setPaperSize} />
          <p className="add-template-button__limit-usage">{usageLabel}</p>
          {limitError ? (
            <p className="add-template-button__limit-message">{limitError}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setNewTemplateDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
            {t('template.createSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
