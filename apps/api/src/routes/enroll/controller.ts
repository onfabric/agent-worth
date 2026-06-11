import { Elysia, StatusMap } from 'elysia';
import { EnrollBodySchema, EnrollResponseSchema } from '#routes/enroll/model.ts';
import type { ServicePlugins } from '#services/plugins.ts';

export function createEnrollController({ EnrollmentServicePlugin, loggerPlugin }: ServicePlugins) {
  return new Elysia()
    .use(loggerPlugin('enrollController'))
    .use(EnrollmentServicePlugin)
    .post(
      '/v1/enroll',
      async ({ body, enrollmentService, logger, status }) => {
        logger.info(`enrolling client ${body.clientId}`);
        const result = await enrollmentService.enroll(body);
        return status(StatusMap.OK, result);
      },
      {
        body: EnrollBodySchema,
        response: {
          [StatusMap.OK]: EnrollResponseSchema,
        },
      },
    );
}
