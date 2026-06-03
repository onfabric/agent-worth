import { CloudEventSchema, type TranscriptCloudEvent } from '@agent-worth/shared';
import { z } from 'zod';
import { BadRequestError, UnauthorizedError } from '#lib/errors.ts';
import type { AgentWorthRepositoryContract } from '#repositories/agent-worth.repository.ts';
import { Service } from '#services/service.ts';

export class IngestService extends Service {
  private readonly repository: AgentWorthRepositoryContract;

  constructor(repository: AgentWorthRepositoryContract) {
    super();
    this.repository = repository;
  }

  async ingestBatch(events: unknown[], authorization?: string | undefined) {
    if (authorization && !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedError('Unsupported authorization header');
    }

    const parsed = events.map((event) => parseCloudEvent(event));
    const result = await this.repository.ingestBatch(parsed);
    this.logger.info(
      `ingested ${result.accepted} event(s): ${result.createdVersions} created, ${result.skippedUnchanged} unchanged`,
    );
    return result;
  }
}

function parseCloudEvent(event: unknown): TranscriptCloudEvent {
  try {
    return CloudEventSchema.parse(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(`Invalid CloudEvent payload: ${error.issues[0]?.message ?? ''}`);
    }
    throw error;
  }
}
