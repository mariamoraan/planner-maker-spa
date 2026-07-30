import './block-type-selector.scss';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FIELD_ICONS, getFieldIcon } from '@/components/sidebar/FieldTypeSelector';
import { blockSelectionZoneProps } from '@/lib/block-selection';
import { FIELD_TYPE_CONFIG, FieldType } from '@/types/planner';

const GRID_ICON_SIZES = {
  default: 50,
  compact: 28,
} as const;

interface MenuPosition {
  top: number;
  left: number;
  width: number;
}

interface BlockTypeSelectorProps {
  currentType: FieldType;
  onSelect: (type: FieldType) => void;
  variant: 'popover' | 'grid' | 'sidebar';
  size?: 'default' | 'compact';
}

export const BlockTypeSelector = ({
  currentType,
  onSelect,
  variant,
  size = 'default',
}: BlockTypeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const floatingMenuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    setIsOpen(false);
    setMenuPosition(null);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (containerRef.current?.contains(target)) return;
      if (floatingMenuRef.current?.contains(target)) return;
      closeMenu();
    };

    const handleScrollOrResize = () => closeMenu();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
    setMenuPosition(null);
  }, [currentType]);

  const handleSelect = (type: FieldType) => {
    onSelect(type);
    closeMenu();
  };

  const typeOptions = Object.keys(FIELD_TYPE_CONFIG) as FieldType[];

  if (variant === 'sidebar') {
    const currentConfig = FIELD_TYPE_CONFIG[currentType];

    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation();

      if (isOpen) {
        closeMenu();
        return;
      }

      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      setMenuPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
      setIsOpen(true);
    };

    return (
      <div ref={containerRef} className="block-type-selector block-type-selector--sidebar">
        <p className="block-type-selector__label">Tipo</p>
        <button
          ref={triggerRef}
          type="button"
          className={clsx('block-type-selector__trigger', {
            'block-type-selector__trigger--open': isOpen,
          })}
          onClick={handleToggle}
        >
          <span className="block-type-selector__trigger__content">
            <span
              className="block-type-selector__trigger__dot"
              style={{ backgroundColor: currentConfig.color }}
            />
            <span className="block-type-selector__trigger__label">{currentConfig.label}</span>
          </span>
          <span
            className={clsx('block-type-selector__chevron', {
              'block-type-selector__chevron--open': isOpen,
            })}
          />
        </button>
        {isOpen && menuPosition &&
          createPortal(
            <div
              ref={floatingMenuRef}
              className="block-type-selector__floating-menu"
              {...blockSelectionZoneProps}
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
              }}
            >
              <div className="block-type-selector__floating-menu__options">
                {typeOptions.map(type => (
                  <button
                    key={type}
                    type="button"
                    className={clsx('block-type-selector__floating-menu__option', {
                      'block-type-selector__floating-menu__option--active': currentType === type,
                    })}
                    onClick={() => handleSelect(type)}
                    title={FIELD_TYPE_CONFIG[type].label}
                  >
                    {getFieldIcon(type, 40)}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )}
      </div>
    );
  }

  if (variant === 'grid') {
    const iconSize = GRID_ICON_SIZES[size];

    return (
      <div
        className={clsx('block-type-selector block-type-selector--grid', {
          'block-type-selector--compact': size === 'compact',
        })}
      >
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
              {getFieldIcon(type, iconSize)}
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
