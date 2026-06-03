import type { DaemonContext } from './context';
import type { LocalTranscript } from './sources';
import { scanTranscripts } from './sources';

type SyncOptions = {
  dryRun?: boolean;
  force?: boolean;
  cron?: string;
  scheduledTime?: number;
};

const DEFAULT_MAX_INGEST_BATCH_BYTES = 16 * 1024 * 1024;
const maxIngestBatchBytes = Math.max(
  1024,
  Number(Bun.env.AGENT_WORTH_INGEST_BATCH_BYTES ?? DEFAULT_MAX_INGEST_BATCH_BYTES),
);
const encoder = new TextEncoder();

type IngestBatch = {
  transcripts: LocalTranscript[];
  body: string;
  byteSize: number;
};

export function createIngestBatches(
  transcripts: LocalTranscript[],
  maxBytes = maxIngestBatchBytes,
): IngestBatch[] {
  const batches: IngestBatch[] = [];
  let currentTranscripts: LocalTranscript[] = [];
  let currentEvents: string[] = [];
  let currentBytes = 2;

  function flush() {
    if (currentTranscripts.length === 0) return;
    batches.push({
      transcripts: currentTranscripts,
      body: `[${currentEvents.join(',')}]`,
      byteSize: currentBytes,
    });
    currentTranscripts = [];
    currentEvents = [];
    currentBytes = 2;
  }

  for (const transcript of transcripts) {
    const event = JSON.stringify(transcript.event);
    const eventBytes = encoder.encode(event).byteLength;
    const additionalBytes = currentEvents.length === 0 ? eventBytes : eventBytes + 1;

    if (currentEvents.length > 0 && currentBytes + additionalBytes > maxBytes) {
      flush();
    }

    currentTranscripts.push(transcript);
    currentEvents.push(event);
    currentBytes += currentEvents.length === 1 ? eventBytes : eventBytes + 1;
  }

  flush();
  return batches;
}

export async function syncOnce(
  context: DaemonContext,
  options: SyncOptions = {},
): Promise<{
  scanned: number;
  changed: number;
  synced: number;
}> {
  const config = await context.config.read();
  const lock = Bun.file(`${context.config.dir}/sync.lock`);

  if (await lock.exists()) {
    const ageMs =
      Date.now() -
      (await lock
        .text()
        .then((value) => Number(value))
        .catch(() => 0));
    if (ageMs < 4 * 60 * 1000) {
      return { scanned: 0, changed: 0, synced: 0 };
    }
  }

  await Bun.write(lock, String(Date.now()));

  try {
    const transcripts = await scanTranscripts({
      employeeId: config.employeeId,
      clientId: config.clientId,
    });
    const changed = options.force
      ? transcripts
      : transcripts.filter((transcript) => {
          const previous = context.state.get(transcript.pathHash);
          return previous?.contentHash !== transcript.contentHash;
        });

    if (options.dryRun) {
      return {
        scanned: transcripts.length,
        changed: changed.length,
        synced: 0,
      };
    }

    if (!config.serverUrl || !config.apiToken || !config.employeeId) {
      throw new Error(
        'daemon is not enrolled; run `agent-worth enroll --server <url> --token <token>` first',
      );
    }

    const batches = createIngestBatches(changed);
    for (const [index, batch] of batches.entries()) {
      const response = await fetch(new URL('/v1/ingest/batch', config.serverUrl), {
        method: 'POST',
        headers: {
          'content-type': 'application/cloudevents-batch+json',
          authorization: `Bearer ${config.apiToken}`,
        },
        body: batch.body,
      });

      if (!response.ok) {
        throw new Error(
          `sync failed: ${response.status} ${await response.text()} (batch ${index + 1}/${batches.length}, ${batch.transcripts.length} files, ${batch.byteSize} bytes)`,
        );
      }
    }

    const syncedAt = new Date(options.scheduledTime ?? Date.now()).toISOString();
    for (const transcript of changed) {
      context.state.markSynced({
        source: transcript.source,
        pathHash: transcript.pathHash,
        sourceSessionId: transcript.sourceSessionId,
        size: transcript.size,
        mtimeMs: transcript.mtimeMs,
        contentHash: transcript.contentHash,
        remoteVersion: transcript.contentHash,
        syncedAt,
      });
    }

    return {
      scanned: transcripts.length,
      changed: changed.length,
      synced: changed.length,
    };
  } finally {
    await lock.delete().catch(() => undefined);
  }
}
