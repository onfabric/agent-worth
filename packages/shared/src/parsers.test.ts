import { describe, expect, test } from 'bun:test';
import { parseClaudeJsonl, parseCodexJsonl } from './parsers';

describe('native transcript parsers', () => {
  test('extracts Codex session metadata, messages, and token usage', () => {
    const parsed = parseCodexJsonl(
      [
        JSON.stringify({
          type: 'session_meta',
          timestamp: '2026-06-03T09:00:00.000Z',
          payload: { id: 'codex_session_1', model_provider: 'openai' },
        }),
        JSON.stringify({
          type: 'response_item',
          timestamp: '2026-06-03T09:01:00.000Z',
          payload: { role: 'user', content: 'Add parser tests.' },
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-06-03T09:02:00.000Z',
          payload: { info: { total_token_usage: { input_tokens: 1000, output_tokens: 200 } } },
        }),
      ].join('\n'),
    );

    expect(parsed.sourceSessionId).toBe('codex_session_1');
    expect(parsed.messages[0]?.text).toBe('Add parser tests.');
    expect(parsed.usage?.inputTokens).toBe(1000);
    expect(parsed.usage?.outputTokens).toBe(200);
  });

  test('keeps the latest Codex cumulative token usage', () => {
    const parsed = parseCodexJsonl(
      [
        JSON.stringify({
          type: 'event_msg',
          payload: { info: { total_token_usage: { input_tokens: 1000, output_tokens: 200 } } },
        }),
        JSON.stringify({
          type: 'event_msg',
          payload: { info: { total_token_usage: { input_tokens: 1200, output_tokens: 260 } } },
        }),
      ].join('\n'),
    );

    expect(parsed.usage?.inputTokens).toBe(1200);
    expect(parsed.usage?.outputTokens).toBe(260);
  });

  test('sums Codex incremental token usage when cumulative usage is missing', () => {
    const parsed = parseCodexJsonl(
      [
        JSON.stringify({
          type: 'event_msg',
          payload: { info: { last_token_usage: { input_tokens: 1000, output_tokens: 200 } } },
        }),
        JSON.stringify({
          type: 'event_msg',
          payload: { info: { last_token_usage: { input_tokens: 200, output_tokens: 60 } } },
        }),
      ].join('\n'),
    );

    expect(parsed.usage?.inputTokens).toBe(1200);
    expect(parsed.usage?.outputTokens).toBe(260);
  });

  test('extracts Claude session metadata, messages, model, and usage', () => {
    const parsed = parseClaudeJsonl(
      [
        JSON.stringify({
          type: 'user',
          sessionId: 'claude_session_1',
          timestamp: '2026-06-03T10:00:00.000Z',
          message: { content: 'Fix the state table.' },
        }),
        JSON.stringify({
          type: 'assistant',
          sessionId: 'claude_session_1',
          timestamp: '2026-06-03T10:02:00.000Z',
          message: {
            model: 'claude-opus-4.5',
            content: 'Fixed.',
            usage: { input_tokens: 800, output_tokens: 100, cache_read_input_tokens: 50 },
          },
        }),
      ].join('\n'),
    );

    expect(parsed.sourceSessionId).toBe('claude_session_1');
    expect(parsed.model).toBe('claude-opus-4.5');
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.usage?.cachedInputTokens).toBe(50);
  });
});
