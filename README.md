# The Polite Scraper

A small, polite web scraping pipeline built for the **FlyRank Internship
Backend Track — Week 5 — Assignment A9**.

The goal of this project is to collect book data from the **Books to Scrape**
practice sandbox, clean and validate the data, and produce reliable JSON
output without repeatedly requesting the website.

---

## 📌 Assignment

**FlyRank Internship — Backend Track**

**Week:** 5  
**Assignment:** A9 — The Polite Scraper  
**Language:** JavaScript  
**Runtime:** Node.js 20+

---

# 🎯 Goal

Build a small and polite scraping pipeline that:

1. Checks whether the target is appropriate for automated scraping.
2. Downloads the first three catalogue pages.
3. Discovers all 60 unique book URLs.
4. Visits each book's detail page.
5. Extracts the required information.
6. Normalizes messy values into clean data.
7. Validates every record using a schema.
8. Stores valid records in JSON.
9. Handles broken pages without crashing the entire run.
10. Produces a report describing what happened.

The pipeline follows:

```text
Classify
   ↓
Fetch
   ↓
Cache
   ↓
Discover
   ↓
Extract
   ↓
Normalize
   ↓
Validate
   ↓
Store
   ↓
Report
```
