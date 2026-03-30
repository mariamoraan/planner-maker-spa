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
                    <Button className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground">
                        <Plus className="w-4 h-4 mr-2" />
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
              <div className="py-4">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="My Planner 2024"
                  className="mt-2"
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