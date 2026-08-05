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
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { PaperSizeSelector } from '@/features/template/ui/components/paper-size-selector/paper-size-selector';
import { DEFAULT_PAPER_SIZE, type PaperSize } from '@/features/template/domain/services/paper-size';
import './add-template-button.scss'
import { useNavigate } from 'react-router-dom';
import { getEditorPath } from '@/core/routes/paths';

interface Props {
    customButton?: React.ReactElement;
    label?: string;
}

export const AddTemplateButton = ({ customButton, label = 'Nuevo proyecto' }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setCurrentImage = useTemplateStore(state => state.setCurrentImage)

  const [newTemplateDialogOpen, setNewTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [paperSize, setPaperSize] = useState<PaperSize>(DEFAULT_PAPER_SIZE);

  const { createTemplate } = useTemplateStore();

  const handleCreateTemplate = () => {
    if (newTemplateName.trim()) {
      const templateId = createTemplate(newTemplateName.trim(), paperSize);
      setNewTemplateName('');
      setPaperSize(DEFAULT_PAPER_SIZE);
      setNewTemplateDialogOpen(false);
      setCurrentImage(null);
        navigate(getEditorPath(templateId));
    }
  };

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
    )
}
