import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import type {
  JoinWaitlistInput,
  JoinWaitlistResult,
  WaitlistRepositoryPort,
} from '../ports/waitlist.port';
import { getFirebaseDb } from './firebase-config';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class FirebaseWaitlistRepository implements WaitlistRepositoryPort {
  async join(input: JoinWaitlistInput): Promise<JoinWaitlistResult> {
    const email = normalizeEmail(input.email);
    const db = getFirebaseDb();
    const ref = doc(db, 'waitlist', email);

    try {
      // Uses email as doc id so we can dedupe via security rules (!exists)
      // without needing read permission on the collection.
      await setDoc(ref, {
        email,
        locale: input.locale ?? 'en',
        source: input.source ?? 'landing_hero',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      return 'joined';
    } catch (error) {
      // When the doc already exists, setDoc tries an update which rules deny.
      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        return 'already_registered';
      }
      throw error;
    }
  }
}
