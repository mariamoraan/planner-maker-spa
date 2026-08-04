import { LANDING_IMAGE_SIZE } from '@/features/landing/domain/landing-assets';
import './landing-screenshot.scss';

interface LandingScreenshotProps {
  src: string;
  srcSet?: string;
  alt: string;
  url?: string;
  className?: string;
  framed?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function LandingScreenshot({
  src,
  srcSet,
  alt,
  url = 'dyna.app/editor',
  className,
  framed = true,
  width = LANDING_IMAGE_SIZE.width,
  height = LANDING_IMAGE_SIZE.height,
  priority = false,
}: LandingScreenshotProps) {
  const image = (
    <img
      className="landing-screenshot__image"
      src={src}
      srcSet={srcSet}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );

  if (!framed) {
    return (
      <figure
        className={`landing-screenshot landing-screenshot--bare${className ? ` ${className}` : ''}`}
      >
        {image}
        <figcaption className="landing-screenshot__caption">{alt}</figcaption>
      </figure>
    );
  }

  return (
    <figure className={`landing-screenshot${className ? ` ${className}` : ''}`}>
      <div className="landing-screenshot__frame">
        <div className="landing-screenshot__chrome">
          <span className="landing-screenshot__dot landing-screenshot__dot--red" />
          <span className="landing-screenshot__dot landing-screenshot__dot--yellow" />
          <span className="landing-screenshot__dot landing-screenshot__dot--green" />
          <span className="landing-screenshot__url">{url}</span>
        </div>
        {image}
      </div>
      <figcaption className="landing-screenshot__caption">{alt}</figcaption>
    </figure>
  );
}
