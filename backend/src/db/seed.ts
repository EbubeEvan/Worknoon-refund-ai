import { count, eq } from "drizzle-orm";

import { newCustomerId, newOrderId } from "../lib/ids.js";
import { createLogger } from "../lib/logger.js";
import { auth } from "../modules/auth/auth.js";
import { db, pool } from "./client.js";
import { customers, type OrderItem, orders, users } from "./schema/index.js";

const log = createLogger("seed");

/**
 * Synthetic demo dataset.
 *
 * The orders are deliberately shaped so that every branch of the deterministic
 * policy engine is reachable from the UI without editing data by hand. Each
 * scenario is annotated next to the order that triggers it.
 */

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * DAY);

function item(
  sku: string,
  name: string,
  unitAmountCents: number,
  quantity = 1,
  finalSale = false,
): OrderItem {
  return { sku, name, quantity, unitAmountCents, finalSale };
}

const DEMO_PASSWORD = "password123";

interface SeedCustomer {
  email: string;
  name: string;
  tier?: string;
  lifetimeValueCents: number;
  orders: Array<{
    orderNumber: string;
    totalAmountCents: number;
    purchasedDaysAgo: number;
    isFinalSale?: boolean;
    refundStatus?: "NONE" | "REQUESTED" | "REFUNDED";
    status?: "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
    items: OrderItem[];
    /** Which engine rule this order exists to demonstrate. */
    scenario: string;
  }>;
}

