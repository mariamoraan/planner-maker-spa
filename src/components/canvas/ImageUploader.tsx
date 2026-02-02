import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fileToBase64 } from '@/lib/planner-utils';
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

interface ImageUploaderProps {
  onImageUpload: (imageData: string, width: number, height: number, fileName: string) => void;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, className }) => {
  

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Please upload an image file');
      return;
    }
    
    try {
      const imageData = await fileToBase64(file);
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        onImageUpload(imageData, img.width, img.height, file.name);
      };
      img.src = imageData;
    } catch (error) {
      console.error('Error loading image:', error);
    }
  }, [onImageUpload]);
  
  return (
    <div className={cn("relative", className)}>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <Button variant="outline" className="w-full pointer-events-none">
        <Upload className="w-4 h-4 mr-2" />
        Upload Image
      </Button>
    </div>
  );
};



interface EmptyCanvasStateProps {
  onImageUpload: (imageData: string, width: number, height: number, fileName: string) => void;
  onCreateTemplate: (name: string) => void;
  hasTemplates: boolean;
}

const EmptyCanvasStateCreateTemplate: React.FC<EmptyCanvasStateProps> = ({ onCreateTemplate}) => {
const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDialogOpen, setNewTemplateDialogOpen] = useState(false);

  const handleCreateTemplate = useCallback(() => {
    if (newTemplateName.trim()) {
      onCreateTemplate(newTemplateName.trim());
      setNewTemplateName('');
      setNewTemplateDialogOpen(false);
    }
  }, [newTemplateName, onCreateTemplate]);
    
  
  return (
    <div className="flex-1 flex items-center justify-center canvas-workspace">
      <div className="text-center animate-fade-in">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shadow-soft">
          <ImageIcon className="w-12 h-12 text-accent" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No templates
        </h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Create your first template
        </p>
        <Dialog open={newTemplateDialogOpen} onOpenChange={setNewTemplateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
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
      </div>
    </div>
  );
}
const EmptyCanvasStateUploadPhoto: React.FC<EmptyCanvasStateProps> = ({onImageUpload}) => {

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Please upload an image file');
      return;
    }
    
    try {
      const imageData = await fileToBase64(file);
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        onImageUpload(imageData, img.width, img.height, file.name);
      };
      img.src = imageData;
    } catch (error) {
      console.error('Error loading image:', error);
    }
  }, [onImageUpload]);
    
  
  return (
    <div className="flex-1 flex items-center justify-center canvas-workspace">
      <div className="text-center animate-fade-in">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shadow-soft">
          <ImageIcon className="w-12 h-12 text-accent" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No image uploaded
        </h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Upload a PNG image to start defining dynamic fields for your planner template
        </p>
        <div className="relative inline-block">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Button size="lg" className="pointer-events-none bg-accent hover:bg-accent/90 text-accent-foreground">
            <Upload className="w-5 h-5 mr-2" />
            Upload Template Image
          </Button>
        </div>
      </div>
    </div>
  );
}

export const EmptyCanvasState: React.FC<EmptyCanvasStateProps> = (props) => {
  const hasTemplates = props.hasTemplates;
  if(hasTemplates) {
    return <EmptyCanvasStateUploadPhoto {...props} />
  } else {
    return <EmptyCanvasStateCreateTemplate {...props} />
  }
  
};
