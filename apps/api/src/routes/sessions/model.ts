import { t } from 'elysia';

const NullableStringSchema = t.Union([t.String(), t.Null()]);
const NullableNumberSchema = t.Union([t.Number(), t.Null()]);

export const SourceToolSchema = t.Union([
  t.Literal('codex'),
  t.Literal('claude-code'),
  t.Literal('claude-cowork'),
]);

export const UsageStatusSchema = t.Union([
  t.Literal('native'),
  t.Literal('estimated'),
  t.Literal('missing'),
]);

export const ListSessionsQuerySchema = t.Object({
  employeeId: t.Optional(t.String()),
  sourceTool: t.Optional(t.String()),
  day: t.Optional(t.String()),
  usageStatus: t.Optional(t.String()),
});

export const SessionListItemSchema = t.Object({
  id: t.String(),
  employeeId: t.String(),
  employeeName: t.String(),
  team: t.Optional(t.String()),
  sourceTool: SourceToolSchema,
  sourceSessionId: t.String(),
  title: t.Optional(t.String()),
  model: t.Optional(t.String()),
  provider: t.Optional(t.String()),
  startedAt: t.Optional(t.String()),
  endedAt: t.Optional(t.String()),
  usageStatus: UsageStatusSchema,
  totalTokens: t.Number(),
  totalUsd: t.Number(),
  inputUsd: t.Number(),
  outputUsd: t.Number(),
  goalSummary: NullableStringSchema,
  proficiencyScore: NullableNumberSchema,
});

export const SessionViewSchema = t.Composite([
  SessionListItemSchema,
  t.Object({
    messages: t.Array(t.Any()),
  }),
]);

export const ListSessionsResponseSchema = t.Array(SessionListItemSchema);
