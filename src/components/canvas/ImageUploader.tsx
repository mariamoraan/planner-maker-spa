import React, { useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fileToBase64 } from '@/lib/planner-utils';

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
}

export const EmptyCanvasState: React.FC<EmptyCanvasStateProps> = ({ onImageUpload }) => {
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      console.error('Please upload an image file');
      return;
    }
    
    try {
      const imageData = await fileToBase64(file);
      
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
          No template selected
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
};
