/**
 * Typed API client.
 *
 * Every request carries credentials so the Better Auth session cookie travels
 * with it, and every non-2xx response is turned into a typed `ApiError` rather
 * than a bare object, so UI code can branch on `status` without stringly-typed
 * guessing.
 */

const BASE = "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isAuth(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {
    accept: "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };

  let body = init.body;
  if (init.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(init.json);
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    body,
    headers,
    // The session cookie is the entire auth story.
    credentials: "include",
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const payload = text ? safeJson(text) : null;

  if (!res.ok) {
    const err = payload as { error?: { code?: string; message?: string; details?: unknown } };
    throw new ApiError(
      res.status,
      err?.error?.code ?? "UNKNOWN",
      err?.error?.message ?? `Request failed with status ${res.status}`,
      err?.error?.details,
    );
  }

  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, json?: unknown) => request<T>(path, { method: "POST", json }),
  patch: <T>(path: string, json?: unknown) => request<T>(path, { method: "PATCH", json }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  /** Multipart upload, for policy documents. */
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};

/* -------------------------------------------------------------------------- */
/* Response shapes, mirroring the backend controllers                          */
/* -------------------------------------------------------------------------- */

export type Decision = "APPROVED" | "DENIED" | "ESCALATED";
export type OrderStatus = "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type RefundStatus = "NONE" | "REQUESTED" | "REFUNDED";

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitAmountCents: number;
  finalSale?: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  totalAmountCents: number;
  isFinalSale: boolean;
  purchasedAt: string;
  refundStatus: RefundStatus;
  items: OrderItem[];
}

export interface OrderWithCustomer extends Order {
  customerName: string;
  customerEmail: string;
}

export interface RetrievedContext {
  policyId: string;
  policyName: string;
  chunkIndex: number;
  content: string;
}

export interface RefundRequestResult {
  requestId: string | null;
  decision: Decision;
  rules: string[];
  requiresHumanReview: boolean;
  approvedAmountCents: number | null;
  summary: string;
  reply: { text: string; source: "gemini" | "deterministic"; degradedReason: string | null };
  explain: {
    extraction: {
      source: "gemini" | "fallback";
      orderNumber: string | null;
      reason: string;
      requestedAmountCents: number | null;
      degradedReason: string | null;
    };
    retrievedContext: RetrievedContext[];
    retrievalDegraded: boolean;
  };
}

export interface RefundRequest {
  id: string;
  customerId: string;
  orderId: string;
  message: string;
  reason: string;
  requestedAmountCents: number | null;
  approvedAmountCents: number | null;
  decision: Decision;
  decisionReasons: string[];
  status: "SUBMITTED" | "DECIDED";
  injectionDetected: boolean;
  policyId: string | null;
  policyVersion: number | null;
  retrievedContext: RetrievedContext[];
  orderNumber: string;
  orderTotalCents: number;
  items: OrderItem[];
  createdAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  tier: string;
  lifetimeValueCents: number;
}

export interface CustomerWithStats extends Customer {
  orderCount: number;
  totalSpendCents: number;
  refundedCents: number;
}

export interface Policy {
  id: string;
  name: string;
  version: number;
  status: "ACTIVE" | "INACTIVE";
  sourceType: "pdf" | "markdown" | "text";
  originalFilename: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyChunk {
  id: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
}

export interface AuditEvent {
  id: string;
  actorId: string | null;
  actorType: "USER" | "SYSTEM";
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardData {
  refunds: {
    total: number;
    approvedAmountCents: number;
    degradedCount: number;
    injectionCount: number;
    byDecision: Array<{ decision: Decision; count: number }>;
  };
  audit: {
    totalEvents: number;
    byAction: Array<{ action: string; count: number }>;
    byActorType: Array<{ actorType: string; count: number }>;
  };
  recent: RefundRequest[];
  escalations: RefundRequest[];
}

/* -------------------------------------------------------------------------- */
/* Endpoint wrappers                                                            */
/* -------------------------------------------------------------------------- */

export const endpoints = {
  session: () => api.get<{ user: SessionUser; session: unknown } | null>("/auth/get-session"),
  orders: () => api.get<{ orders: Order[] }>("/orders"),
  profile: () =>
    api.get<{ customer: Customer; orders: Order[]; refunds: RefundRequest[] }>("/customers/me"),
  submitRefund: (message: string) =>
    api.post<RefundRequestResult>("/refunds/requests", { message }),
  refundRequests: () => api.get<{ requests: RefundRequest[] }>("/refunds/requests"),

  dashboard: () => api.get<DashboardData>("/admin/dashboard"),
  escalations: () => api.get<{ requests: RefundRequest[] }>("/admin/escalations"),
  resolveEscalation: (id: string, resolve: "APPROVE" | "DENY", note?: string) =>
    api.post<{ ok: boolean; approvedAmountCents: number | null }>(
      `/admin/escalations/${id}/resolve`,
      { resolve, note },
    ),
  customers: () => api.get<{ customers: CustomerWithStats[] }>("/admin/customers"),
  adminOrders: () => api.get<{ orders: OrderWithCustomer[] }>("/admin/orders"),
  audit: (params?: { limit?: number; action?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.action) qs.set("action", params.action);
    const suffix = qs.toString();
    return api.get<{ events: AuditEvent[]; total: number }>(
      `/admin/audit${suffix ? `?${suffix}` : ""}`,
    );
  },

  policies: () => api.get<{ policies: Policy[] }>("/policies"),
  policy: (id: string) =>
    api.get<{ policy: Policy; chunkCount: number; chunks: PolicyChunk[] }>(`/policies/${id}`),
  uploadPolicy: (form: FormData) =>
    api.upload<{ policy: Policy; chunkCount: number; embedded: boolean }>("/policies", form),
  setPolicyStatus: (id: string, status: "ACTIVE" | "INACTIVE") =>
    api.patch<{ policy: Policy }>(`/policies/${id}`, { status }),
  deletePolicy: (id: string) => api.delete<{ ok: boolean }>(`/policies/${id}`),
};

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  emailVerified?: boolean;
}
