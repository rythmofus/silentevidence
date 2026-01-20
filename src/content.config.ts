import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

function removeDupsAndLowerCase(array: string[]) {
  if (!array.length) return array;
  const lowercaseItems = array.map((str) => str.toLowerCase());
  const distinctItems = new Set(lowercaseItems);
  return Array.from(distinctItems);
}

/**
 * PagesCMS sometimes writes dates like "01/19/2026".
 * Node's Date parsing for that format is not consistent.
 * This converts common formats into a safe ISO string "YYYY-MM-DD".
 */
function normalizeDateInput(value: unknown) {
  if (value == null) return value;
  if (value instanceof Date) return value;

  if (typeof value !== "string") return value;

  const v = value.trim();
  if (!v) return value;

  // Already ISO-ish
  // "2026-01-19" or "2026-01-19T00:00:00.000Z"
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v;

  // "2026/01/19" -> "2026-01-19"
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(v)) {
    const [yyyy, mm, dd] = v.split("/");
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // "01/19/2026" (MM/DD/YYYY) -> "2026-01-19"
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) {
    const [mm, dd, yyyy] = v.split("/");
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // Fall back to whatever it is (maybe it is parseable)
  return value;
}

const safeDateRequired = z.preprocess(normalizeDateInput, z.coerce.date());
const safeDateOptional = z.preprocess(
  normalizeDateInput,
  z.coerce.date().optional()
);

// Define blog collection
const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(60),
      description: z.string().max(160),

      // FIXED: handles "01/19/2026" safely
      publishDate: safeDateRequired,

      updatedDate: safeDateOptional,

      heroImage: z
        .object({
          src: image(),
          alt: z.string().optional(),
          inferSize: z.boolean().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          color: z.string().optional(),
        })
        .optional(),

      tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
      language: z.string().optional(),
      draft: z.boolean().default(false),

      comment: z.boolean().default(true),
    }),
});

// Define docs collection
const docs = defineCollection({
  loader: glob({ base: "./src/content/docs", pattern: "**/*.{md,mdx}" }),
  schema: () =>
    z.object({
      title: z.string().max(60),
      description: z.string().max(160),

      publishDate: safeDateOptional,
      updatedDate: safeDateOptional,

      tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
      draft: z.boolean().default(false),

      order: z.number().default(999),
    }),
});

export const collections = { blog, docs };
