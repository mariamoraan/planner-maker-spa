import React from 'react';
import { Plus, FileImage, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TemplateImage } from '@/types/planner';
import { TEMPLATE_TYPE_CONFIG } from '@/types/planner';

interface TemplateImageListProps {
  images: TemplateImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TemplateImageList: React.FC<TemplateImageListProps> = ({
  images,
  selectedId,
  onSelect,
  onDelete,
}) => {
  if (images.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-sidebar-foreground/70">
        Template Pages ({images.length})
      </label>
      <div className="space-y-1">
        {images.map((image) => {
          const isSelected = selectedId === image.id;
          const typeConfig = TEMPLATE_TYPE_CONFIG[image.type];
          
          return (
            <div
              key={image.id}
              onClick={() => onSelect(image.id)}
              className={cn(
                "group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                "hover:bg-sidebar-accent",
                isSelected && "bg-sidebar-accent"
              )}
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-md overflow-hidden bg-sidebar-accent flex-shrink-0">
                <img
                  src={image.imageData}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-sidebar-foreground truncate">
                  {image.name}
                </div>
                <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
                  <span>{typeConfig.label}</span>
                  <span>•</span>
                  <span>{image.rectangles.length} fields</span>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(image.id);
                }}
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              
              {isSelected && (
                <ChevronRight className="w-4 h-4 text-sidebar-primary flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
