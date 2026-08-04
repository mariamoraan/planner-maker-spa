import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { AddTemplateButton } from '@/features/template/ui/components/add-template-button/add-template-button';
import './new-project-card.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

interface NewProjectCardProps {
  index: number;
}

export const NewProjectCard = ({ index }: NewProjectCardProps) => {
  return (
    <motion.li
      className="new-project-card"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
    >
      <AddTemplateButton
        customButton={
          <button
            type="button"
            className="new-project-card__trigger"
            aria-label="Nuevo proyecto"
          >
            <div className="new-project-card__preview">
              <Plus className="new-project-card__icon" />
            </div>
            <div className="new-project-card__footer">
              <p className="new-project-card__label">Nuevo proyecto</p>
              <p className="new-project-card__hint">Crea un planner</p>
            </div>
          </button>
        }
      />
    </motion.li>
  );
};
