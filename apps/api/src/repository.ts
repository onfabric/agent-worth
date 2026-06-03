import { seedEmployees } from '@agent-worth/db';
import {
  calculateSessionCost,
  hasNativeUsage,
  type ModelPrice,
  type SourceTool,
  selectCurrentPrice,
  syntheticModelPrices,
  syntheticTranscriptEvents,
  type TranscriptCloudEvent,
  type TranscriptMessage,
  type UsageStatus,
} from '@agent-worth/shared';

type Employee = {
  id: string;
  displayName: string;
  email?: string | undefined;
  team?: string | undefined;
};

type Client = {
  id: string;
  employeeId: string;
  apiToken: string;
  hostnameHash?: string | undefined;
};

type RawArtifact = {
  id: string;
  employeeId: string;
  clientId: string;
  sourceTool: SourceTool;
  sourceSessionId: string;
  sourcePathHash: string;
  currentContentHash: string;
  versions: RawArtifactVersion[];
};

type RawArtifactVersion = {
  id: string;
  artifactId: string;
  contentHash: string;
  storageUri: string;
  byteSize: number;
  capturedAt: string;
};

export type SessionView = {
  id: string;
  employeeId: string;
  employeeName: string;
  team?: string | undefined;
  sourceTool: SourceTool;
  sourceSessionId: string;
  title?: string | undefined;
  model?: string | undefined;
  provider?: string | undefined;
  startedAt?: string | undefined;
  endedAt?: string | undefined;
  usageStatus: UsageStatus;
  totalTokens: number;
  totalUsd: number;
  inputUsd: number;
  outputUsd: number;
  messages: TranscriptMessage[];
  goalSummary: string | null;
  proficiencyScore: number | null;
};

export type Repository = {
  enroll(input: { enrollmentToken: string; clientId: string; hostnameHash?: string }): Promise<{
    employee: Employee;
    clientId: string;
    apiToken: string;
  }>;
  ingestBatch(
    events: TranscriptCloudEvent[],
    authorization?: string,
  ): Promise<{
    accepted: number;
    createdVersions: number;
    skippedUnchanged: number;
  }>;
  listSessions(filters?: {
    employeeId?: string | undefined;
    sourceTool?: string | undefined;
    day?: string | undefined;
    usageStatus?: string | undefined;
  }): SessionView[];
  costSummary(filters?: { employeeId?: string | undefined; day?: string | undefined }): {
    totalUsd: number;
    totalTokens: number;
    sessions: number;
    byEmployee: Array<{
      employeeId: string;
      employeeName: string;
      totalUsd: number;
      totalTokens: number;
      sessions: number;
    }>;
    byDay: Array<{ day: string; totalUsd: number; totalTokens: number; sessions: number }>;
  };
  employeeSummary(employeeId: string): {
    employee: Employee | undefined;
    totalUsd: number;
    totalTokens: number;
    sessions: SessionView[];
  };
};

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function inferProvider(model: string | undefined, sourceTool: SourceTool): string | undefined {
  if (!model) {
    if (sourceTool === 'codex') return 'openai';
    if (sourceTool.startsWith('claude')) return 'anthropic';
    return undefined;
  }

  if (model.includes('claude')) return 'anthropic';
  if (model.includes('gpt') || model.includes('codex')) return 'openai';
  return undefined;
}

function dayOf(value: string | undefined): string {
  return (value ?? new Date().toISOString()).slice(0, 10);
}

function byteSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function createMemoryRepository(options?: {
  seed?: boolean;
  modelPrices?: ModelPrice[];
}): Repository {
  const employees = new Map<string, Employee>(
    seedEmployees.map((employee) => [employee.id, employee]),
  );
  const clients = new Map<string, Client>();
  const artifacts = new Map<string, RawArtifact>();
  const sessions = new Map<string, SessionView>();
  const prices = options?.modelPrices ?? syntheticModelPrices;

  clients.set('client_synthetic_laptop', {
    id: 'client_synthetic_laptop',
    employeeId: 'emp_synthetic_ada',
    apiToken: 'synthetic-api-token',
  });
  clients.set('client_synthetic_workstation', {
    id: 'client_synthetic_workstation',
    employeeId: 'emp_synthetic_grace',
    apiToken: 'synthetic-api-token',
  });

  function upsertEvent(event: TranscriptCloudEvent): 'created' | 'unchanged' {
    const employeeId = event.employeeid ?? 'emp_synthetic_ada';
    const clientId = event.clientid ?? 'client_synthetic_laptop';
    const payload = event.data;
    const artifactKey = `${employeeId}:${payload.source}:${payload.sourceSessionId}:${payload.sourcePathHash}`;
    const existing = artifacts.get(artifactKey);

    if (existing?.currentContentHash === payload.contentHash) {
      return 'unchanged';
    }

    const artifact: RawArtifact = existing ?? {
      id: id('artifact'),
      employeeId,
      clientId,
      sourceTool: payload.source,
      sourceSessionId: payload.sourceSessionId,
      sourcePathHash: payload.sourcePathHash,
      currentContentHash: payload.contentHash,
      versions: [],
    };

    const version: RawArtifactVersion = {
      id: id('artifact_version'),
      artifactId: artifact.id,
      contentHash: payload.contentHash,
      storageUri: `memory://${artifact.id}/${payload.contentHash}`,
      byteSize: byteSize(payload.raw),
      capturedAt: payload.capturedAt,
    };

    artifact.currentContentHash = payload.contentHash;
    artifact.versions.push(version);
    artifacts.set(artifactKey, artifact);

    const employee = employees.get(employeeId) ?? {
      id: employeeId,
      displayName: employeeId,
    };
    employees.set(employee.id, employee);

    const provider = inferProvider(payload.model, payload.source);
    const price =
      provider && payload.model
        ? selectCurrentPrice(prices, provider, payload.model, payload.capturedAt)
        : undefined;
    const cost = calculateSessionCost({
      usage: payload.usage,
      price,
      usageStatus: hasNativeUsage(payload.usage) ? 'native' : 'missing',
    });
    const startedAt =
      payload.messages.find((message) => message.createdAt)?.createdAt ?? payload.capturedAt;
    const endedAt =
      [...payload.messages].reverse().find((message) => message.createdAt)?.createdAt ??
      payload.capturedAt;
    const totalTokens =
      payload.usage?.totalTokens ??
      (payload.usage
        ? payload.usage.inputTokens +
          payload.usage.outputTokens +
          payload.usage.cachedInputTokens +
          payload.usage.cacheCreationInputTokens +
          payload.usage.reasoningOutputTokens
        : 0);

    sessions.set(version.id, {
      id: version.id,
      employeeId,
      employeeName: employee.displayName,
      team: employee.team,
      sourceTool: payload.source,
      sourceSessionId: payload.sourceSessionId,
      title: payload.title,
      model: payload.model,
      provider,
      startedAt,
      endedAt,
      usageStatus: cost.usageStatus,
      totalTokens,
      totalUsd: cost.totalUsd,
      inputUsd: cost.inputUsd,
      outputUsd: cost.outputUsd,
      messages: payload.messages,
      goalSummary: null,
      proficiencyScore: null,
    });

    return 'created';
  }

  if (options?.seed !== false) {
    for (const event of syntheticTranscriptEvents) {
      upsertEvent(event);
    }
  }

  return {
    async enroll(input) {
      const employee = employees.get('emp_synthetic_ada') ?? {
        id: 'emp_synthetic_ada',
        displayName: 'Ada Lovelace',
        email: 'ada@example.invalid',
        team: 'Platform',
      };

      if (input.enrollmentToken !== (Bun.env.AGENT_WORTH_ENROLLMENT_TOKEN ?? 'dev-enroll-token')) {
        throw new Response('Invalid enrollment token', { status: 401 });
      }

      const apiToken = `awt_${crypto.randomUUID().replaceAll('-', '')}`;
      clients.set(input.clientId, {
        id: input.clientId,
        employeeId: employee.id,
        apiToken,
        hostnameHash: input.hostnameHash,
      });

      return {
        employee,
        clientId: input.clientId,
        apiToken,
      };
    },
    async ingestBatch(events, authorization) {
      if (authorization && !authorization.startsWith('Bearer ')) {
        throw new Response('Unsupported authorization header', { status: 401 });
      }

      let createdVersions = 0;
      let skippedUnchanged = 0;

      for (const event of events) {
        const result = upsertEvent(event);
        if (result === 'created') createdVersions += 1;
        if (result === 'unchanged') skippedUnchanged += 1;
      }

      return {
        accepted: events.length,
        createdVersions,
        skippedUnchanged,
      };
    },
    listSessions(filters = {}) {
      return [...sessions.values()]
        .filter((session) => !filters.employeeId || session.employeeId === filters.employeeId)
        .filter((session) => !filters.sourceTool || session.sourceTool === filters.sourceTool)
        .filter((session) => !filters.usageStatus || session.usageStatus === filters.usageStatus)
        .filter((session) => !filters.day || dayOf(session.startedAt) === filters.day)
        .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));
    },
    costSummary(filters = {}) {
      const filtered = this.listSessions(filters);
      const byEmployee = new Map<
        string,
        {
          employeeId: string;
          employeeName: string;
          totalUsd: number;
          totalTokens: number;
          sessions: number;
        }
      >();
      const byDay = new Map<
        string,
        { day: string; totalUsd: number; totalTokens: number; sessions: number }
      >();

      for (const session of filtered) {
        const employeeRow = byEmployee.get(session.employeeId) ?? {
          employeeId: session.employeeId,
          employeeName: session.employeeName,
          totalUsd: 0,
          totalTokens: 0,
          sessions: 0,
        };
        employeeRow.totalUsd += session.totalUsd;
        employeeRow.totalTokens += session.totalTokens;
        employeeRow.sessions += 1;
        byEmployee.set(session.employeeId, employeeRow);

        const day = dayOf(session.startedAt);
        const dayRow = byDay.get(day) ?? { day, totalUsd: 0, totalTokens: 0, sessions: 0 };
        dayRow.totalUsd += session.totalUsd;
        dayRow.totalTokens += session.totalTokens;
        dayRow.sessions += 1;
        byDay.set(day, dayRow);
      }

      return {
        totalUsd: Number(filtered.reduce((sum, session) => sum + session.totalUsd, 0).toFixed(6)),
        totalTokens: filtered.reduce((sum, session) => sum + session.totalTokens, 0),
        sessions: filtered.length,
        byEmployee: [...byEmployee.values()].map((row) => ({
          ...row,
          totalUsd: Number(row.totalUsd.toFixed(6)),
        })),
        byDay: [...byDay.values()].map((row) => ({
          ...row,
          totalUsd: Number(row.totalUsd.toFixed(6)),
        })),
      };
    },
    employeeSummary(employeeId) {
      const filtered = this.listSessions({ employeeId });
      return {
        employee: employees.get(employeeId),
        totalUsd: Number(filtered.reduce((sum, session) => sum + session.totalUsd, 0).toFixed(6)),
        totalTokens: filtered.reduce((sum, session) => sum + session.totalTokens, 0),
        sessions: filtered,
      };
    },
  };
}
