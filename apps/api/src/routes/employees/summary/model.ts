import { t } from 'elysia';
import { EmployeeSchema } from '#routes/enroll/model.ts';
import { SessionViewSchema } from '#routes/sessions/model.ts';

export const EmployeeSummaryParamsSchema = t.Object({
  id: t.String(),
});

export const EmployeeSummaryResponseSchema = t.Object({
  employee: t.Optional(EmployeeSchema),
  totalUsd: t.Number(),
  totalTokens: t.Number(),
  sessions: t.Array(SessionViewSchema),
});
