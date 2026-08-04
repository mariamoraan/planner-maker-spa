export type { AuthUser, AuthPort } from './domain/ports/auth.port';
export type { UserProfile, UserRepositoryPort } from './domain/ports/user.port';
export { useAuth, AuthProvider } from './ui/contexts/auth-provider';
export { ProtectedRoute, AuthRequiredRoute } from './ui/components/protected-route';
