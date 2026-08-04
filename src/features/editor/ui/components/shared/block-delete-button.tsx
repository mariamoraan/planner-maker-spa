import './block-delete-button.scss';

import clsx from 'clsx';
import { TrashIcon } from '@/core/icons';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';

interface BlockDeleteButtonProps {
  rectangleId: string;
  className?: string;
}

export const BlockDeleteButton = ({ rectangleId, className }: BlockDeleteButtonProps) => {
  const { deleteArea } = useManageAreas();

  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        deleteArea(rectangleId);
      }}
      className={clsx('block-delete-button', className)}
    >
      <TrashIcon className="block-delete-button__icon" />
    </button>
  );
};
