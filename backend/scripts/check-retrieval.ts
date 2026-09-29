import { pool } from "../src/db/client.js";
import { buildRetrievalQuery, retrievePolicyContext } from "../src/rag/retrieval.js";

/**
 * Manual smoke check for the RAG pipeline.
 *   POSTGRES_HOST=... npx tsx scripts/check-retrieval.ts
 */
async function main() {
  const queries = [
    { reason: "changed_mind", orderIsFinalSale: false, orderTotalCents: 24_000 },
    { reason: "damaged", orderIsFinalSale: true, orderTotalCents: 22_000 },
    { reason: "damaged", orderIsFinalSale: false, orderTotalCents: 78_000 },
  ];

  for (const params of queries) {
    const q = buildRetrievalQuery(params);
    const r = await retrievePolicyContext(q);
    console.log("\n================================================");
    console.log("QUERY:", q);
    console.log(`degraded=${r.degraded} chunks=${r.chunks.length}`);
    for (const c of r.chunks) {
      console.log(`  [${c.score}] ${c.content.replace(/\s+/g, " ").slice(0, 110)}`);
    }
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
