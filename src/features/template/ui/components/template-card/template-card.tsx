import { useEffect, useRef, useState } from 'react';
import { EllipsisIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ActionMenuButton from '@/core/components/action-menu-button/action-menu-button';
import type { Template, TemplateImage } from '@/features/template';
import { getTemplatePaperSizeLabel } from '@/features/template';
import { TemplateCoverThumb } from '@/features/template/ui/components/template-cover-thumb/template-cover-thumb';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import './template-card.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const getCoverImage = (images: TemplateImage[]): TemplateImage | null => {
  const cover = images.find(image => image.type === 'cover');
  if (cover) return cover;
  return images[0] ?? null;
};

interface TemplateCardProps {
  template: Template;
  index: number;
  onOpen: () => void;
  onDelete: () => void;
}

export const TemplateCard = ({ template, index, onOpen, onDelete }: TemplateCardProps) => {
  const { t } = useTranslation();
  const updateTemplate = useTemplateStore(state => state.updateTemplate);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(template.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const cover = getCoverImage(template.images);
  const paperSizeLabel = getTemplatePaperSizeLabel(template);
  const formattedDate = template.updatedAt.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  useEffect(() => {
    if (!isRenaming) {
      setDraftName(template.name);
    }
  }, [template.name, isRenaming]);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const startRename = () => {
    setDraftName(template.name);
    setIsRenaming(true);
  };

  const cancelRename = () => {
    setDraftName(template.name);
    setIsRenaming(false);
  };

  const commitRename = () => {
    const nextName = draftName.trim();
    if (nextName && nextName !== template.name) {
      updateTemplate(template.id, { name: nextName });
    } else {
      setDraftName(template.name);
    }
    setIsRenaming(false);
  };

  return (
    <motion.li
      className="template-card"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
    >
      <button
        type="button"
        className="template-card__trigger"
        onClick={onOpen}
        aria-label={`Abrir ${template.name}`}
      >
        <TemplateCoverThumb image={cover} alt={template.name} size="card" />
      </button>

      <div className="template-card__footer">
        <div className="template-card__meta">
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              className="template-card__name-input"
              value={draftName}
              aria-label={t('home.renameProject')}
              onChange={event => setDraftName(event.target.value)}
              onBlur={commitRename}
              onClick={event => event.stopPropagation()}
              onKeyDown={event => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitRename();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelRename();
                }
              }}
            />
          ) : (
            <p className="template-card__name">
              <span className="template-card__name-text">{template.name}</span>
              {paperSizeLabel ? (
                <span className="template-card__format">{paperSizeLabel}</span>
              ) : null}
            </p>
          )}
          <p className="template-card__date">Editado el {formattedDate}</p>
        </div>
        <div
          className="template-card__menu"
          onClick={event => event.stopPropagation()}
          onKeyDown={event => event.stopPropagation()}
        >
          <ActionMenuButton
            icon={<EllipsisIcon />}
            ariaLabel={`Acciones de ${template.name}`}
            actions={[
              {
                icon: <PencilIcon />,
                name: t('home.renameProject'),
                onClick: startRename,
              },
              {
                icon: <TrashIcon />,
                name: t('home.deleteProject'),
                onClick: onDelete,
                variant: 'error',
              },
            ]}
          />
        </div>
      </div>
    </motion.li>
  );
};
