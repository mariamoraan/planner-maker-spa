import { Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PATHS } from '@/core/routes/paths';
import { Button } from '@/components/ui/button';
import './unsupported-viewport.scss';

export const UnsupportedViewport = () => {
  return (
    <div className="unsupported-viewport">
      <div className="unsupported-viewport__content">
        <div className="unsupported-viewport__icon-wrapper">
          <Monitor className="unsupported-viewport__icon" aria-hidden />
        </div>
        <h1 className="unsupported-viewport__title">
          El editor no está disponible en esta pantalla
        </h1>
        <p className="unsupported-viewport__message">
          Amplía la ventana del navegador o usa un ordenador para editar plantillas.
        </p>
        <Button asChild variant="accent">
          <Link to={PATHS.home}>Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
};
