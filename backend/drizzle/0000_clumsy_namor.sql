-- pgvector must exist before the policy_chunks.embedding vector(1536) column.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('USER', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."decision" AS ENUM('APPROVED', 'DENIED', 'ESCALATED');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."policy_source_type" AS ENUM('pdf', 'markdown', 'text');--> statement-breakpoint
CREATE TYPE "public"."policy_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."refund_reason" AS ENUM('damaged', 'incorrect_item', 'changed_mind', 'other');--> statement-breakpoint
CREATE TYPE "public"."refund_request_status" AS ENUM('SUBMITTED', 'DECIDED');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('NONE', 'REQUESTED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('CUSTOMER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_type" "actor_type" DEFAULT 'SYSTEM' NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"tier" text DEFAULT 'standard' NOT NULL,
	"lifetime_value_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"order_number" text NOT NULL,
	"status" "order_status" DEFAULT 'DELIVERED' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"total_amount_cents" integer NOT NULL,
	"is_final_sale" boolean DEFAULT false NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL,
	"refund_status" "refund_status" DEFAULT 'NONE' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "policy_status" DEFAULT 'INACTIVE' NOT NULL,
	"source_type" "policy_source_type" NOT NULL,
	"original_filename" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"policy_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"order_id" text NOT NULL,
	"message" text NOT NULL,
	"reason" "refund_reason" NOT NULL,
	"requested_amount_cents" integer,
	"decision" "decision" NOT NULL,
	"decision_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "refund_request_status" DEFAULT 'DECIDED' NOT NULL,
	"ai_extraction" jsonb,
	"injection_detected" boolean DEFAULT false NOT NULL,
	"policy_id" text,
	"policy_version" integer,
	"retrieved_context" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "role" DEFAULT 'CUSTOMER' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_chunks" ADD CONSTRAINT "policy_chunks_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "accounts_provider_account_idx" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "customers_user_id_idx" ON "customers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "policies_status_idx" ON "policies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "policy_chunks_policy_id_idx" ON "policy_chunks" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "policy_chunks_policy_chunk_idx" ON "policy_chunks" USING btree ("policy_id","chunk_index");--> statement-breakpoint
CREATE INDEX "refund_requests_customer_id_idx" ON "refund_requests" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "refund_requests_order_id_idx" ON "refund_requests" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "refund_requests_created_at_idx" ON "refund_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");