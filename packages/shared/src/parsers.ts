import type { RawTranscriptPayload, SourceTool, TokenUsage, TranscriptMessage } from "./schemas";

export type ParsedTranscript = {
  source: SourceTool;
  sourceSessionId: string;
  rawFormat: "jsonl" | "json" | "unknown";
  raw: unknown;
  messages: TranscriptMessage[];
  usage?: TokenUsage | undefined;
  model?: string | undefined;
  title?: string | undefined;
};

export function parseJsonl(input: string): unknown[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function usageFromNative(value: unknown): TokenUsage | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const usage: TokenUsage = {
    inputTokens: numberValue(record.input_tokens) ?? numberValue(record.inputTokens) ?? 0,
    outputTokens: numberValue(record.output_tokens) ?? numberValue(record.outputTokens) ?? 0,
    cachedInputTokens: numberValue(record.cached_input_tokens) ?? numberValue(record.cache_read_input_tokens) ?? 0,
    cacheCreationInputTokens:
      numberValue(record.cache_creation_input_tokens) ??
      numberValue(asRecord(record.cache_creation)?.ephemeral_5m_input_tokens) ??
      0,
    reasoningOutputTokens: numberValue(record.reasoning_output_tokens) ?? 0,
    totalTokens: numberValue(record.total_tokens) ?? numberValue(record.totalTokens)
  };

  if (
    usage.inputTokens === 0 &&
    usage.outputTokens === 0 &&
    usage.cachedInputTokens === 0 &&
    usage.cacheCreationInputTokens === 0 &&
    usage.reasoningOutputTokens === 0 &&
    !usage.totalTokens
  ) {
    return undefined;
  }

  return usage;
}

function addUsage(left: TokenUsage | undefined, right: TokenUsage | undefined): TokenUsage | undefined {
  if (!left) return right;
  if (!right) return left;

  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
    cacheCreationInputTokens: left.cacheCreationInputTokens + right.cacheCreationInputTokens,
    reasoningOutputTokens: left.reasoningOutputTokens + right.reasoningOutputTokens,
    totalTokens: (left.totalTokens ?? 0) + (right.totalTokens ?? 0)
  };
}

function extractText(content: unknown): string | undefined {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        const record = asRecord(part);
        return stringValue(record?.text) ?? stringValue(record?.content);
      })
      .filter(Boolean)
      .join("\n");
  }
  const record = asRecord(content);
  return stringValue(record?.text) ?? stringValue(record?.content);
}

export function parseCodexJsonl(input: string): ParsedTranscript {
  const raw = parseJsonl(input);
  let sessionId: string | undefined;
  let model: string | undefined;
  let cumulativeUsage: TokenUsage | undefined;
  let incrementalUsage: TokenUsage | undefined;
  const messages: TranscriptMessage[] = [];

  for (const [index, event] of raw.entries()) {
    const record = asRecord(event);
    const payload = asRecord(record?.payload);
    const type = stringValue(record?.type);

    if (type === "session_meta" && payload) {
      sessionId = stringValue(payload.id) ?? sessionId;
      model = stringValue(payload.model) ?? model;
    }

    const totalUsage = usageFromNative(asRecord(payload?.info)?.total_token_usage);
    const lastUsage = usageFromNative(asRecord(payload?.info)?.last_token_usage);
    if (totalUsage) {
      cumulativeUsage = totalUsage;
    } else {
      incrementalUsage = addUsage(incrementalUsage, lastUsage);
    }

    if (type === "response_item" && payload) {
      const role = stringValue(payload.role);
      const messageRole = role === "user" || role === "assistant" || role === "system" ? role : undefined;
      if (messageRole) {
        messages.push({
          id: `codex-${index}`,
          role: messageRole,
          text: extractText(payload.content),
          content: payload.content,
          createdAt: stringValue(record?.timestamp),
          raw: event
        });
      }
    }

    if (type === "event_msg" && payload && stringValue(payload.message)) {
      messages.push({
        id: `codex-event-${index}`,
        role: "event",
        text: stringValue(payload.message),
        createdAt: stringValue(record?.timestamp),
        raw: event
      });
    }
  }

  return {
    source: "codex",
    sourceSessionId: sessionId ?? "unknown-codex-session",
    rawFormat: "jsonl",
    raw,
    messages,
    usage: cumulativeUsage ?? incrementalUsage,
    model
  };
}

export function parseClaudeJsonl(input: string): ParsedTranscript {
  const raw = parseJsonl(input);
  let sessionId: string | undefined;
  let model: string | undefined;
  let title: string | undefined;
  let usage: TokenUsage | undefined;
  const messages: TranscriptMessage[] = [];

  for (const [index, event] of raw.entries()) {
    const record = asRecord(event);
    const type = stringValue(record?.type);
    sessionId = stringValue(record?.sessionId) ?? sessionId;
    title = type === "ai-title" ? extractText(record?.content) ?? title : title;

    const messageRecord = asRecord(record?.message);
    model = stringValue(messageRecord?.model) ?? model;
    const messageUsage = usageFromNative(messageRecord?.usage);
    const toolUsage = usageFromNative(asRecord(record?.toolUseResult)?.usage);
    usage = addUsage(usage, messageUsage ?? toolUsage);

    if (type === "user" || type === "assistant") {
      messages.push({
        id: `claude-${index}`,
        role: type,
        text: extractText(messageRecord?.content ?? record?.content),
        content: messageRecord?.content ?? record?.content,
        model: stringValue(messageRecord?.model),
        createdAt: stringValue(record?.timestamp),
        usage: messageUsage,
        raw: event
      });
    }
  }

  return {
    source: "claude-code",
    sourceSessionId: sessionId ?? "unknown-claude-session",
    rawFormat: "jsonl",
    raw,
    messages,
    usage,
    model,
    title
  };
}

export function parsedToPayload(input: {
  parsed: ParsedTranscript;
  sourcePathHash: string;
  contentHash: string;
  capturedAt: string;
  sourceMtimeMs: number;
  cwdHash?: string;
}): RawTranscriptPayload {
  const payload: RawTranscriptPayload = {
    source: input.parsed.source,
    sourceSessionId: input.parsed.sourceSessionId,
    sourcePathHash: input.sourcePathHash,
    contentHash: input.contentHash,
    capturedAt: input.capturedAt,
    sourceMtimeMs: input.sourceMtimeMs,
    rawFormat: input.parsed.rawFormat,
    raw: input.parsed.raw,
    messages: input.parsed.messages
  };

  if (input.parsed.usage) payload.usage = input.parsed.usage;
  if (input.parsed.model) payload.model = input.parsed.model;
  if (input.parsed.title) payload.title = input.parsed.title;
  if (input.cwdHash) payload.cwdHash = input.cwdHash;

  return payload;
}
