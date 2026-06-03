import { Elysia, StatusMap } from 'elysia';
import { IngestBatchBodySchema, IngestBatchResponseSchema } from '#routes/ingest/batch/model.ts';
import type { ServicePlugins } from '#services/plugins.ts';

export function createIngestBatchController({ IngestServicePlugin, loggerPlugin }: ServicePlugins) {
  return new Elysia()
    .use(loggerPlugin('ingestBatchController'))
    .use(IngestServicePlugin)
    .post(
      '/v1/ingest/batch',
      async ({ body, headers, ingestService, logger, status }) => {
        logger.info(`ingesting ${body.length} CloudEvent(s)`);
        const result = await ingestService.ingestBatch(body, headers.authorization);
        return status(StatusMap.OK, result);
      },
      {
        body: IngestBatchBodySchema,
        response: {
          [StatusMap.OK]: IngestBatchResponseSchema,
        },
      },
    );
}