const SEED_CUSTOMERS: SeedCustomer[] = [
  {
    // The primary demo login.
    email: "ada@worknoon.test",
    name: "Ada Okafor",
    tier: "gold",
    lifetimeValueCents: 284_500,
    orders: [
      {
        orderNumber: "ORD-1001",
        totalAmountCents: 12_000,
        purchasedDaysAgo: 4,
        items: [item("SKU-KET-01", "Stovetop Kettle 1.7L", 12_000)],
        scenario: "ELIGIBLE_DAMAGED - arrives damaged, recent, under the limit",
      },
      {
        orderNumber: "ORD-1002",
        totalAmountCents: 45_000,
        purchasedDaysAgo: 9,
        items: [item("SKU-HDP-07", "Studio Headphones", 45_000)],
        scenario: "ELIGIBLE_INCORRECT_ITEM - wrong colour delivered",
      },
    ],
  },
  {
    email: "grace@worknoon.test",
    name: "Grace Lindqvist",
    tier: "gold",
    lifetimeValueCents: 512_000,
    orders: [
      {
        orderNumber: "ORD-1003",
        totalAmountCents: 78_000,
        purchasedDaysAgo: 6,
        items: [item("SKU-DSK-11", "Standing Desk Frame", 78_000)],
        scenario: "AMOUNT_OVER_AUTO_APPROVAL_LIMIT - $780 exceeds the $500 auto limit",
      },
      {
        orderNumber: "ORD-1004",
        totalAmountCents: 3_500,
        purchasedDaysAgo: 45,
        items: [item("SKU-MUG-02", "Stoneware Mug", 1_800, 2)],
        scenario: "OUTSIDE_REFUND_WINDOW - purchased 45 days ago",
      },
    ],
  },
  {
    email: "marcus@worknoon.test",
    name: "Marcus Bell",
    lifetimeValueCents: 64_000,
    orders: [
      {
        orderNumber: "ORD-1005",
        totalAmountCents: 22_000,
        purchasedDaysAgo: 12,
        isFinalSale: true,
        items: [item("SKU-LMT-99", "Leather Messenger Bag", 22_000, 1, true)],
        scenario: "FINAL_SALE - not refundable",
      },
    ],
  },
  {
    email: "priya@worknoon.test",
    name: "Priya Raman",
    lifetimeValueCents: 138_000,
    orders: [
      {
        orderNumber: "ORD-1006",
        totalAmountCents: 31_400,
        purchasedDaysAgo: 3,
        refundStatus: "REFUNDED",
        items: [item("SKU-LMP-04", "Desk Lamp Pro", 31_400)],
        scenario: "ALREADY_REFUNDED - a second request must be denied",
      },
    ],
  },
  {
    email: "tomas@worknoon.test",
    name: "Tomás Ferreira",
    lifetimeValueCents: 41_000,
    orders: [
      {
        orderNumber: "ORD-1007",
        totalAmountCents: 18_900,
        purchasedDaysAgo: 2,
        status: "SHIPPED",
        items: [item("SKU-BLD-05", "Blender Compact", 18_900)],
        scenario: "ORDER_NOT_DELIVERED - a damage claim is incoherent before delivery",
      },
    ],
  },
  {
    email: "hana@worknoon.test",
    name: "Hana Kimura",
    lifetimeValueCents: 97_500,
    orders: [
      {
        orderNumber: "ORD-1008",
        totalAmountCents: 9_900,
        purchasedDaysAgo: 8,
        items: [item("SKU-CUP-08", "Travel Mug", 9_900)],
        scenario: "ELIGIBLE_DAMAGED - second customer, for cross-customer 403 testing",
      },
    ],
  },
  {
    email: "samuel@worknoon.test",
    name: "Samuel Adeyemi",
    lifetimeValueCents: 56_000,
    orders: [
      {
        orderNumber: "ORD-1009",
        totalAmountCents: 26_000,
        purchasedDaysAgo: 15,
        items: [item("SKU-NBK-01", "Notebook A5", 2_600, 10)],
        scenario: "Normal eligible request - damaged, in window, under limit",
      },
      {
        orderNumber: "ORD-1018",
        totalAmountCents: 10_000,
        purchasedDaysAgo: 5,
        items: [
          item("SKU-PLN-02", "Ceramic Planter", 6_000),
          item("SKU-CLR-09", "Clearance Vase", 4_000, 1, true),
        ],
        scenario: "ELIGIBLE_INCORRECT_ITEM on a mixed order - refunds the $60 returnable line only",
      },
      {
        orderNumber: "ORD-1019",
        totalAmountCents: 20_000,
        purchasedDaysAgo: 7,
        items: [item("SKU-LMP-12", "Floor Lamp", 12_000), item("SKU-SHD-03", "Lamp Shade", 8_000)],
        scenario: "DAMAGED_ITEM_NEEDS_REVIEW - two lines, an agent picks the damaged one",
      },
    ],
  },
  {
    email: "leila@worknoon.test",
    name: "Leila Haddad",
    lifetimeValueCents: 73_000,
    orders: [
      {
        orderNumber: "ORD-1010",
        totalAmountCents: 24_000,
        purchasedDaysAgo: 20,
        items: [item("SKU-SPK-06", "Bluetooth Speaker", 24_000)],
        scenario: "CHANGE_OF_MIND_NOT_ELIGIBLE",
      },
    ],
  },
  {
    email: "nils@worknoon.test",
    name: "Nils Berger",
    lifetimeValueCents: 15_500,
    orders: [
      {
        orderNumber: "ORD-1011",
        totalAmountCents: 15_500,
        purchasedDaysAgo: 1,
        items: [item("SKU-USB-03", "USB-C Hub 7-in-1", 15_500)],
        scenario: "ELIGIBLE_DAMAGED - brand new order, easiest approval to demo",
      },
    ],
  },
  {
    email: "mei@worknoon.test",
    name: "Mei Chen",
    lifetimeValueCents: 44_000,
    orders: [
      {
        orderNumber: "ORD-1012",
        totalAmountCents: 44_000,
        purchasedDaysAgo: 11,
        status: "CANCELLED",
        items: [item("SKU-CHR-10", "Task Chair", 44_000)],
        scenario: "ORDER_CANCELLED - no payment captured",
      },
    ],
  },
  {
    email: "ivan@worknoon.test",
    name: "Ivan Petrov",
    lifetimeValueCents: 58_000,
    orders: [
      {
        orderNumber: "ORD-1013",
        totalAmountCents: 21_500,
        purchasedDaysAgo: 6,
        items: [item("SKU-BLD-07", "Blender Pro", 21_500)],
        scenario: "ELIGIBLE_INCORRECT_ITEM - wrong model received",
      },
    ],
  },
  {
    email: "yara@worknoon.test",
    name: "Yara Nasser",
    lifetimeValueCents: 33_000,
    orders: [
      {
        orderNumber: "ORD-1014",
        totalAmountCents: 33_000,
        purchasedDaysAgo: 5,
        items: [item("SKU-MON-02", 'Monitor 27"', 33_000)],
        scenario: "ELIGIBLE_DAMAGED - cracked panel on arrival",
      },
    ],
  },
  {
    email: "oskar@worknoon.test",
    name: "Oskar Nowak",
    lifetimeValueCents: 12_000,
    orders: [
      {
        orderNumber: "ORD-1015",
        totalAmountCents: 12_000,
        purchasedDaysAgo: 25,
        items: [item("SKU-THM-01", "Ceramic Figurine", 12_000)],
        scenario: "ELIGIBLE_DAMAGED - still inside the 30 day window",
      },
    ],
  },
  {
    email: "chen@worknoon.test",
    name: "Chen Wei",
    lifetimeValueCents: 67_000,
    orders: [
      {
        orderNumber: "ORD-1016",
        totalAmountCents: 29_900,
        purchasedDaysAgo: 4,
        items: [item("SKU-EAR-05", "Wireless Earbuds", 29_900)],
        scenario: "ELIGIBLE_DAMAGED - most recent order, good for a live demo",
      },
    ],
  },
  {
    email: "fatima@worknoon.test",
    name: "Fatima Zahra",
    lifetimeValueCents: 19_000,
    orders: [
      {
        orderNumber: "ORD-1017",
        totalAmountCents: 19_000,
        purchasedDaysAgo: 10,
        items: [item("SKU-STP-01", "Yoga Mat Pro", 19_000)],
        scenario: "ELIGIBLE_DAMAGED - standard case",
      },
    ],
  },
];

