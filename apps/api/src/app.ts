import { CloudEventSchema } from '@agent-worth/shared';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { Elysia, t } from 'elysia';
import { createMemoryRepository, type Repository } from './repository';

export function createApp(repository: Repository = createMemoryRepository()) {
  return new Elysia()
    .use(cors())
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
    .decorate('repository', repository)
    .get('/health', () => ({ ok: true }))
    .post('/v1/enroll', async ({ body, repository: repo }) => repo.enroll(body), {
      body: t.Object({
        enrollmentToken: t.String(),
        clientId: t.String(),
        hostnameHash: t.Optional(t.String()),
      }),
    })
    .post(
      '/v1/ingest/batch',
      async ({ body, headers, repository: repo }) => {
        const events = body.map((event) => CloudEventSchema.parse(event));
        return repo.ingestBatch(events, headers.authorization);
      },
      {
        body: t.Array(t.Any()),
      },
    )
    .get(
      '/v1/sessions',
      ({ query, repository: repo }) =>
        repo.listSessions({
          employeeId: query.employeeId,
          sourceTool: query.sourceTool,
          day: query.day,
          usageStatus: query.usageStatus,
        }),
      {
        query: t.Object({
          employeeId: t.Optional(t.String()),
          sourceTool: t.Optional(t.String()),
          day: t.Optional(t.String()),
          usageStatus: t.Optional(t.String()),
        }),
      },
    )
    .get(
      '/v1/costs',
      ({ query, repository: repo }) =>
        repo.costSummary({
          day: query.day,
          employeeId: query.employeeId,
        }),
      {
        query: t.Object({
          day: t.Optional(t.String()),
          employeeId: t.Optional(t.String()),
        }),
      },
    )
    .get('/v1/employees/:id/summary', ({ params, repository: repo }) =>
      repo.employeeSummary(params.id),
    );
}

export type App = ReturnType<typeof createApp>;
