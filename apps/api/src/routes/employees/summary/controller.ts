import { Elysia, StatusMap } from 'elysia';
import {
  EmployeeSummaryParamsSchema,
  EmployeeSummaryResponseSchema,
} from '#routes/employees/summary/model.ts';
import type { ServicePlugins } from '#services/plugins.ts';

export function createEmployeeSummaryController({
  EmployeesServicePlugin,
  loggerPlugin,
}: ServicePlugins) {
  return new Elysia()
    .use(loggerPlugin('employeeSummaryController'))
    .use(EmployeesServicePlugin)
    .get(
      '/v1/employees/:id/summary',
      ({ params, employeesService, logger, status }) => {
        logger.info(`summarizing employee ${params.id}`);
        const result = employeesService.summarize(params.id);
        return status(StatusMap.OK, result);
      },
      {
        params: EmployeeSummaryParamsSchema,
        response: {
          [StatusMap.OK]: EmployeeSummaryResponseSchema,
        },
      },
    );
}
