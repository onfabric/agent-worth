import { Elysia, StatusMap } from 'elysia';
import { CostSummaryQuerySchema, CostSummaryResponseSchema } from '#routes/costs/model.ts';
import type { ServicePlugins } from '#services/plugins.ts';

export function createCostsController({ CostsServicePlugin, loggerPlugin }: ServicePlugins) {
  return new Elysia()
    .use(loggerPlugin('costsController'))
    .use(CostsServicePlugin)
    .get(
      '/v1/costs',
      ({ query, costsService, logger, status }) => {
        logger.info(`summarizing costs employee=${query.employeeId ?? ''} day=${query.day ?? ''}`);
        const result = costsService.summarize({
          day: query.day,
          employeeId: query.employeeId,
        });
        return status(StatusMap.OK, result);
      },
      {
        query: CostSummaryQuerySchema,
        response: {
          [StatusMap.OK]: CostSummaryResponseSchema,
        },
      },
    );
}
