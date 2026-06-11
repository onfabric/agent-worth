import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { configuredMaxRequestBodySize } from '#lib/env.ts';
import { elysiaErrorHandler } from '#lib/errors.ts';
import { requestResponsePlugin } from '#lib/request-response.ts';
import {
  type AgentWorthRepositoryContract,
  createMemoryRepository,
} from '#repositories/agent-worth.repository.ts';
import { createCostsController } from '#routes/costs/controller.ts';
import { createEmployeeSummaryController } from '#routes/employees/summary/controller.ts';
import { createEnrollController } from '#routes/enroll/controller.ts';
import { createHealthController } from '#routes/health/controller.ts';
import { createIngestBatchController } from '#routes/ingest/batch/controller.ts';
import { createSessionsController } from '#routes/sessions/controller.ts';
import { createServicePlugins } from '#services/plugins.ts';

export function createApp(repository: AgentWorthRepositoryContract = createMemoryRepository()) {
  const servicePlugins = createServicePlugins(repository);

  return new Elysia({
    serve: {
      maxRequestBodySize: configuredMaxRequestBodySize(),
    },
  })
    .onError(elysiaErrorHandler)
    .onParse(({ contentType, request }) => {
      if (contentType === 'application/cloudevents-batch+json') return request.json();
    })
    .use(cors())
    .use(requestResponsePlugin)
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Agent Worth API',
            version: '0.1.0',
          },
        },
      }),
    )
    .use(createHealthController(servicePlugins))
    .use(createEnrollController(servicePlugins))
    .use(createIngestBatchController(servicePlugins))
    .use(createSessionsController(servicePlugins))
    .use(createCostsController(servicePlugins))
    .use(createEmployeeSummaryController(servicePlugins));
}

export type App = ReturnType<typeof createApp>;
