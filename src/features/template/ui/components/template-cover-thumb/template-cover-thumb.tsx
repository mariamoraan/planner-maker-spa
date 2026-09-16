import { useEffect, useState } from 'react';
import { CloudUpload, Loader2 } from 'lucide-react';
import type { TemplateImage } from '@/features/template';
import './template-cover-thumb.scss';

export function isTemplateImagePending(image: TemplateImage | null | undefined): boolean {
  if (!image) return false;
  if (image.src) return false;
  if (image.missingLocalAsset) return false;
  return true;
}

type Size = 'card' | 'rail';

interface TemplateCoverThumbProps {
  image: TemplateImage | null;
  alt?: string;
  size?: Size;
  className?: string;
}

export const TemplateCoverThumb = ({
  image,
  alt = '',
  size = 'card',
  className,
}: TemplateCoverThumbProps) => {
  const [imgReady, setImgReady] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const src = image?.src ?? '';
  const pendingResolve = isTemplateImagePending(image);
  const showSpinner = pendingResolve || (Boolean(src) && !imgReady && !imgFailed);
  const showImage = Boolean(src) && !imgFailed;
  const showEmpty = !showSpinner && !showImage;

  useEffect(() => {
    setImgReady(false);
    setImgFailed(false);
  }, [src]);

  return (
    <span
      className={[
        'template-cover-thumb',
        `template-cover-thumb--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-busy={showSpinner || undefined}
    >
      {showImage ? (
        <img
          className={[
            'template-cover-thumb__img',
            imgReady ? 'template-cover-thumb__img--ready' : null,
          ]
            .filter(Boolean)
            .join(' ')}
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onLoad={() => setImgReady(true)}
          onError={() => setImgFailed(true)}
        />
      ) : null}

      {showSpinner ? (
        <span className="template-cover-thumb__loading" aria-hidden="true">
          <Loader2 className="template-cover-thumb__spinner" />
        </span>
      ) : null}

      {showEmpty ? (
        <span className="template-cover-thumb__empty" aria-hidden="true">
          <CloudUpload className="template-cover-thumb__empty-icon" />
        </span>
      ) : null}
    </span>
  );
};
