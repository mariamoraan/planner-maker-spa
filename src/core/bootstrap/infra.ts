import type { AuthPort } from '@/features/auth/domain/ports/auth.port';
import type { UserRepositoryPort } from '@/features/auth/domain/ports/user.port';
import type { WaitlistRepositoryPort } from '@/features/landing/domain/ports/waitlist.port';
import type { AnalyticsPort } from '@/features/template/domain/ports/analytics.port';
import type { TemplateRepositoryPort } from '@/features/template/domain/ports/template.port';
import type { ImageAssetPort } from '@/features/template/domain/ports/image-asset.port';
import { FirebaseAuthAdapter } from '@/features/auth/infrastructure/firebase/auth.adapter';
import { FirebaseUserRepository } from '@/features/auth/infrastructure/firebase/user.repository';
import { FirebaseWaitlistRepository } from '@/features/landing/infrastructure/firebase/waitlist.repository';
import { FirebaseAnalyticsAdapter } from '@/features/template/infrastructure/firebase/analytics.adapter';
import { FirebaseTemplateRepository } from '@/features/template/infrastructure/firebase/template.repository';
import { IndexedDBImageAdapter } from '@/features/template/infrastructure/local/indexeddb-image.adapter';
import { CachingImageAdapter } from '@/features/template/infrastructure/local/caching-image.adapter';
import { UploadthingImageAdapter } from '@/features/template/infrastructure/uploadthing/image.adapter';
import { isCloudImageStorageEnabled } from '@/features/template/domain/value-objects/image-ref';
import { isFirebaseConfigured } from '@/features/auth/infrastructure/firebase/config';

export type InfraServices = {
  auth: AuthPort;
  users: UserRepositoryPort;
  waitlist: WaitlistRepositoryPort;
  analytics: AnalyticsPort;
  templates: TemplateRepositoryPort;
  images: ImageAssetPort;
};

let services: InfraServices | null = null;

function createImageAdapter(): ImageAssetPort {
  const cache = new IndexedDBImageAdapter();
  if (isCloudImageStorageEnabled()) {
    return new CachingImageAdapter(new UploadthingImageAdapter(), cache);
  }
  return cache;
}

export function getInfra(): InfraServices {
  if (!services) {
    if (!isFirebaseConfigured()) {
      throw new Error(
        'Firebase is not configured. Copy .env.example to .env.local and fill in your Firebase credentials.'
      );
    }
    services = {
      auth: new FirebaseAuthAdapter(),
      users: new FirebaseUserRepository(),
      waitlist: new FirebaseWaitlistRepository(),
      analytics: new FirebaseAnalyticsAdapter(),
      templates: new FirebaseTemplateRepository(),
      images: createImageAdapter(),
    };
  }
  return services;
}

export { isFirebaseConfigured, isCloudImageStorageEnabled };
export type { AuthUser } from '@/features/auth/domain/ports/auth.port';
export type { UserProfile } from '@/features/auth/domain/ports/user.port';
export type { JoinWaitlistInput, WaitlistSource } from '@/features/landing/domain/ports/waitlist.port';
export type { AnalyticsEvent } from '@/features/template/domain/ports/analytics.port';
export type { ImageRef } from '@/features/template/domain/value-objects/image-ref';
export {
  buildLocalImageRef,
  buildUploadthingImageRef,
  buildLegacyImageKey,
  pageIdFromImageRefKey,
} from '@/features/template/domain/value-objects/image-ref';
