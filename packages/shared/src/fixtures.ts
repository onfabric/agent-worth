import type { ModelPrice, TranscriptCloudEvent } from "./schemas";
import { createTranscriptCloudEvent } from "./schemas";

export const syntheticModelPrices: ModelPrice[] = [
  {
    provider: "openai",
    model: "gpt-5-codex",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    inputUsdPerMillion: 1.25,
    outputUsdPerMillion: 10,
    cachedInputUsdPerMillion: 0.125,
    cacheCreationUsdPerMillion: 1.25,
    reasoningOutputUsdPerMillion: 10
  },
  {
    provider: "anthropic",
    model: "claude-opus-4.5",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    inputUsdPerMillion: 15,
    outputUsdPerMillion: 75,
    cachedInputUsdPerMillion: 1.5,
    cacheCreationUsdPerMillion: 18.75,
    reasoningOutputUsdPerMillion: 75
  }
];

export const syntheticTranscriptEvents: TranscriptCloudEvent[] = [
  createTranscriptCloudEvent({
    id: "evt_synthetic_codex_001",
    sourceUri: "agent-worth://daemon/synthetic-client",
    time: "2026-06-03T09:00:00.000Z",
    employeeId: "emp_synthetic_ada",
    clientId: "client_synthetic_laptop",
    payload: {
      source: "codex",
      sourceSessionId: "codex_synthetic_001",
      sourcePathHash: "pathhash_codex_001",
      contentHash: "contenthash_codex_001",
      capturedAt: "2026-06-03T09:05:00.000Z",
      sourceMtimeMs: 1780487100000,
      rawFormat: "jsonl",
      raw: [
        { type: "session_meta", payload: { id: "codex_synthetic_001", model_provider: "openai" } },
        { type: "response_item", payload: { role: "user", content: "Write tests for the billing parser." } },
        { type: "response_item", payload: { role: "assistant", content: "Added parser fixture tests." } }
      ],
      messages: [
        {
          id: "codex-synthetic-1",
          role: "user",
          text: "Write tests for the billing parser.",
          createdAt: "2026-06-03T09:00:00.000Z"
        },
        {
          id: "codex-synthetic-2",
          role: "assistant",
          text: "Added parser fixture tests.",
          createdAt: "2026-06-03T09:04:00.000Z"
        }
      ],
      usage: {
        inputTokens: 12000,
        outputTokens: 2200,
        cachedInputTokens: 4000,
        cacheCreationInputTokens: 0,
        reasoningOutputTokens: 300,
        totalTokens: 18500
      },
      model: "gpt-5-codex",
      title: "Billing parser tests"
    }
  }),
  createTranscriptCloudEvent({
    id: "evt_synthetic_claude_001",
    sourceUri: "agent-worth://daemon/synthetic-client",
    time: "2026-06-03T11:00:00.000Z",
    employeeId: "emp_synthetic_grace",
    clientId: "client_synthetic_workstation",
    payload: {
      source: "claude-code",
      sourceSessionId: "claude_synthetic_001",
      sourcePathHash: "pathhash_claude_001",
      contentHash: "contenthash_claude_001",
      capturedAt: "2026-06-03T11:10:00.000Z",
      sourceMtimeMs: 1780491000000,
      rawFormat: "jsonl",
      raw: [
        { type: "user", sessionId: "claude_synthetic_001", message: { content: "Refactor the sync job lock." } },
        {
          type: "assistant",
          sessionId: "claude_synthetic_001",
          message: {
            model: "claude-opus-4.5",
            content: "Implemented a stale lock timeout.",
            usage: { input_tokens: 9000, output_tokens: 1800 }
          }
        }
      ],
      messages: [
        {
          id: "claude-synthetic-1",
          role: "user",
          text: "Refactor the sync job lock.",
          createdAt: "2026-06-03T11:00:00.000Z"
        },
        {
          id: "claude-synthetic-2",
          role: "assistant",
          text: "Implemented a stale lock timeout.",
          createdAt: "2026-06-03T11:08:00.000Z"
        }
      ],
      usage: {
        inputTokens: 9000,
        outputTokens: 1800,
        cachedInputTokens: 0,
        cacheCreationInputTokens: 0,
        reasoningOutputTokens: 0,
        totalTokens: 10800
      },
      model: "claude-opus-4.5",
      title: "Sync lock refactor"
    }
  })
];

