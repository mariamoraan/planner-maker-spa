import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useTemplateStore } from '@/stores/template-store';
import './add-template-button.scss'

interface Props {
    customButton?: React.ReactElement;
}

export const AddTemplateButton = ({customButton}: Props) => {
  const [newTemplateDialogOpen, setNewTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const { createTemplate } = useTemplateStore();

  const handleCreateTemplate = () => {
    if (newTemplateName.trim()) {
      createTemplate(newTemplateName.trim());
      setNewTemplateName('');
      setNewTemplateDialogOpen(false);
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
                        New Template
                    </Button>
                )
              }
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Give your planner template a name to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="add-template-button__dialog__content" >
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="My Planner 2024"
                 className="add-template-button__dialog__content__input"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewTemplateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
                  Create Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    )
}