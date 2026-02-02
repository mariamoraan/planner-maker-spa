import React from 'react';
import { Trash2, Move, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Rectangle, FieldType } from '@/types/planner';
import { FIELD_TYPE_CONFIG } from '@/types/planner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RectangleListProps {
  rectangles: Rectangle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateType: (id: string, type: FieldType) => void;
}

export const RectangleList: React.FC<RectangleListProps> = ({
  rectangles,
  selectedId,
  onSelect,
  onDelete,
  onUpdateType,
}) => {
  if (rectangles.length === 0) {
    return (
      <div className="text-center py-6 text-sidebar-foreground/50">
        <Move className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Draw rectangles on the canvas to define fields</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-sidebar-foreground/70">
        Defined Fields ({rectangles.length})
      </label>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {rectangles.map((rect, index) => {
          const config = FIELD_TYPE_CONFIG[rect.fieldType];
          const isSelected = selectedId === rect.id;
          
          return (
            <div
              key={rect.id}
              onClick={() => onSelect(rect.id)}
              className={`
                p-3 rounded-lg cursor-pointer transition-all
                ${isSelected ? 'bg-sidebar-accent ring-1 ring-sidebar-primary' : 'bg-sidebar-accent/50 hover:bg-sidebar-accent'}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-sm font-medium text-sidebar-foreground">
                    Field {index + 1}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(rect.id);
                  }}
                  className="h-7 w-7 p-0 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              
              <Select
                value={rect.fieldType}
                onValueChange={(value) => onUpdateType(rect.id, value as FieldType)}
              >
                <SelectTrigger 
                  className="h-8 text-xs bg-sidebar-background border-sidebar-border"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).map(type => (
                    <SelectItem key={type} value={type}>
                      {FIELD_TYPE_CONFIG[type].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2 mt-2 text-xs text-sidebar-foreground/50">
                <Maximize2 className="w-3 h-3" />
                <span>{Math.round(rect.width)} × {Math.round(rect.height)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
