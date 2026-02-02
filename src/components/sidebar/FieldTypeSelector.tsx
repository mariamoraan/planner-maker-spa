import React from 'react';
import { Check, Calendar, Hash, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldType } from '@/types/planner';
import { FIELD_TYPE_CONFIG } from '@/types/planner';

interface FieldTypeSelectorProps {
  selectedType: FieldType;
  onTypeChange: (type: FieldType) => void;
}

const FIELD_ICONS: Record<FieldType, React.ReactNode> = {
  year: <Calendar className="w-4 h-4" />,
  month: <Type className="w-4 h-4" />,
  day: <Hash className="w-4 h-4" />,
};

export const FieldTypeSelector: React.FC<FieldTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-sidebar-foreground/70">
        Field Type
      </label>
      <div className="space-y-1">
        {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).map(type => {
          const config = FIELD_TYPE_CONFIG[type];
          const isSelected = selectedType === type;
          
          return (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                "hover:bg-sidebar-accent",
                isSelected && "bg-sidebar-accent"
              )}
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center"
                style={{ 
                  backgroundColor: config.bgColor,
                  border: `2px solid ${config.color}`,
                }}
              >
                <span style={{ color: config.color }}>
                  {FIELD_ICONS[type]}
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-sidebar-foreground">
                  {config.label}
                </div>
                <div className="text-xs text-sidebar-foreground/60">
                  {config.description}
                </div>
              </div>
              {isSelected && (
                <Check className="w-4 h-4 text-sidebar-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
