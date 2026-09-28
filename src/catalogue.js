import * as cheerio from "cheerio";
import { politeFetch } from "./fetcher.js";

const START_URL = "https://books.toscrape.com/catalogue/page-1.html";
const MAX_PAGES = 3;

/**
 * Turn a book detail URL into a short, filesystem-safe cache key, e.g.
 * ".../a-light-in-the-attic_1000/index.html" -> "book-a-light-in-the-attic_1000"
 */
export function slugFromBookUrl(url) {
  const { pathname } = new URL(url);
  const parts = pathname.split("/").filter(Boolean);
  const slug = parts[parts.length - 2] ?? parts[parts.length - 1] ?? "book";
  return `book-${slug}`;
}

/**
 * Fetch catalogue pages 1..3, following the site's own "next" link (we do
 * not hardcode page URLs or the total book count), and collect every
 * unique, absolute book URL along with which catalogue page it came from.
 */
export async function discoverBookUrls() {
  const seen = new Map(); // bookUrl -> sourcePageUrl (first page it was seen on)
  const pageResults = [];

  let nextUrl = START_URL;
  let pageNum = 1;

  while (nextUrl && pageNum <= MAX_PAGES) {
    const cacheKey = `catalogue-page-${pageNum}`;
    const { html, status, fromCache } = await politeFetch(nextUrl, cacheKey);
    pageResults.push({ url: nextUrl, status, fromCache });

    if (html === null) {
      console.log(
        `Stage 2: catalogue page ${pageNum} failed (status ${status}) — stopping discovery here`
      );
      break;
    }

    const $ = cheerio.load(html);
    $("article.product_pod h3 a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const absolute = new URL(href, nextUrl).toString();
      if (!seen.has(absolute)) {
        seen.set(absolute, nextUrl);
      }
    });

    const nextHref = $("li.next a").attr("href");
    nextUrl = nextHref ? new URL(nextHref, nextUrl).toString() : null;
    pageNum += 1;
  }

  return {
    catalogue_pages: pageResults.length,
    discovered: seen.size,
    unique_urls: seen.size,
    urls: Array.from(seen.entries()).map(([url, sourcePage]) => ({
      url,
      sourcePage,
    })),
    pageResults,
  };
}