const DEMO_ADMIN = {
  email: "admin@worknoon.test",
  name: "Refund Desk Admin",
  password: DEMO_PASSWORD,
};

/** Create a Better Auth user, tolerating an already-seeded database. */
async function ensureAuthUser(input: {
  email: string;
  name: string;
  password: string;
  role?: "CUSTOMER" | "ADMIN";
}): Promise<string> {
  try {
    const res = await auth.api.signUpEmail({
      body: { email: input.email, password: input.password, name: input.name },
    });
    return res.user.id;
  } catch (err) {
    // Already exists: fall back to looking the user up by email.
    const message = err instanceof Error ? err.message : String(err);
    log.debug(`reusing existing user ${input.email}`);
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (!existing) {
      throw new Error(`could not create or find user ${input.email}: ${message}`, {
        cause: err,
      });
    }
    return existing.id;
  }
}

/**
 * Populate the demo dataset if the database has no customers.
 *
 * Idempotent: a second boot with data already present is a no-op, so
 * `docker compose up` can be run repeatedly without wiping anything.
 */
export async function seedIfEmpty(): Promise<void> {
  const [row] = await db.select({ count: count() }).from(customers);
  const existingCustomers = row?.count ?? 0;

  if (existingCustomers > 0) {
    log.info(`database already has ${existingCustomers} customers; skipping seed`);
    return;
  }

  log.info("seeding demo dataset...");

  // Admin first, so the dashboard has a role to demonstrate.
  const adminUserId = await ensureAuthUser({
    ...DEMO_ADMIN,
    role: "ADMIN",
  });
  await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, adminUserId));

  for (const c of SEED_CUSTOMERS) {
    const userId = await ensureAuthUser({
      email: c.email,
      name: c.name,
      password: DEMO_PASSWORD,
    });
    const customerId = newCustomerId();

    await db.insert(customers).values({
      id: customerId,
      userId,
      fullName: c.name,
      email: c.email,
      tier: c.tier ?? "standard",
      lifetimeValueCents: c.lifetimeValueCents,
    });

    for (const o of c.orders) {
      await db.insert(orders).values({
        id: newOrderId(),
        customerId,
        orderNumber: o.orderNumber,
        status: o.status ?? "DELIVERED",
        currency: "USD",
        totalAmountCents: o.totalAmountCents,
        isFinalSale: o.isFinalSale ?? false,
        purchasedAt: daysAgo(o.purchasedDaysAgo),
        refundStatus: o.refundStatus ?? "NONE",
        items: o.items,
      });
    }

    log.debug(`seeded ${c.email} with ${c.orders.length} order(s)`);
  }

  log.info(
    `seed complete: ${SEED_CUSTOMERS.length} customers, admin=${DEMO_ADMIN.email}, password="${DEMO_PASSWORD}"`,
  );
}

const isEntrypoint = process.argv[1]?.includes("seed");
if (isEntrypoint) {
  seedIfEmpty()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[seed] failed:", err);
      await pool.end();
      process.exit(1);
    });
}
