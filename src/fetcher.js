import fs from "node:fs/promises";
import path from "node:path";

// Stage 0/1: an honest user-agent that names us and links back to the repo.
// Replace Shibnath-Maity/polite-scraper with your real GitHub repo before you push.
export const USER_AGENT =
  "FlyRankInternshipA9/1.0 (+https://github.com/Shibnath-Maity/polite-scraper)";

const TIMEOUT_MS = 8000; // a request must give up after a few seconds
const POLITE_DELAY_MS = 600; // at least half a second between real requests
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const CACHE_DIR = path.join(process.cwd(), "cache");

let lastRealRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

function cachePathFor(cacheKey) {
  // cacheKey is a filesystem-safe name chosen by the caller (no URL parsing here).
  return path.join(CACHE_DIR, `${cacheKey}.html`);
}

async function readCache(cacheKey) {
  try {
    return await fs.readFile(cachePathFor(cacheKey), "utf-8");
  } catch {
    return null;
  }
}

async function writeCache(cacheKey, html) {
  await ensureCacheDir();
  await fs.writeFile(cachePathFor(cacheKey), html, "utf-8");
}

async function waitOutPoliteDelay() {
  const elapsed = Date.now() - lastRealRequestAt;
  if (elapsed < POLITE_DELAY_MS) {
    await sleep(POLITE_DELAY_MS - elapsed);
  }
}

async function singleRequest(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a URL politely, reading from the on-disk cache when a copy already
 * exists. Real requests: send a user-agent, respect a timeout, wait at
 * least POLITE_DELAY_MS since the last real request, and retry once on a
 * timeout/network error or a 5xx (never on 404 or 403).
 *
 * Returns { html, status, fromCache }. html is null when the page could
 * not be retrieved — callers must treat that as a failed page, not as
 * empty HTML.
 */
export async function politeFetch(url, cacheKey) {
  const cached = await readCache(cacheKey);
  if (cached !== null) {
    console.log(`CACHE HIT ${url} (${cached.length} bytes)`);
    return { html: cached, status: 200, fromCache: true };
  }

  let attempt = 0;
  let lastStatus = 0;

  while (attempt < 2) {
    attempt += 1;
    await waitOutPoliteDelay();

    try {
      const { status, text } = await singleRequest(url);
      lastRealRequestAt = Date.now();
      lastStatus = status;

      if (status === 200) {
        console.log(`FETCH ${url} -> 200 (${text.length} bytes)`);
        await writeCache(cacheKey, text);
        return { html: text, status, fromCache: false };
      }

      if (status === 404 || status === 403) {
        console.log(`FETCH ${url} -> ${status} (not retrying)`);
        return { html: null, status, fromCache: false };
      }

      if (RETRYABLE_STATUS.has(status) && attempt < 2) {
        console.log(`FETCH ${url} -> ${status} (will retry once)`);
        continue;
      }

      console.log(`FETCH ${url} -> ${status} (giving up)`);
      return { html: null, status, fromCache: false };
    } catch (err) {
      lastRealRequestAt = Date.now();
      if (attempt < 2) {
        console.log(`FETCH ${url} -> ${err.message} (will retry once)`);
        continue;
      }
      console.log(`FETCH ${url} -> ${err.message} (giving up)`);
      return { html: null, status: 0, fromCache: false };
    }
  }

  return { html: null, status: lastStatus, fromCache: false };
}