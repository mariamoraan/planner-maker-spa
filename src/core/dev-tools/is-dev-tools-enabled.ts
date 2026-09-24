/** True only in Vite DEV when `VITE_DEV_TOOLS=true`. Never true in production builds. */
export function isDevToolsEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_TOOLS === 'true';
}
