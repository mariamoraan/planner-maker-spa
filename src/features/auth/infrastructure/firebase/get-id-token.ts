import { getAuth } from 'firebase/auth';
import { getFirebaseApp } from './config';

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  const user = getAuth(getFirebaseApp()).currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
