# The polite scraper

FlyRank Internship · Backend Track · W5 · A9

A small, polite scraping pipeline: it downloads the first three catalogue
pages of [Books to Scrape](https://books.toscrape.com), visits all 60 book
pages, turns messy HTML into clean, checked JSON records, survives a broken
page without crashing, and ends every run with a short report.

## Target classification

- **Site:** [books.toscrape.com](https://books.toscrape.com) — [toscrape.com](https://toscrape.com)
  says plainly that this site exists so people can practise scraping on it.
  It is a sandbox, not a live business.
- **Scope:** the first 3 catalogue pages only (`/catalogue/page-1.html`
  through `page-3.html`, following the site's own "next" link), and the 60
  book detail pages those three pages link to. Nothing else on the site is
  requested.
- **robots.txt:** `https://books.toscrape.com/robots.txt` was requested once
  and returned **404 (no robots file found)**. A missing file is not
  permission, so I relied on the site's own statement that it is a scraping
  sandbox and kept to the three-page scope.
- **Data collected:** only what's already rendered in the HTML the server
  sends — title, price, stock text, star rating, description, and the page
  it came from. No personal data, no login, no paywall.
- **Why this is appropriate:** the site is explicitly built and offered for
  this exact purpose, the request volume is tiny (64 pages on a first run,
  then served from a cache, with a polite delay between real requests), and
  everything collected is public catalogue data the site publishes for
  practice.

> I will not reuse this code on another site without checking its rules and
> terms first.

## Lane & install

JavaScript lane — Node.js 20+, [Cheerio](https://cheerio.js.org/) for HTML
parsing, [Zod](https://zod.dev/) for schema validation, and Node's built-in
`fetch`.

```bash
git clone https://github.com/Shibnath-Maity/polite-scraper.git
cd polite-scraper
npm install
```

## Run it

```bash
npm start
```

This one command checks `robots.txt`, fetches and caches the 3 catalogue
pages, discovers the 60 book URLs, fetches and caches every detail page,
normalizes and validates every record, and writes:

- `output/books.json` — the valid records (idempotent: rerun and it's
  still exactly the same 60, not duplicated)
- `output/errors.json` — any record that failed validation, with a reason
- `output/run-report.json` — counts and timing for the run

A first run takes about a minute because of the polite delay between real
requests. Every run after that reads from `cache/` and takes a few seconds.

To prove the failure handling, run with one deliberately broken URL
injected into the list (this makes one real request that returns a 404):

```bash
npm run start:with-fake-url
```

`output/run-report.json` will show `failed_pages: 1` while `books.json`
still holds all 60 good records.

## Record schema

Each entry in `output/books.json`:

| Field               | Type                  | Notes                                                         |
| ------------------- | --------------------- | ------------------------------------------------------------- |
| `title`             | string                |                                                               |
| `product_url`       | string (URL)          | canonical identity of the record; must be absolute `https://` |
| `price_text`        | string                | raw text as shown on the page, e.g. `"£51.77"`                |
| `price_gbp`         | number                | parsed from `price_text`, must be positive                    |
| `availability_text` | string                | raw stock text, e.g. `"In stock (22 available)"`              |
| `available_count`   | number \| null        | parsed out of `availability_text` when present                |
| `rating_text`       | string \| null        | e.g. `"Three"`                                                |
| `rating_stars`      | number (1–5) \| null  | parsed from `rating_text`                                     |
| `description`       | string \| null        | `null` when the page had none — never invented                |
| `source_page`       | string (URL)          | which catalogue page this book was discovered on              |
| `fetched_at`        | string (ISO datetime) | provenance: when this page was fetched                        |

Records that fail this schema go to `output/errors.json` with a reason
instead of into `books.json`.

## Politeness rules this scraper follows

- **User-agent:** every request identifies itself as
  `FlyRankInternshipA9/1.0 (+https://github.com/Shibnath-Maity/polite-scraper)`
  (see `src/fetcher.js`).
- **Timeout:** every request gives up after 8 seconds rather than hanging.
- **Delay:** at least 600 ms between real requests to the site. Cached pages
  add no delay — they never leave the machine.
- **Cache:** every page (catalogue and detail) is saved to `cache/` on
  first fetch and read from disk on every run after that, so re-running
  the script does not re-hit the site.
- **Status checks:** only a `200` is treated as a page to parse. `404` and
  `403` are never retried (asking again won't help and may look like
  pestering); timeouts and `5xx` get one retry after a short pause.

## Run report (proof)

Real `output/run-report.json` from a second run — 63 of 64 pages came from
the cache and the run finished in about 3.6 seconds (the first run took
about 61 seconds):

```json
{
  "started_at": "2026-09-28T16:23:23.256Z",
  "pages_fetched": 64,
  "cache_hits": 63,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0,
  "finished_at": "2026-09-28T16:23:26.849Z",
  "duration_ms": 3593
}
```

The one page that was not a cache hit is `robots.txt`, which returns a 404
and so is never cached.

With one fake URL injected (`npm run start:with-fake-url`), the run still
finished: the fake page got a 404 (not retried), `books.json` kept all 60
good records, and the report showed `"failed_pages": 1`.

## Why no browser was needed

The catalogue and book pages are plain server-rendered HTML — the data
(title, price, stock, rating, description) is already present in the raw
response, with no JavaScript needed to reveal it. A headless browser would
add startup cost and memory for no extra data, so a plain HTTP request is
the right tool here.

## One honest limitation

`available_count` and `rating_stars` are derived with a small regex and a
word lookup against the site's current text formatting
(`"In stock (N available)"`, and rating words like `"Three"`). If the site
ever changes that phrasing, those two fields would quietly become `null`
instead of raising an error. The core fields (`title`, `price_gbp`,
`product_url`) don't share that risk because they come from dedicated CSS
selectors and are required by the schema.

## Ethics note

Use an official API when one exists instead of scraping. Never bypass
logins, paywalls, CAPTCHAs, or explicit blocks. Collect only the fields
you actually need, keep request volume and frequency low, and identify
yourself honestly in the user-agent so a site owner can always find out
who's visiting and why.
