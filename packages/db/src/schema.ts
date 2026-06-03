import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const sourceToolEnum = pgEnum("source_tool", ["codex", "claude-code", "claude-cowork"]);
export const rawFormatEnum = pgEnum("raw_format", ["jsonl", "json", "unknown"]);
export const usageStatusEnum = pgEnum("usage_status", ["native", "estimated", "missing"]);
export const outcomeStatusEnum = pgEnum("outcome_status", ["achieved", "partial", "not_achieved", "unknown"]);

export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  team: text("team"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const enrollmentTokens = pgTable("enrollment_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const daemonClients = pgTable(
  "daemon_clients",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    apiTokenHash: text("api_token_hash").notNull(),
    hostnameHash: text("hostname_hash"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true })
  },
  (table) => ({
    employeeIdx: index("daemon_clients_employee_idx").on(table.employeeId)
  })
);

export const rawArtifacts = pgTable(
  "raw_artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => daemonClients.id, { onDelete: "cascade" }),
    sourceTool: sourceToolEnum("source_tool").notNull(),
    sourceSessionId: text("source_session_id").notNull(),
    sourcePathHash: text("source_path_hash").notNull(),
    currentContentHash: text("current_content_hash").notNull(),
    rawFormat: rawFormatEnum("raw_format").notNull(),
    title: text("title"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    employeeIdx: index("raw_artifacts_employee_idx").on(table.employeeId),
    sourceUnique: uniqueIndex("raw_artifacts_source_unique").on(
      table.employeeId,
      table.sourceTool,
      table.sourceSessionId,
      table.sourcePathHash
    )
  })
);

export const artifactVersions = pgTable(
  "artifact_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => rawArtifacts.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    storageUri: text("storage_uri").notNull(),
    byteSize: integer("byte_size").notNull(),
    sourceMtimeMs: numeric("source_mtime_ms", { mode: "number" }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    artifactHashUnique: uniqueIndex("artifact_versions_artifact_hash_unique").on(table.artifactId, table.contentHash)
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => rawArtifacts.id, { onDelete: "cascade" }),
    artifactVersionId: uuid("artifact_version_id")
      .notNull()
      .references(() => artifactVersions.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    sourceTool: sourceToolEnum("source_tool").notNull(),
    sourceSessionId: text("source_session_id").notNull(),
    title: text("title"),
    model: text("model"),
    provider: text("provider"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    usageStatus: usageStatusEnum("usage_status").notNull().default("missing"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    employeeStartedIdx: index("sessions_employee_started_idx").on(table.employeeId, table.startedAt),
    artifactVersionUnique: uniqueIndex("sessions_artifact_version_unique").on(table.artifactVersionId)
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    sourceMessageId: text("source_message_id").notNull(),
    role: text("role").notNull(),
    text: text("text"),
    content: jsonb("content"),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true }),
    ordinal: integer("ordinal").notNull()
  },
  (table) => ({
    sessionOrdinalUnique: uniqueIndex("messages_session_ordinal_unique").on(table.sessionId, table.ordinal)
  })
);

export const tokenUsages = pgTable(
  "token_usages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    cacheCreationInputTokens: integer("cache_creation_input_tokens").notNull().default(0),
    reasoningOutputTokens: integer("reasoning_output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens"),
    nativePayload: jsonb("native_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    sessionUnique: uniqueIndex("token_usages_session_unique").on(table.sessionId)
  })
);

export const modelPrices = pgTable(
  "model_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    inputUsdPerMillion: numeric("input_usd_per_million", { mode: "number" }).notNull(),
    outputUsdPerMillion: numeric("output_usd_per_million", { mode: "number" }).notNull(),
    cachedInputUsdPerMillion: numeric("cached_input_usd_per_million", { mode: "number" }).notNull().default(0),
    cacheCreationUsdPerMillion: numeric("cache_creation_usd_per_million", { mode: "number" }).notNull().default(0),
    reasoningOutputUsdPerMillion: numeric("reasoning_output_usd_per_million", { mode: "number" }).notNull().default(0),
    isSynthetic: boolean("is_synthetic").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    modelEffectiveUnique: uniqueIndex("model_prices_model_effective_unique").on(
      table.provider,
      table.model,
      table.effectiveFrom
    )
  })
);

export const sessionCosts = pgTable(
  "session_costs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    modelPriceId: uuid("model_price_id").references(() => modelPrices.id, { onDelete: "set null" }),
    inputUsd: numeric("input_usd", { mode: "number" }).notNull().default(0),
    outputUsd: numeric("output_usd", { mode: "number" }).notNull().default(0),
    cachedInputUsd: numeric("cached_input_usd", { mode: "number" }).notNull().default(0),
    cacheCreationUsd: numeric("cache_creation_usd", { mode: "number" }).notNull().default(0),
    reasoningOutputUsd: numeric("reasoning_output_usd", { mode: "number" }).notNull().default(0),
    totalUsd: numeric("total_usd", { mode: "number" }).notNull().default(0),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    sessionUnique: uniqueIndex("session_costs_session_unique").on(table.sessionId)
  })
);

export const evaluations = pgTable(
  "evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    goalSummary: text("goal_summary"),
    outcomeStatus: outcomeStatusEnum("outcome_status"),
    proficiencyScore: numeric("proficiency_score", { mode: "number" }),
    evaluatorModel: text("evaluator_model"),
    promptVersion: text("prompt_version"),
    confidence: numeric("confidence", { mode: "number" }),
    isManual: boolean("is_manual").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    sessionUnique: uniqueIndex("evaluations_session_unique").on(table.sessionId),
    proficiencyCheck: check(
      "evaluations_proficiency_score_check",
      sql`${table.proficiencyScore} is null or (${table.proficiencyScore} >= 0 and ${table.proficiencyScore} <= 1)`
    )
  })
);

export const employeeRelations = relations(employees, ({ many }) => ({
  clients: many(daemonClients),
  sessions: many(sessions)
}));

export const sessionRelations = relations(sessions, ({ one, many }) => ({
  employee: one(employees, {
    fields: [sessions.employeeId],
    references: [employees.id]
  }),
  artifact: one(rawArtifacts, {
    fields: [sessions.artifactId],
    references: [rawArtifacts.id]
  }),
  messages: many(messages),
  usage: one(tokenUsages),
  cost: one(sessionCosts),
  evaluation: one(evaluations)
}));
