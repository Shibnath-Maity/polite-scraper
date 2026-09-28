import fs from "node:fs/promises";
import path from "node:path";

import { checkRobots } from "./robots.js";
import { discoverBookUrls } from "./catalogue.js";
import { extractBookRecord } from "./extract.js";
import { normalizeRecord } from "./normalize.js";
import { validateRecord } from "./schema.js";
import { writeRunReport } from "./report.js";

const INJECT_FAKE_URL = process.argv.includes("--with-fake-url");
const FAKE_URL =
  "https://books.toscrape.com/catalogue/this-book-does-not-exist_9999/index.html";

async function main() {
  const startedAt = new Date();
  const stats = {
    started_at: startedAt.toISOString(),
    pages_fetched: 0,
    cache_hits: 0,
    valid_records: 0,
    invalid_records: 0,
    failed_pages: 0,
  };

  console.log("=== Stage 0: check robots.txt ===");
  const robots = await checkRobots();
  stats.pages_fetched += 1;
  if (robots.fromCache) stats.cache_hits += 1;

  console.log("\n=== Stage 1 & 2: fetch catalogue pages, discover book URLs ===");
  const discovery = await discoverBookUrls();
  console.log(
    `catalogue_pages=${discovery.catalogue_pages} discovered=${discovery.discovered} unique_urls=${discovery.unique_urls}`
  );
  for (const p of discovery.pageResults) {
    stats.pages_fetched += 1;
    if (p.fromCache) stats.cache_hits += 1;
  }

  let targets = discovery.urls; // [{ url, sourcePage }]
  if (INJECT_FAKE_URL) {
    targets = [
      ...targets,
      { url: FAKE_URL, sourcePage: discovery.pageResults[0]?.url ?? FAKE_URL },
    ];
    console.log(`(--with-fake-url) injected one deliberately broken URL for testing`);
  }

  console.log("\n=== Stage 3: extract raw records ===");
  const rawRecords = [];
  for (const { url, sourcePage } of targets) {
    try {
      const { record, status, fromCache } = await extractBookRecord(url, sourcePage);
      stats.pages_fetched += 1;
      if (fromCache) stats.cache_hits += 1;

      if (record === null) {
        console.log(`Stage 3: skipping ${url} — failed with status ${status}`);
        stats.failed_pages += 1;
        continue;
      }
      rawRecords.push(record);
    } catch (err) {
      // One bad page must not kill the run.
      console.log(`Stage 3: error on ${url}: ${err.message} — skipping`);
      stats.failed_pages += 1;
    }
  }
  console.log(`detail_pages=${rawRecords.length}`);

  console.log("\n=== Stage 4: normalize, validate, store ===");
  const seenCanonicalUrls = new Set();
  const validRecords = [];
  const invalidRecords = [];

  for (const raw of rawRecords) {
    const normalized = normalizeRecord(raw);
    const { valid, data, reason } = validateRecord(normalized);

    if (!valid) {
      invalidRecords.push({ record: normalized, reason });
      stats.invalid_records += 1;
      continue;
    }

    // Idempotency: canonical URL is the record's identity, so a rerun
    // (or a book that somehow appeared on two catalogue pages) never
    // produces a duplicate.
    if (seenCanonicalUrls.has(data.product_url)) {
      continue;
    }
    seenCanonicalUrls.add(data.product_url);
    validRecords.push(data);
    stats.valid_records += 1;
  }

  const outDir = path.join(process.cwd(), "output");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "books.json"),
    JSON.stringify(validRecords, null, 2),
    "utf-8"
  );
  await fs.writeFile(
    path.join(outDir, "errors.json"),
    JSON.stringify(invalidRecords, null, 2),
    "utf-8"
  );
  console.log(`Wrote output/books.json (${validRecords.length} valid records)`);
  console.log(`Wrote output/errors.json (${invalidRecords.length} invalid records)`);

  console.log("\n=== Stage 5: write run report ===");
  const finishedAt = new Date();
  const report = {
    ...stats,
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
  };
  const reportPath = await writeRunReport(report);
  console.log(`Wrote ${path.relative(process.cwd(), reportPath)}`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  // Reaching here means something outside the per-page handling broke
  // (e.g. disk full) — that's a real bug, not a "one bad page" case.
  console.error("Fatal error:", err);
  process.exit(1);
});