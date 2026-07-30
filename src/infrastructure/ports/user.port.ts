import type { AuthUser } from './auth.port';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAccessGranted: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface UserRepositoryPort {
  getProfile(uid: string): Promise<UserProfile | null>;
  upsertOnLogin(user: AuthUser): Promise<UserProfile>;
  hasAccess(uid: string): Promise<boolean>;
}
