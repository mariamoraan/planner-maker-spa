import { useEffect, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import type { TemplateImage } from '@/features/template';
import './template-cover-thumb.scss';

const IMG_LOAD_TIMEOUT_MS = 20_000;
const RESOLVE_GIVE_UP_MS = 12_000;

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
  const [resolveTimedOut, setResolveTimedOut] = useState(false);
  const [activeSrc, setActiveSrc] = useState(image?.src ?? '');
  const [triedAlt, setTriedAlt] = useState(false);

  const pendingResolve = isTemplateImagePending(image) && !resolveTimedOut;
  const showSkeleton = pendingResolve || (Boolean(activeSrc) && !imgReady && !imgFailed);
  const showImage = Boolean(activeSrc) && !imgFailed;
  const showEmpty = !showSkeleton && !showImage;

  useEffect(() => {
    setActiveSrc(image?.src ?? '');
    setTriedAlt(false);
    setImgReady(false);
    setImgFailed(false);
  }, [image?.src, image?.srcAlt, image?.id]);

  useEffect(() => {
    setResolveTimedOut(false);
  }, [image?.id]);

  useEffect(() => {
    if (!isTemplateImagePending(image)) {
      setResolveTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setResolveTimedOut(true), RESOLVE_GIVE_UP_MS);
    return () => window.clearTimeout(timer);
  }, [image, image?.id, image?.src, image?.missingLocalAsset]);

  useEffect(() => {
    if (!activeSrc || imgReady || imgFailed) return;
    const timer = window.setTimeout(() => {
      const altSrc = image?.srcAlt;
      if (!triedAlt && altSrc && altSrc !== activeSrc) {
        setTriedAlt(true);
        setImgReady(false);
        setActiveSrc(altSrc);
        return;
      }
      setImgFailed(true);
    }, IMG_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [activeSrc, imgReady, imgFailed, image?.srcAlt, triedAlt]);

  const handleError = () => {
    const altSrc = image?.srcAlt;
    if (!triedAlt && altSrc && altSrc !== activeSrc) {
      setTriedAlt(true);
      setImgReady(false);
      setActiveSrc(altSrc);
      return;
    }
    setImgFailed(true);
  };

  return (
    <span
      className={[
        'template-cover-thumb',
        `template-cover-thumb--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-busy={showSkeleton || undefined}
    >
      {showImage ? (
        <img
          className={[
            'template-cover-thumb__img',
            imgReady ? 'template-cover-thumb__img--ready' : null,
          ]
            .filter(Boolean)
            .join(' ')}
          src={activeSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onLoad={() => setImgReady(true)}
          onError={handleError}
        />
      ) : null}

      {showSkeleton ? (
        <span className="template-cover-thumb__skeleton" aria-hidden="true" />
      ) : null}

      {showEmpty ? (
        <span className="template-cover-thumb__empty" aria-hidden="true">
          <CloudUpload className="template-cover-thumb__empty-icon" />
        </span>
      ) : null}
    </span>
  );
};
