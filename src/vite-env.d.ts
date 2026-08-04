/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_INFRA_PROVIDER: string;
  readonly VITE_IMAGE_STORAGE: string;
  readonly VITE_UPLOADTHING_URL?: string;
  readonly VITE_IMAGE_DELETE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
