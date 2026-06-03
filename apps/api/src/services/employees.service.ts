import type { AgentWorthRepositoryContract } from '#repositories/agent-worth.repository.ts';
import { Service } from '#services/service.ts';

export class EmployeesService extends Service {
  private readonly repository: AgentWorthRepositoryContract;

  constructor(repository: AgentWorthRepositoryContract) {
    super();
    this.repository = repository;
  }

  summarize(employeeId: string) {
    const result = this.repository.employeeSummary(employeeId);
    this.logger.info(`summarized employee ${employeeId}`);
    return result;
  }
}
