import { z } from "zod";

// The shape of one finished record. price_gbp must be a real, positive
// number; product_url is the record's canonical identity and must be
// absolute; description is optional (null when the page had none).
export const BookSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url().startsWith("https://"),
  price_text: z.string().min(1),
  price_gbp: z.number().positive(),
  availability_text: z.string().min(1),
  available_count: z.number().int().nonnegative().nullable(),
  rating_text: z.string().nullable(),
  rating_stars: z.number().int().min(1).max(5).nullable(),
  description: z.string().nullable(),
  source_page: z.string().url(),
  fetched_at: z.string(),
});

export function validateRecord(record) {
  const result = BookSchema.safeParse(record);
  if (result.success) {
    return { valid: true, data: result.data, reason: null };
  }
  const reason = result.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  return { valid: false, data: null, reason };
}