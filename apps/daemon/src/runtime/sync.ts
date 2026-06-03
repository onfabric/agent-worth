import type { DaemonContext } from './context';
import { scanTranscripts } from './sources';

type SyncOptions = {
  dryRun?: boolean;
  cron?: string;
  scheduledTime?: number;
};

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
    const changed = transcripts.filter((transcript) => {
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

    if (changed.length > 0) {
      const response = await fetch(new URL('/v1/ingest/batch', config.serverUrl), {
        method: 'POST',
        headers: {
          'content-type': 'application/cloudevents-batch+json',
          authorization: `Bearer ${config.apiToken}`,
        },
        body: JSON.stringify(changed.map((transcript) => transcript.event)),
      });

      if (!response.ok) {
        throw new Error(`sync failed: ${response.status} ${await response.text()}`);
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
