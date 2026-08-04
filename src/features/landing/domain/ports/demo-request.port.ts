export type DemoRequestSource = 'landing_hero' | 'landing_demo' | 'landing_footer';

export interface RequestDemoInput {
  email: string;
  name: string;
  locale?: string;
  source?: DemoRequestSource;
}

export type RequestDemoResult = 'requested' | 'already_registered';

export interface DemoRequestRepositoryPort {
  request(input: RequestDemoInput): Promise<RequestDemoResult>;
}
