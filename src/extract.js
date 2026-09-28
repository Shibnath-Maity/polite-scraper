import * as cheerio from "cheerio";
import { politeFetch } from "./fetcher.js";
import { slugFromBookUrl } from "./catalogue.js";

/**
 * Fetch and cache one book detail page, then pull the eight raw fields
 * out of it. Selectors are scoped to the product area, not the whole
 * document, so a second price elsewhere on the page can't fool us.
 * Missing fields (e.g. no description) become null — we never invent text.
 */
export async function extractBookRecord(bookUrl, sourcePage) {
  const cacheKey = slugFromBookUrl(bookUrl);
  const { html, status, fromCache } = await politeFetch(bookUrl, cacheKey);

  if (html === null) {
    return { record: null, status, url: bookUrl, fromCache };
  }

  const $ = cheerio.load(html);
  const main = $(".product_main");

  const title = main.find("h1").first().text().trim() || null;
  const price_text = main.find(".price_color").first().text().trim() || null;
  const availability_text =
    main.find(".availability").first().text().trim().replace(/\s+/g, " ") ||
    null;

  const ratingClass = main.find("p.star-rating").attr("class") || "";
  const ratingWord = ratingClass.replace("star-rating", "").trim();
  const rating_text = ratingWord.length ? ratingWord : null;

  let description = null;
  const descHeading = $("#product_description");
  if (descHeading.length) {
    const descText = descHeading.nextAll("p").first().text().trim();
    description = descText.length ? descText : null;
  }

  const record = {
    title,
    product_url: bookUrl,
    price_text,
    availability_text,
    rating_text,
    description,
    source_page: sourcePage,
    fetched_at: new Date().toISOString(),
  };

  return { record, status: 200, url: bookUrl, fromCache };
}