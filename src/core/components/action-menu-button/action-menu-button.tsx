import { useState, useRef, useEffect, useCallback, useId } from 'react';
import './action-menu-button.scss';

/**
 * Icono por defecto (kebab / 3 puntos verticales), usado si no se pasa `icon`.
 */
const DefaultIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </svg>
);

/**
 * @typedef {Object} MenuAction
 * @property {string} name - Texto de la acción. Obligatorio.
 * @property {() => void} onClick - Callback al hacer click. Obligatorio.
 * @property {React.ReactNode} [icon] - Icono opcional a la izquierda del texto.
 * @property {'default'|'primary'|'error'} [variant] - Color del texto. Por defecto 'default' (negro).
 * @property {boolean} [disabled] - Deshabilita la acción (opcional).
 */

/**
 * Botón con menú de acciones desplegable, estilo Material UI.
 * Sin dependencias externas: solo React + SCSS.
 *
 * @param {Object} props
 * @param {MenuAction[]} props.actions - Lista de acciones del menú.
 * @param {React.ReactNode} [props.icon] - Icono del botón que abre el menú.
 * @param {string} [props.ariaLabel] - Etiqueta accesible del botón.
 * @param {'left'|'right'} [props.placement] - Alineación del menú respecto al botón.
 * @param {boolean} [props.disabled] - Deshabilita el botón completo.
 */
export default function ActionMenuButton({
  actions = [],
  icon,
  ariaLabel = 'Abrir menú de acciones',
  placement = 'right',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = useId();

  // Validación en desarrollo de los campos obligatorios de cada acción.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      actions.forEach((action, i) => {
        if (!action?.name) {
          // eslint-disable-next-line no-console
          console.error(`ActionMenuButton: la acción en el índice ${i} necesita la propiedad "name".`);
        }
        if (typeof action?.onClick !== 'function') {
          // eslint-disable-next-line no-console
          console.error(`ActionMenuButton: la acción en el índice ${i} necesita la propiedad "onClick".`);
        }
      });
    }
  }, [actions]);

  const closeMenu = useCallback((focusButton = false) => {
    setOpen(false);
    if (focusButton && buttonRef.current) buttonRef.current.focus();
  }, []);

  // Cierre al hacer click fuera y con la tecla Escape.
  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeMenu();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeMenu(true);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeMenu]);

  // Foco automático en el primer item al abrir (accesibilidad tipo MUI).
  useEffect(() => {
    if (open) {
      const firstEnabled = itemRefs.current.find((el) => el && !el.disabled);
      firstEnabled?.focus();
    }
  }, [open]);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const enabledIndexes = actions
    .map((a, i) => i)
    .filter((i) => !actions[i]?.disabled);

  const handleItemKeyDown = (e, index) => {
    const currentPos = enabledIndexes.indexOf(index);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = enabledIndexes[(currentPos + 1) % enabledIndexes.length];
      itemRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = enabledIndexes[(currentPos - 1 + enabledIndexes.length) % enabledIndexes.length];
      itemRefs.current[prev]?.focus();
    } else if (e.key === 'Tab') {
      closeMenu();
    }
  };

  const handleActionClick = (action) => {
    if (action.disabled) return;
    closeMenu(true);
    action.onClick?.();
  };

  return (
    <div className="amb" ref={containerRef}>
      <button
        type="button"
        ref={buttonRef}
        className={`amb__button${open ? ' amb__button--active' : ''}`}
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        {icon || <DefaultIcon />}
      </button>

      <div
        id={menuId}
        role="menu"
        className={`amb__menu amb__menu--${placement}${open ? ' amb__menu--open' : ''}`}
        aria-hidden={!open}
      >
        {actions.map((action, index) => {
          const variant = action.variant || 'default';
          return (
            <button
              key={`${action.name}-${index}`}
              type="button"
              role="menuitem"
              ref={(el) => { itemRefs.current[index] = el; }}
              className={`amb__item amb__item--${variant}`}
              tabIndex={open ? 0 : -1}
              disabled={!!action.disabled}
              onClick={(e) => {
                e.stopPropagation();
                handleActionClick(action)
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                handleItemKeyDown(e, index)
              }}
            >
              {action.icon && <span className="amb__item-icon">{action.icon}</span>}
              <span className="amb__item-label">{action.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}