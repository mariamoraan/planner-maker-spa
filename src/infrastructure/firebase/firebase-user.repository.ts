import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { AuthUser } from '../ports/auth.port';
import type { UserProfile, UserRepositoryPort } from '../ports/user.port';
import { getFirebaseDb } from './firebase-config';

function mapProfile(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid,
    email: (data.email as string | null) ?? null,
    displayName: (data.displayName as string | null) ?? null,
    photoURL: (data.photoURL as string | null) ?? null,
    isAccessGranted: Boolean(data.isAccessGranted),
    createdAt: data.createdAt
      ? (data.createdAt as { toDate: () => Date }).toDate()
      : new Date(),
    lastLoginAt: data.lastLoginAt
      ? (data.lastLoginAt as { toDate: () => Date }).toDate()
      : new Date(),
  };
}

export class FirebaseUserRepository implements UserRepositoryPort {
  async getProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(getFirebaseDb(), 'users', uid));
    if (!snap.exists()) return null;
    return mapProfile(uid, snap.data());
  }

  async upsertOnLogin(user: AuthUser): Promise<UserProfile> {
    const ref = doc(getFirebaseDb(), 'users', user.uid);
    const existing = await getDoc(ref);

    if (!existing.exists()) {
      const newProfile = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAccessGranted: false,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };
      await setDoc(ref, newProfile);
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAccessGranted: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };
    }

    await updateDoc(ref, {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: serverTimestamp(),
    });

    const updated = await getDoc(ref);
    return mapProfile(user.uid, updated.data()!);
  }

  async hasAccess(uid: string): Promise<boolean> {
    const profile = await this.getProfile(uid);
    return profile?.isAccessGranted ?? false;
  }
}
