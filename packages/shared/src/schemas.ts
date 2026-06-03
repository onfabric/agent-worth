import { z } from 'zod';

export const SourceToolSchema = z.enum(['codex', 'claude-code', 'claude-cowork']);
export type SourceTool = z.infer<typeof SourceToolSchema>;

export const RawFormatSchema = z.enum(['jsonl', 'json', 'unknown']);
export type RawFormat = z.infer<typeof RawFormatSchema>;

export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  cachedInputTokens: z.number().int().nonnegative().default(0),
  cacheCreationInputTokens: z.number().int().nonnegative().default(0),
  reasoningOutputTokens: z.number().int().nonnegative().default(0),
  totalTokens: z.number().int().nonnegative().optional(),
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const TranscriptMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['system', 'user', 'assistant', 'tool', 'event', 'unknown']),
  text: z.string().optional(),
  content: z.unknown().optional(),
  model: z.string().optional(),
  createdAt: z.string().optional(),
  usage: TokenUsageSchema.optional(),
  raw: z.unknown().optional(),
});
export type TranscriptMessage = z.infer<typeof TranscriptMessageSchema>;

export const RawTranscriptPayloadSchema = z.object({
  source: SourceToolSchema,
  sourceSessionId: z.string(),
  sourcePathHash: z.string(),
  contentHash: z.string(),
  capturedAt: z.string(),
  sourceMtimeMs: z.number().nonnegative(),
  rawFormat: RawFormatSchema,
  raw: z.unknown(),
  messages: z.array(TranscriptMessageSchema).default([]),
  usage: TokenUsageSchema.optional(),
  model: z.string().optional(),
  title: z.string().optional(),
  cwdHash: z.string().optional(),
});
export type RawTranscriptPayload = z.infer<typeof RawTranscriptPayloadSchema>;

export const CloudEventSchema = z.object({
  specversion: z.literal('1.0'),
  id: z.string(),
  source: z.string(),
  type: z.literal('dev.agent-worth.transcript.synced.v1'),
  time: z.string(),
  subject: z.string(),
  datacontenttype: z.literal('application/json'),
  data: RawTranscriptPayloadSchema,
  employeeid: z.string().optional(),
  clientid: z.string().optional(),
});
export type TranscriptCloudEvent = z.infer<typeof CloudEventSchema>;

export const UsageStatusSchema = z.enum(['native', 'estimated', 'missing']);
export type UsageStatus = z.infer<typeof UsageStatusSchema>;

export const ModelPriceSchema = z.object({
  provider: z.string(),
  model: z.string(),
  effectiveFrom: z.string(),
  inputUsdPerMillion: z.number().nonnegative(),
  outputUsdPerMillion: z.number().nonnegative(),
  cachedInputUsdPerMillion: z.number().nonnegative().default(0),
  cacheCreationUsdPerMillion: z.number().nonnegative().default(0),
  reasoningOutputUsdPerMillion: z.number().nonnegative().default(0),
});
export type ModelPrice = z.infer<typeof ModelPriceSchema>;

export const SessionCostSchema = z.object({
  inputUsd: z.number(),
  outputUsd: z.number(),
  cachedInputUsd: z.number(),
  cacheCreationUsd: z.number(),
  reasoningOutputUsd: z.number(),
  totalUsd: z.number(),
  usageStatus: UsageStatusSchema,
});
export type SessionCost = z.infer<typeof SessionCostSchema>;

export const EvaluationSchema = z.object({
  goalSummary: z.string().nullable(),
  outcomeStatus: z.enum(['achieved', 'partial', 'not_achieved', 'unknown']).nullable(),
  proficiencyScore: z.number().min(0).max(1).nullable(),
  evaluatorModel: z.string().nullable(),
  promptVersion: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

export function createTranscriptCloudEvent(input: {
  id: string;
  sourceUri: string;
  time: string;
  payload: RawTranscriptPayload;
  employeeId?: string | undefined;
  clientId?: string | undefined;
}): TranscriptCloudEvent {
  const event = {
    specversion: '1.0',
    id: input.id,
    source: input.sourceUri,
    type: 'dev.agent-worth.transcript.synced.v1',
    time: input.time,
    subject: `${input.payload.source}/${input.payload.sourceSessionId}`,
    datacontenttype: 'application/json',
    data: input.payload,
  } satisfies Omit<TranscriptCloudEvent, 'employeeid' | 'clientid'>;

  return CloudEventSchema.parse({
    ...event,
    ...(input.employeeId ? { employeeid: input.employeeId } : {}),
    ...(input.clientId ? { clientid: input.clientId } : {}),
  });
}
