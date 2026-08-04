export type WaitlistSource = 'landing_hero' | 'landing_footer';

export interface JoinWaitlistInput {
  email: string;
  locale?: string;
  source?: WaitlistSource;
}

export type JoinWaitlistResult = 'joined' | 'already_registered';

export interface WaitlistRepositoryPort {
  join(input: JoinWaitlistInput): Promise<JoinWaitlistResult>;
}
