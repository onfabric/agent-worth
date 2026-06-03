import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { createTranscriptCloudEvent, parsedToPayload, parseClaudeJsonl, parseCodexJsonl } from "@agent-worth/shared";
import type { SourceTool, TranscriptCloudEvent } from "@agent-worth/shared";
import { sha256Hex } from "./hash";

export type LocalTranscript = {
  source: SourceTool;
  path: string;
  pathHash: string;
  contentHash: string;
  sourceSessionId: string;
  size: number;
  mtimeMs: number;
  event: TranscriptCloudEvent;
};

const DEFAULT_SOURCES: Array<{ source: SourceTool; root: string; extension: string }> = [
  { source: "codex", root: join(homedir(), ".codex", "sessions"), extension: ".jsonl" },
  { source: "claude-code", root: join(homedir(), ".claude", "projects"), extension: ".jsonl" },
  {
    source: "claude-cowork",
    root: join(homedir(), ".codex", "claude-cowork-transcript-imports"),
    extension: ".jsonl"
  }
];

async function* walkFiles(root: string, extension: string): AsyncGenerator<string> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) {
        yield* walkFiles(path, extension);
      } else if (entry.isFile() && path.endsWith(extension)) {
        yield path;
      }
    }
  } catch (error) {
    if ((error as { code?: string }).code !== "ENOENT") throw error;
  }
}

function parseBySource(source: SourceTool, contents: string) {
  if (source === "codex") return parseCodexJsonl(contents);
  const parsed = parseClaudeJsonl(contents);
  return source === "claude-cowork" ? { ...parsed, source } : parsed;
}

export async function scanTranscripts(input?: {
  roots?: Array<{ source: SourceTool; root: string; extension?: string | undefined }> | undefined;
  employeeId?: string | undefined;
  clientId?: string | undefined;
}): Promise<LocalTranscript[]> {
  const roots = input?.roots ?? DEFAULT_SOURCES;
  const transcripts: LocalTranscript[] = [];

  for (const sourceRoot of roots) {
    for await (const path of walkFiles(sourceRoot.root, sourceRoot.extension ?? ".jsonl")) {
      const file = Bun.file(path);
      const [contents, fileStat] = await Promise.all([file.text(), stat(path)]);
      const parsed = parseBySource(sourceRoot.source, contents);
      const pathHash = await sha256Hex(path);
      const contentHash = await sha256Hex(contents);
      const capturedAt = new Date().toISOString();
      const payload = parsedToPayload({
        parsed,
        sourcePathHash: pathHash,
        contentHash,
        capturedAt,
        sourceMtimeMs: fileStat.mtimeMs
      });

      transcripts.push({
        source: sourceRoot.source,
        path,
        pathHash,
        contentHash,
        sourceSessionId: parsed.sourceSessionId,
        size: fileStat.size,
        mtimeMs: fileStat.mtimeMs,
        event: createTranscriptCloudEvent({
          id: `evt_${contentHash}`,
          sourceUri: `agent-worth://daemon/${input?.clientId ?? "unenrolled"}`,
          time: capturedAt,
          payload,
          employeeId: input?.employeeId,
          clientId: input?.clientId
        })
      });
    }
  }

  return transcripts;
}
