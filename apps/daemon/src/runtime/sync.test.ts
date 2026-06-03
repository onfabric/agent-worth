import { describe, expect, test } from 'bun:test';
import { syntheticTranscriptEvents } from '@agent-worth/shared';
import type { LocalTranscript } from './sources';
import { createIngestBatches } from './sync';

function transcript(index: number): LocalTranscript {
  return {
    event: syntheticTranscriptEvents[index % syntheticTranscriptEvents.length],
  } as LocalTranscript;
}

describe('sync batching', () => {
  test('splits changed transcripts into request-sized ingest batches', () => {
    const transcripts = [transcript(0), transcript(1), transcript(0)];
    const firstEventBytes = new TextEncoder().encode(
      JSON.stringify(transcripts[0]?.event),
    ).byteLength;
    const batches = createIngestBatches(transcripts, firstEventBytes + 4);

    expect(batches).toHaveLength(3);
    expect(JSON.parse(batches[0]?.body ?? '[]')).toHaveLength(1);
    expect(JSON.parse(batches[1]?.body ?? '[]')).toHaveLength(1);
    expect(JSON.parse(batches[2]?.body ?? '[]')).toHaveLength(1);
  });
});
