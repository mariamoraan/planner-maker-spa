import { getInfra } from '@/core/bootstrap/infra';

export function getCurrentUser() {
  return getInfra().auth.getCurrentUser();
}

export async function checkAccess(uid: string) {
  return getInfra().users.hasAccess(uid);
}

export async function getUserProfile(uid: string) {
  return getInfra().users.getProfile(uid);
}
