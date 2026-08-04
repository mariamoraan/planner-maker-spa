import type { AuthPort } from './ports/auth.port';
import type { UserRepositoryPort } from './ports/user.port';
import type { WaitlistRepositoryPort } from './ports/waitlist.port';
import type { AnalyticsPort } from './ports/analytics.port';
import type { TemplateRepositoryPort } from './ports/template.port';
import type { ImageAssetPort } from './ports/image-asset.port';
import { FirebaseAuthAdapter } from './firebase/firebase-auth.adapter';
import { FirebaseUserRepository } from './firebase/firebase-user.repository';
import { FirebaseWaitlistRepository } from './firebase/firebase-waitlist.repository';
import { FirebaseAnalyticsAdapter } from './firebase/firebase-analytics.adapter';
import { FirebaseTemplateRepository } from './firebase/firebase-template.repository';
import { IndexedDBImageAdapter } from './local/indexeddb-image.adapter';
import { CachingImageAdapter } from './local/caching-image.adapter';
import { UploadthingImageAdapter } from './uploadthing/uploadthing-image.adapter';
import { isCloudImageStorageEnabled } from './ports/image-asset.port';
import { isFirebaseConfigured } from './firebase/firebase-config';

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
export type { AuthUser } from './ports/auth.port';
export type { UserProfile } from './ports/user.port';
export type { JoinWaitlistInput, WaitlistSource } from './ports/waitlist.port';
export type { AnalyticsEvent } from './ports/analytics.port';
export type { ImageRef } from './ports/image-asset.port';
export {
  buildLocalImageRef,
  buildUploadthingImageRef,
  buildLegacyImageKey,
  pageIdFromImageRefKey,
} from './ports/image-asset.port';
