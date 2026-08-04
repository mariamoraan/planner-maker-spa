import { getInfra } from '@/core/bootstrap/infra';
import type { JoinWaitlistInput } from '@/features/landing/domain/ports/waitlist.port';

export async function joinWaitlist(input: JoinWaitlistInput) {
  return getInfra().waitlist.join(input);
}
