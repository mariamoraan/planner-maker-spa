import './layer-controls.scss';

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LayerOperation } from '@/features/editor/domain/services/layer-order';
import { canLayerOperation } from '@/features/editor/domain/services/layer-order';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';

interface LayerControlsProps {
  selectedIds: string[];
}

const OPERATIONS: { operation: LayerOperation; icon: typeof ArrowUp; labelKey: string }[] = [
  { operation: 'forward', icon: ArrowUp, labelKey: 'editor.layerForward' },
  { operation: 'backward', icon: ArrowDown, labelKey: 'editor.layerBackward' },
  { operation: 'front', icon: ArrowUpToLine, labelKey: 'editor.layerToFront' },
  { operation: 'back', icon: ArrowDownToLine, labelKey: 'editor.layerToBack' },
];

export const LayerControls = ({ selectedIds }: LayerControlsProps) => {
  const { t } = useTranslation();
  const currentImage = useCurrentImage();
  const { reorderLayers } = useManageAreas();

  if (selectedIds.length === 0) return null;

  const rectangles = currentImage?.rectangles ?? [];
  const gridGroups = currentImage?.gridGroups;

  return (
    <div className="layer-controls">
      {OPERATIONS.map(({ operation, icon: Icon, labelKey }) => {
        const disabled = !canLayerOperation(rectangles, gridGroups, selectedIds, operation);
        return (
          <button
            key={operation}
            type="button"
            className="layer-controls__button"
            disabled={disabled}
            aria-label={t(labelKey)}
            title={t(labelKey)}
            onClick={() => reorderLayers(operation, selectedIds)}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
};
