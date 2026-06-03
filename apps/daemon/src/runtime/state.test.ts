import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SyncState } from "./state";

describe("sync state", () => {
  test("tracks hashes without storing transcript bodies", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-worth-state-"));
    const state = new SyncState(join(dir, "state.sqlite"));

    state.markSynced({
      source: "codex",
      pathHash: "path-hash",
      sourceSessionId: "session-1",
      size: 123,
      mtimeMs: 456,
      contentHash: "content-hash",
      syncedAt: "2026-06-03T00:00:00.000Z"
    });

    const record = state.get("path-hash");
    expect(record?.contentHash).toBe("content-hash");
    expect(JSON.stringify(record)).not.toContain("user prompt body");
    expect(state.stats().trackedFiles).toBe(1);
  });
});

