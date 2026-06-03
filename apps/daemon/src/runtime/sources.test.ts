import { describe, expect, test } from 'bun:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanTranscripts } from './sources';

describe('source adapters', () => {
  test('scans synthetic Codex JSONL and produces CloudEvents', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agent-worth-codex-'));
    const path = join(dir, 'session.jsonl');
    await Bun.write(
      path,
      [
        JSON.stringify({
          type: 'session_meta',
          payload: { id: 'session-1', model_provider: 'openai' },
        }),
        JSON.stringify({
          type: 'response_item',
          payload: { role: 'user', content: 'synthetic prompt' },
        }),
      ].join('\n'),
    );

    const transcripts = await scanTranscripts({
      employeeId: 'emp_test',
      clientId: 'client_test',
      roots: [{ source: 'codex', root: dir }],
    });

    expect(transcripts).toHaveLength(1);
    expect(transcripts[0]?.event.specversion).toBe('1.0');
    expect(transcripts[0]?.event.data.sourceSessionId).toBe('session-1');
    expect(transcripts[0]?.event.data.raw).toBeArray();
  });
});
