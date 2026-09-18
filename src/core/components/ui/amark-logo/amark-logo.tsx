import './amark-logo.scss';

import type { ImgHTMLAttributes } from 'react';
import { cn } from '@/core/functions/cn';

export interface AmarkLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {}

export const AmarkLogo = ({ className, alt = '', ...props }: AmarkLogoProps) => (
  <img
    src="/icon.jpeg"
    alt={alt}
    className={cn('amark-logo', className)}
    aria-hidden={alt ? undefined : true}
    {...props}
  />
);
