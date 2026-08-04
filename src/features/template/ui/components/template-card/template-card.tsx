import { CloudUpload, EllipsisIcon, TrashIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import ActionMenuButton from '@/core/components/action-menu-button/action-menu-button';
import type { Template, TemplateImage } from '@/features/template';
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
  const cover = getCoverImage(template.images);
  const formattedDate = template.updatedAt.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

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
        {cover?.src ? (
          <img
            className="template-card__thumbnail"
            src={cover.src}
            alt={template.name}
          />
        ) : (
          <div className="template-card__placeholder" aria-hidden="true">
            <CloudUpload className="template-card__placeholder-icon" />
          </div>
        )}
      </button>

      <div className="template-card__footer">
        <div className="template-card__meta">
          <p className="template-card__name">{template.name}</p>
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
                icon: <TrashIcon />,
                name: 'Eliminar proyecto',
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
