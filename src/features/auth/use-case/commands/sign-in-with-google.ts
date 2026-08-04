import { getInfra } from '@/core/bootstrap/infra';

export async function signInWithGoogle() {
  return getInfra().auth.signInWithGoogle();
}

export async function signOut() {
  return getInfra().auth.signOut();
}
