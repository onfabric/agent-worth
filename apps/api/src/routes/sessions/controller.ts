import { Elysia, StatusMap } from 'elysia';
import { ListSessionsQuerySchema, ListSessionsResponseSchema } from '#routes/sessions/model.ts';
import type { ServicePlugins } from '#services/plugins.ts';

export function createSessionsController({ SessionsServicePlugin, loggerPlugin }: ServicePlugins) {
  return new Elysia()
    .use(loggerPlugin('sessionsController'))
    .use(SessionsServicePlugin)
    .get(
      '/v1/sessions',
      ({ query, sessionsService, logger, status }) => {
        logger.info(
          `listing sessions employee=${query.employeeId ?? ''} source=${query.sourceTool ?? ''} day=${query.day ?? ''}`,
        );
        const result = sessionsService.listSessions({
          employeeId: query.employeeId,
          sourceTool: query.sourceTool,
          day: query.day,
          usageStatus: query.usageStatus,
        });
        return status(StatusMap.OK, result);
      },
      {
        query: ListSessionsQuerySchema,
        response: {
          [StatusMap.OK]: ListSessionsResponseSchema,
        },
      },
    );
}
