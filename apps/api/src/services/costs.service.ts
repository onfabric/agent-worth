import type {
  AgentWorthRepositoryContract,
  CostSummaryFilters,
} from '#repositories/agent-worth.repository.ts';
import { Service } from '#services/service.ts';

export class CostsService extends Service {
  private readonly repository: AgentWorthRepositoryContract;

  constructor(repository: AgentWorthRepositoryContract) {
    super();
    this.repository = repository;
  }

  summarize(filters: CostSummaryFilters = {}) {
    const result = this.repository.costSummary(filters);
    this.logger.info(`summarized ${result.sessions} session(s)`);
    return result;
  }
}
