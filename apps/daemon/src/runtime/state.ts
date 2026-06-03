import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type SyncedFileRecord = {
  source: string;
  pathHash: string;
  sourceSessionId: string;
  size: number;
  mtimeMs: number;
  contentHash: string;
  remoteVersion?: string;
  syncedAt?: string;
};

export class SyncState {
  private readonly db: Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path, { create: true });
    this.db.exec(`
      create table if not exists synced_files (
        path_hash text primary key,
        source text not null,
        source_session_id text not null,
        size integer not null,
        mtime_ms real not null,
        content_hash text not null,
        remote_version text,
        synced_at text
      )
    `);
  }

  get(pathHash: string): SyncedFileRecord | undefined {
    return this.db
      .query(
        `select
          source,
          path_hash as pathHash,
          source_session_id as sourceSessionId,
          size,
          mtime_ms as mtimeMs,
          content_hash as contentHash,
          remote_version as remoteVersion,
          synced_at as syncedAt
        from synced_files
        where path_hash = ?`
      )
      .get(pathHash) as SyncedFileRecord | undefined;
  }

  markSynced(record: SyncedFileRecord): void {
    this.db
      .query(
        `insert into synced_files (
          path_hash,
          source,
          source_session_id,
          size,
          mtime_ms,
          content_hash,
          remote_version,
          synced_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(path_hash) do update set
          source = excluded.source,
          source_session_id = excluded.source_session_id,
          size = excluded.size,
          mtime_ms = excluded.mtime_ms,
          content_hash = excluded.content_hash,
          remote_version = excluded.remote_version,
          synced_at = excluded.synced_at`
      )
      .run(
        record.pathHash,
        record.source,
        record.sourceSessionId,
        record.size,
        record.mtimeMs,
        record.contentHash,
        record.remoteVersion ?? null,
        record.syncedAt ?? new Date().toISOString()
      );
  }

  stats(): { trackedFiles: number; lastSyncedAt?: string | undefined } {
    const row = this.db
      .query("select count(*) as trackedFiles, max(synced_at) as lastSyncedAt from synced_files")
      .get() as { trackedFiles: number; lastSyncedAt?: string | null };

    return {
      trackedFiles: row.trackedFiles,
      lastSyncedAt: row.lastSyncedAt ?? undefined
    };
  }
}
