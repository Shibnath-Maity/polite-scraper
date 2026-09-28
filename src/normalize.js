const RATING_WORDS = { One: 1, Two: 2, Three: 3, Four: 4, Five: 5 };

/**
 * "£51.77" -> 51.77. The raw price_text is kept on the record too, so the
 * original and the clean value live side by side.
 */
function parsePriceGbp(priceText) {
  if (!priceText) return NaN;
  const match = priceText.match(/[\d]+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : NaN;
}

/**
 * "In stock (22 available)" -> 22 available units (null if the count isn't
 * present in the text, e.g. "In stock" with no parenthetical).
 */
function parseAvailableCount(availabilityText) {
  if (!availabilityText) return null;
  const match = availabilityText.match(/(\d+)\s+available/i);
  return match ? parseInt(match[1], 10) : null;
}

export function normalizeRecord(raw) {
  return {
    ...raw,
    price_gbp: parsePriceGbp(raw.price_text),
    rating_stars: raw.rating_text ? RATING_WORDS[raw.rating_text] ?? null : null,
    available_count: parseAvailableCount(raw.availability_text),
  };
}