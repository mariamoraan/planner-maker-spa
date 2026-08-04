import { generateReactHelpers } from '@uploadthing/react';
import type { OurFileRouter } from '../../../server/uploadthing/core';

function resolveUploadthingUrl(): string {
  const configured = import.meta.env.VITE_UPLOADTHING_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/uploadthing`;
  }
  return '/api/uploadthing';
}

export const { uploadFiles } = generateReactHelpers<OurFileRouter>({
  url: resolveUploadthingUrl(),
});

export function resolveImageDeleteUrl(): string {
  const configured = import.meta.env.VITE_IMAGE_DELETE_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/images/delete`;
  }
  return '/api/images/delete';
}
