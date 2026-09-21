export const LANDING_ASSETS = {
  heroEditor: '/landing/hero-editor.png',
  stepUpload: '/landing/step-upload.png',
  stepZones: '/landing/step-zones.png',
  stepRange: '/landing/step-range.png',
  stepGenerate: '/landing/step-generate.png',
  demoPoster: '/landing/hero-editor.png',
  demoVideo: '/landing/demo.mp4',
  ogImage: '/landing/og-image.png',
} as const;

export const LANDING_IMAGE_SIZE = {
  width: 1600,
  height: 960,
} as const;

export const DEMO_SLIDES = [
  { key: 'upload', image: LANDING_ASSETS.stepUpload },
  { key: 'zones', image: LANDING_ASSETS.stepZones },
  { key: 'range', image: LANDING_ASSETS.stepRange },
  { key: 'generate', image: LANDING_ASSETS.stepGenerate },
] as const;
