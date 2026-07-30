import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getInfra,
  isFirebaseConfigured,
  type AuthUser,
  type UserProfile,
} from '@/infrastructure';
import { trackEvent } from '@/lib/analytics';

interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  hasAccess: boolean;
  signIn: () => Promise<UserProfile | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isConfigured = isFirebaseConfigured();

  const refreshProfile = useCallback(async (authUser: AuthUser) => {
    const infra = getInfra();
    const nextProfile = await infra.users.upsertOnLogin(authUser);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    const infra = getInfra();
    const unsubscribe = infra.auth.onAuthStateChanged(async authUser => {
      setUser(authUser);
      if (authUser) {
        try {
          await refreshProfile(authUser);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, [isConfigured, refreshProfile]);

  const signIn = useCallback(async () => {
    const infra = getInfra();
    const authUser = await infra.auth.signInWithGoogle();
    setUser(authUser);
    const profile = await refreshProfile(authUser);
    trackEvent('login', { method: 'google' });
    return profile;
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await getInfra().auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoading,
      isConfigured,
      hasAccess: profile?.isAccessGranted ?? false,
      signIn,
      signOut,
      refreshProfile: async () => {
        if (!user) return;
        await refreshProfile(user);
      },
    }),
    [user, profile, isLoading, isConfigured, signIn, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
