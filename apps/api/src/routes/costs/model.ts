import { t } from 'elysia';

export const CostSummaryQuerySchema = t.Object({
  day: t.Optional(t.String()),
  employeeId: t.Optional(t.String()),
});

export const CostSummaryEmployeeSchema = t.Object({
  employeeId: t.String(),
  employeeName: t.String(),
  totalUsd: t.Number(),
  totalTokens: t.Number(),
  sessions: t.Integer(),
});

export const CostSummaryDaySchema = t.Object({
  day: t.String(),
  totalUsd: t.Number(),
  totalTokens: t.Number(),
  sessions: t.Integer(),
});

export const CostSummaryResponseSchema = t.Object({
  totalUsd: t.Number(),
  totalTokens: t.Number(),
  sessions: t.Integer(),
  byEmployee: t.Array(CostSummaryEmployeeSchema),
  byDay: t.Array(CostSummaryDaySchema),
});
