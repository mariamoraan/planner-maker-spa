import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import type {
  DemoRequestRepositoryPort,
  RequestDemoInput,
  RequestDemoResult,
} from '@/features/landing/domain/ports/demo-request.port';
import { getFirebaseDb } from '@/features/auth/infrastructure/firebase/config';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class FirebaseDemoRequestRepository implements DemoRequestRepositoryPort {
  async request(input: RequestDemoInput): Promise<RequestDemoResult> {
    const email = normalizeEmail(input.email);
    const db = getFirebaseDb();
    const ref = doc(db, 'demo_requests', email);

    try {
      await setDoc(ref, {
        email,
        name: input.name.trim(),
        locale: input.locale ?? 'en',
        source: input.source ?? 'landing_hero',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      return 'requested';
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        return 'already_registered';
      }
      throw error;
    }
  }
}
