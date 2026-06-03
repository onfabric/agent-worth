import { Elysia, StatusMap } from 'elysia';
import { GetHealthResponseSchema } from '#routes/health/model.ts';
import type { ServicePlugins } from '#services/plugins.ts';

export function createHealthController({ HealthServicePlugin, loggerPlugin }: ServicePlugins) {
  return new Elysia()
    .use(loggerPlugin('healthController'))
    .use(HealthServicePlugin)
    .get(
      '/health',
      async ({ healthService, logger, status }) => {
        logger.info('handling health check request');
        const result = await healthService.check();
        return status(StatusMap.OK, result);
      },
      {
        response: {
          [StatusMap.OK]: GetHealthResponseSchema,
        },
      },
    );
}
