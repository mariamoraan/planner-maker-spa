import './block-type-selector.scss';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import useOnClickOutside from '@/core/hooks/use-on-click-outside';
import { FIELD_ICONS } from '@/components/sidebar/FieldTypeSelector';
import { FIELD_TYPE_CONFIG, FieldType } from '@/types/planner';

interface BlockTypeSelectorProps {
  currentType: FieldType;
  onSelect: (type: FieldType) => void;
  variant: 'popover' | 'grid';
}

export const BlockTypeSelector = ({ currentType, onSelect, variant }: BlockTypeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);

  useOnClickOutside(menuRef, () => {
    setIsOpen(false);
  });

  useEffect(() => {
    setIsOpen(false);
  }, [currentType]);

  const handleSelect = (type: FieldType) => {
    onSelect(type);
    setIsOpen(false);
  };

  const typeOptions = Object.keys(FIELD_TYPE_CONFIG) as FieldType[];

  if (variant === 'grid') {
    return (
      <div className="block-type-selector block-type-selector--grid">
        {typeOptions.map(type => (
          <button
            key={type}
            type="button"
            className={clsx('block-type-selector__grid-button', {
              'block-type-selector__grid-button--active': currentType === type,
            })}
            onClick={() => handleSelect(type)}
            title={FIELD_TYPE_CONFIG[type].label}
          >
            <div className="block-type-selector__grid-button__icon-wrapper">
              {FIELD_ICONS[type]}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      ref={menuRef}
      type="button"
      onClick={e => {
        e.stopPropagation();
        setIsOpen(!isOpen);
      }}
      className="block-type-selector block-type-selector--popover"
    >
      Editar Tipo
      <div
        className={clsx('block-type-selector__menu', {
          'block-type-selector__menu--visible': isOpen,
        })}
      >
        <div className="block-type-selector__menu__options">
          {typeOptions.map(type => (
            <button
              key={type}
              type="button"
              className={clsx('block-type-selector__menu__option', {
                'block-type-selector__menu__option--active': currentType === type,
              })}
              onClick={() => handleSelect(type)}
            >
              {FIELD_ICONS[type]}
            </button>
          ))}
        </div>
      </div>
    </button>
  );
};
