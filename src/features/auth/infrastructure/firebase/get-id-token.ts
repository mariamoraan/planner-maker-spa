import { getAuth } from 'firebase/auth';
import { getFirebaseApp } from './config';

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getAuth(getFirebaseApp());
  // Firebase restores the persisted session asynchronously. Reading currentUser
  // before that settles returns null and makes callers treat a signed-in user as
  // anonymous, which surfaces as images that never resolve on a cold load.
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
