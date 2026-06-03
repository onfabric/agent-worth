CREATE TYPE "public"."outcome_status" AS ENUM('achieved', 'partial', 'not_achieved', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."raw_format" AS ENUM('jsonl', 'json', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."source_tool" AS ENUM('codex', 'claude-code', 'claude-cowork');--> statement-breakpoint
CREATE TYPE "public"."usage_status" AS ENUM('native', 'estimated', 'missing');--> statement-breakpoint
CREATE TABLE "artifact_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"storage_uri" text NOT NULL,
	"byte_size" integer NOT NULL,
	"source_mtime_ms" numeric NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daemon_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"api_token_hash" text NOT NULL,
	"hostname_hash" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"team" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollment_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"expires_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"goal_summary" text,
	"outcome_status" "outcome_status",
	"proficiency_score" numeric,
	"evaluator_model" text,
	"prompt_version" text,
	"confidence" numeric,
	"is_manual" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluations_proficiency_score_check" CHECK ("evaluations"."proficiency_score" is null or ("evaluations"."proficiency_score" >= 0 and "evaluations"."proficiency_score" <= 1))
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"source_message_id" text NOT NULL,
	"role" text NOT NULL,
	"text" text,
	"content" jsonb,
	"model" text,
	"created_at" timestamp with time zone,
	"ordinal" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"input_usd_per_million" numeric NOT NULL,
	"output_usd_per_million" numeric NOT NULL,
	"cached_input_usd_per_million" numeric DEFAULT 0 NOT NULL,
	"cache_creation_usd_per_million" numeric DEFAULT 0 NOT NULL,
	"reasoning_output_usd_per_million" numeric DEFAULT 0 NOT NULL,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"client_id" text NOT NULL,
	"source_tool" "source_tool" NOT NULL,
	"source_session_id" text NOT NULL,
	"source_path_hash" text NOT NULL,
	"current_content_hash" text NOT NULL,
	"raw_format" "raw_format" NOT NULL,
	"title" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"model_price_id" uuid,
	"input_usd" numeric DEFAULT 0 NOT NULL,
	"output_usd" numeric DEFAULT 0 NOT NULL,
	"cached_input_usd" numeric DEFAULT 0 NOT NULL,
	"cache_creation_usd" numeric DEFAULT 0 NOT NULL,
	"reasoning_output_usd" numeric DEFAULT 0 NOT NULL,
	"total_usd" numeric DEFAULT 0 NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"artifact_version_id" uuid NOT NULL,
	"employee_id" text NOT NULL,
	"source_tool" "source_tool" NOT NULL,
	"source_session_id" text NOT NULL,
	"title" text,
	"model" text,
	"provider" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"usage_status" "usage_status" DEFAULT 'missing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cached_input_tokens" integer DEFAULT 0 NOT NULL,
	"cache_creation_input_tokens" integer DEFAULT 0 NOT NULL,
	"reasoning_output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer,
	"native_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_artifact_id_raw_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."raw_artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daemon_clients" ADD CONSTRAINT "daemon_clients_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_tokens" ADD CONSTRAINT "enrollment_tokens_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_artifacts" ADD CONSTRAINT "raw_artifacts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_artifacts" ADD CONSTRAINT "raw_artifacts_client_id_daemon_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."daemon_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_costs" ADD CONSTRAINT "session_costs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_costs" ADD CONSTRAINT "session_costs_model_price_id_model_prices_id_fk" FOREIGN KEY ("model_price_id") REFERENCES "public"."model_prices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_artifact_id_raw_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."raw_artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_artifact_version_id_artifact_versions_id_fk" FOREIGN KEY ("artifact_version_id") REFERENCES "public"."artifact_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usages" ADD CONSTRAINT "token_usages_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_versions_artifact_hash_unique" ON "artifact_versions" USING btree ("artifact_id","content_hash");--> statement-breakpoint
CREATE INDEX "daemon_clients_employee_idx" ON "daemon_clients" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evaluations_session_unique" ON "evaluations" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_session_ordinal_unique" ON "messages" USING btree ("session_id","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "model_prices_model_effective_unique" ON "model_prices" USING btree ("provider","model","effective_from");--> statement-breakpoint
CREATE INDEX "raw_artifacts_employee_idx" ON "raw_artifacts" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_artifacts_source_unique" ON "raw_artifacts" USING btree ("employee_id","source_tool","source_session_id","source_path_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "session_costs_session_unique" ON "session_costs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessions_employee_started_idx" ON "sessions" USING btree ("employee_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_artifact_version_unique" ON "sessions" USING btree ("artifact_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "token_usages_session_unique" ON "token_usages" USING btree ("session_id");