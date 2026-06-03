import { describe, expect, test } from 'bun:test';
import { syntheticTranscriptEvents } from '@agent-worth/shared';
import { createApp } from './app';
import { createMemoryRepository } from './repository';

describe('Agent Worth API', () => {
  test('enrolls a daemon client with the development token', async () => {
    const app = createApp(createMemoryRepository({ seed: false }));
    const response = await app.handle(
      new Request('http://localhost/v1/enroll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          enrollmentToken: 'dev-enroll-token',
          clientId: 'client_test',
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { clientId: string; apiToken: string };
    expect(body.clientId).toBe('client_test');
    expect(body.apiToken.startsWith('awt_')).toBe(true);
  });

  test('ingests CloudEvents idempotently', async () => {
    const app = createApp(createMemoryRepository({ seed: false }));
    const request = () =>
      new Request('http://localhost/v1/ingest/batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer synthetic' },
        body: JSON.stringify([syntheticTranscriptEvents[0]]),
      });

    const first = await app.handle(request());
    const second = await app.handle(request());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await first.json()).createdVersions).toBe(1);
    expect((await second.json()).skippedUnchanged).toBe(1);
  });

  test('returns session and cost summaries', async () => {
    const app = createApp(createMemoryRepository());
    const sessions = await app.handle(new Request('http://localhost/v1/sessions'));
    const costs = await app.handle(new Request('http://localhost/v1/costs'));

    expect(sessions.status).toBe(200);
    expect(costs.status).toBe(200);
    expect(((await sessions.json()) as unknown[]).length).toBeGreaterThan(0);
    expect(((await costs.json()) as { totalUsd: number }).totalUsd).toBeGreaterThan(0);
  });
});
