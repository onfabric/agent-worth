import type {
  AgentWorthRepositoryContract,
  SessionFilters,
  SessionView,
} from '#repositories/agent-worth.repository.ts';
import { Service } from '#services/service.ts';

export type SessionListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  team?: string;
  sourceTool: SessionView['sourceTool'];
  sourceSessionId: string;
  title?: string;
  model?: string;
  provider?: string;
  startedAt?: string;
  endedAt?: string;
  usageStatus: SessionView['usageStatus'];
  totalTokens: number;
  totalUsd: number;
  inputUsd: number;
  outputUsd: number;
  goalSummary: string | null;
  proficiencyScore: number | null;
};

export class SessionsService extends Service {
  private readonly repository: AgentWorthRepositoryContract;

  constructor(repository: AgentWorthRepositoryContract) {
    super();
    this.repository = repository;
  }

  listSessions(filters: SessionFilters = {}): SessionListItem[] {
    const sessions = this.repository.listSessions(filters).map(sessionListItem);
    this.logger.info(`listed ${sessions.length} session(s)`);
    return sessions;
  }
}

function sessionListItem({
  messages: _messages,
  team,
  title,
  model,
  provider,
  startedAt,
  endedAt,
  ...session
}: SessionView): SessionListItem {
  return {
    ...session,
    ...(team !== undefined ? { team } : {}),
    ...(title !== undefined ? { title } : {}),
    ...(model !== undefined ? { model } : {}),
    ...(provider !== undefined ? { provider } : {}),
    ...(startedAt !== undefined ? { startedAt } : {}),
    ...(endedAt !== undefined ? { endedAt } : {}),
  };
}
