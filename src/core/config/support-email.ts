/** Public support contact for Privacy / Terms / access-pending. Empty → hide mailto. */
export function getSupportEmail(): string | null {
  const raw = import.meta.env.VITE_SUPPORT_EMAIL;
  if (typeof raw !== 'string') return null;
  const email = raw.trim();
  return email.length > 0 ? email : null;
}

export function getSupportMailto(): string | null {
  const email = getSupportEmail();
  return email ? `mailto:${email}` : null;
}
