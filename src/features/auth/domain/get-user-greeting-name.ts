import type { AuthUser } from './ports/auth.port';
import type { UserProfile } from './ports/user.port';

export function getUserGreetingName(
  user: AuthUser | null,
  profile: UserProfile | null
): string {
  const displayName = profile?.displayName ?? user?.displayName;
  if (displayName?.trim()) {
    return displayName.trim().split(/\s+/)[0] ?? displayName.trim();
  }

  const email = profile?.email ?? user?.email;
  if (email) {
    return email.split('@')[0] ?? email;
  }

  return '';
}
