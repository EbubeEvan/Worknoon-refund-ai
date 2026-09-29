import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Roles                                                                       */
/* -------------------------------------------------------------------------- */

export const roleEnum = pgEnum("role", ["CUSTOMER", "ADMIN"]);

/* -------------------------------------------------------------------------- */
/* Better Auth tables                                                          */
/*                                                                             */
/* JS property names are camelCase (that is what Better Auth looks up);        */
/* SQL column names are snake_case (drizzle-kit's default). Drizzle maps       */
/* between them, so the adapter resolves fields by JS key.                      */
/* -------------------------------------------------------------------------- */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: roleEnum("role").notNull().default("CUSTOMER"),
  banned: boolean("banned").notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    /** Required by Better Auth's admin() plugin for user impersonation. */
    impersonatedBy: text("impersonated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("accounts_user_id_idx").on(t.userId),
    index("accounts_provider_account_idx").on(t.providerId, t.accountId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

/* -------------------------------------------------------------------------- */
/* Domain enums                                                                */
/* -------------------------------------------------------------------------- */

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export const refundStatusEnum = pgEnum("refund_status", [
  "NONE",
  "REQUESTED",
  "REFUNDED",
]);

export const refundReasonEnum = pgEnum("refund_reason", [
  "damaged",
  "incorrect_item",
  "changed_mind",
  "other",
]);

/** The only three outcomes the system can produce. */
export const decisionEnum = pgEnum("decision", ["APPROVED", "DENIED", "ESCALATED"]);

export const refundRequestStatusEnum = pgEnum("refund_request_status", [
  "SUBMITTED",
  "DECIDED",
]);

export const policyStatusEnum = pgEnum("policy_status", ["ACTIVE", "INACTIVE"]);

export const policySourceTypeEnum = pgEnum("policy_source_type", [
  "pdf",
  "markdown",
  "text",
]);

export const actorTypeEnum = pgEnum("actor_type", ["USER", "SYSTEM"]);

/* -------------------------------------------------------------------------- */
/* Domain tables                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A shopper. `userId` is the auth identity; a customer record is only created
 * for accounts that actually shop. Ownership is always derived from the
 * session -> user -> customerId chain, never from client input.
 */
export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    tier: text("tier").notNull().default("standard"),
    lifetimeValueCents: integer("lifetime_value_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customers_user_id_idx").on(t.userId)],
);

/**
 * Money is stored as integer minor units (cents) throughout.
 * Floating point currency is a correctness bug waiting to happen.
 */
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    orderNumber: text("order_number").notNull().unique(),
    status: orderStatusEnum("status").notNull().default("DELIVERED"),
    currency: text("currency").notNull().default("USD"),
    totalAmountCents: integer("total_amount_cents").notNull(),
    isFinalSale: boolean("is_final_sale").notNull().default(false),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull(),
    refundStatus: refundStatusEnum("refund_status").notNull().default("NONE"),
    items: jsonb("items").notNull().default([]).$type<OrderItem[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_customer_id_idx").on(t.customerId),
    index("orders_order_number_idx").on(t.orderNumber),
  ],
);

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitAmountCents: number;
  finalSale?: boolean;
}

export const refundRequests = pgTable(
  "refund_requests",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** Raw, untrusted customer message. */
    message: text("message").notNull(),
    reason: refundReasonEnum("reason").notNull(),
    requestedAmountCents: integer("requested_amount_cents"),
    /**
     * What was actually approved, which is frequently the order total rather
     * than the amount the customer asked for. Kept separate from
     * `requested_amount_cents` so the two are never conflated in reporting.
     */
    approvedAmountCents: integer("approved_amount_cents"),
    decision: decisionEnum("decision").notNull(),
    /** Human-readable rule codes that explain the decision, e.g. "FINAL_SALE". */
    decisionReasons: jsonb("decision_reasons").notNull().$type<string[]>().default([]),
    status: refundRequestStatusEnum("status").notNull().default("DECIDED"),
    /** What the AI extracted, before the engine decided. Kept for the audit trail. */
    aiExtraction: jsonb("ai_extraction").$type<Record<string, unknown>>(),
    /** Deterministic pre-check result on the raw message, before the LLM saw it. */
    injectionDetected: boolean("injection_detected").notNull().default(false),
    /** Which policy version supplied retrieval context for the explanation. */
    policyId: text("policy_id"),
    policyVersion: integer("policy_version"),
    /** Snapshot of the chunks retrieved, so history stays explainable after reindex. */
    retrievedContext: jsonb("retrieved_context")
      .$type<Array<{ policyId: string; policyName: string; chunkIndex: number; content: string }>>()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("refund_requests_customer_id_idx").on(t.customerId),
    index("refund_requests_order_id_idx").on(t.orderId),
    index("refund_requests_created_at_idx").on(t.createdAt),
  ],
);

/**
 * Policy metadata + the extracted text of the uploaded document.
 *
 * The binary is never stored. `content` is the application's persisted,
 * normalized representation of the document, which is also what makes
 * reindexing possible without the original file.
 */
export const policies = pgTable(
  "policies",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    version: integer("version").notNull().default(1),
    status: policyStatusEnum("status").notNull().default("INACTIVE"),
    sourceType: policySourceTypeEnum("source_type").notNull(),
    originalFilename: text("original_filename").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("policies_status_idx").on(t.status)],
);

/**
 * Chunked + embedded policy text. CASCADE means deleting a policy cleans up its
 * chunks in the database, not just in application code.
 *
 * No vector index on purpose: a policy corpus is tens to low hundreds of chunks,
 * where a sequential scan beats an approximate index. Revisit if this grows.
 */
export const policyChunks = pgTable(
  "policy_chunks",
  {
    id: text("id").primaryKey(),
    policyId: text("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("policy_chunks_policy_id_idx").on(t.policyId),
    index("policy_chunks_policy_chunk_idx").on(t.policyId, t.chunkIndex),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id"),
    actorType: actorTypeEnum("actor_type").notNull().default("SYSTEM"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_created_at_idx").on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Relations                                                                   */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  customers: many(customers),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
  orders: many(orders),
  refundRequests: many(refundRequests),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  refundRequests: many(refundRequests),
}));

export const refundRequestsRelations = relations(refundRequests, ({ one }) => ({
  customer: one(customers, {
    fields: [refundRequests.customerId],
    references: [customers.id],
  }),
  order: one(orders, { fields: [refundRequests.orderId], references: [orders.id] }),
}));

export const policiesRelations = relations(policies, ({ many }) => ({
  chunks: many(policyChunks),
}));

export const policyChunksRelations = relations(policyChunks, ({ one }) => ({
  policy: one(policies, { fields: [policyChunks.policyId], references: [policies.id] }),
}));
