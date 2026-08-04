import {
  GoogleAuthProvider,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import type { AuthPort, AuthUser } from '@/features/auth/domain/ports/auth.port';
import { getFirebaseAuth } from './config';

function mapUser(user: import('firebase/auth').User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export class FirebaseAuthAdapter implements AuthPort {
  async signInWithGoogle(): Promise<AuthUser> {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return mapUser(result.user);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(getFirebaseAuth());
  }

  getCurrentUser(): AuthUser | null {
    const user = getFirebaseAuth().currentUser;
    return user ? mapUser(user) : null;
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return firebaseOnAuthStateChanged(getFirebaseAuth(), firebaseUser => {
      callback(firebaseUser ? mapUser(firebaseUser) : null);
    });
  }
}
