import { UnauthorizedError } from '#lib/errors.ts';
import type { AgentWorthRepositoryContract } from '#repositories/agent-worth.repository.ts';
import { Service } from '#services/service.ts';

export type EnrollInput = {
  enrollmentToken: string;
  clientId: string;
  hostnameHash?: string | undefined;
};

export class EnrollmentService extends Service {
  private readonly repository: AgentWorthRepositoryContract;

  constructor(repository: AgentWorthRepositoryContract) {
    super();
    this.repository = repository;
  }

  async enroll(input: EnrollInput) {
    if (input.enrollmentToken !== (Bun.env.AGENT_WORTH_ENROLLMENT_TOKEN ?? 'dev-enroll-token')) {
      throw new UnauthorizedError('Invalid enrollment token');
    }

    const result = await this.repository.enroll(input);
    this.logger.info(`enrolled client ${input.clientId}`);
    return result;
  }
}
