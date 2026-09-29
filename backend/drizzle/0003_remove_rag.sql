-- RAG and policy upload were removed; the refund policy lives in code
-- (refund-policy.service.ts) and seed/policies/refund-policy.md is the written spec.
DROP TABLE "policy_chunks" CASCADE;--> statement-breakpoint
DROP TABLE "policies" CASCADE;--> statement-breakpoint
ALTER TABLE "refund_requests" DROP COLUMN "policy_id";--> statement-breakpoint
ALTER TABLE "refund_requests" DROP COLUMN "policy_version";--> statement-breakpoint
ALTER TABLE "refund_requests" DROP COLUMN "retrieved_context";--> statement-breakpoint
DROP TYPE "public"."policy_source_type";--> statement-breakpoint
DROP TYPE "public"."policy_status";--> statement-breakpoint
DROP EXTENSION IF EXISTS vector;
