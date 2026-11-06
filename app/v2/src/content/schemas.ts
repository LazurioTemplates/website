import { z } from "astro/zod";

// The shape of every file in data/v2/. Astro checks the content against these
// schemas when it builds (src/content.config.ts) and `bun run validate:data`
// checks the same files without Astro (src/validate-data.ts), so a mistake is
// found by the same rule both ways. A schema takes the image field as an
// argument: in Astro it is `image()`, which resolves and optimizes the file;
// in the validator it is the relative path, checked to exist.
//
// Objects are strict: a misspelt field name ("descripton") is an error, not a
// field that is silently ignored. data/v2/README.md describes every field.

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const NEWS_FILE = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

// A link in the content: a page of the website (`/kontakt/`, always with the
// trailing slash, optionally with `#anchor`), a secure external address, an
// e-mail or a phone number.
export const HREF =
  /^(?:\/(?:[a-z0-9-]+\/)*(?:#[a-z0-9-]+)?|https:\/\/\S+|mailto:\S+|tel:\+?[0-9]+)$/;
const href = z
  .string()
  .regex(
    HREF,
    "must be a page of the website with a trailing slash (/kontakt/), https://…, mailto: or tel:",
  );

const action = z.strictObject({ label: text(1, 40), href });

// An image and its alternative text come together: an image without a
// description is not accessible, and a description without an image means
// nothing.
function withImage<T extends z.ZodRawShape, I extends z.ZodType>(shape: T, image: I) {
  return z
    .strictObject({ ...shape, image: image.optional(), imageAlt: text(1, 200).optional() })
    .refine(
      (data: { image?: unknown; imageAlt?: unknown }) =>
        (data.image === undefined) === (data.imageAlt === undefined),
      {
        message: "image and imageAlt go together: give both or neither",
        path: ["imageAlt"],
      },
    );
}

export function siteSchema<I extends z.ZodType>(image: I) {
  return z.strictObject({
    name: text(1, 40),
    legalName: text(1, 120),
    url: z
      .string()
      .regex(/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/, "must be the website's origin, without a path"),
    locale: z.string().regex(/^[a-z]{2}_[A-Z]{2}$/, "a locale such as cs_CZ or en_GB"),
    description: text(50, 160),
    shareImage: image,
    shareImageAlt: text(1, 200),
    indexing: z.boolean(),
    callToAction: z
      .strictObject({ title: text(1, 80), text: text(1, 240).optional(), action })
      .optional(),
  });
}

export const contactsSchema = z.strictObject({
  email: z.email(),
  phone: z.string().regex(/^\+?[0-9 ]{9,20}$/, "a phone number of digits and spaces"),
  address: z.strictObject({
    street: text(1, 80),
    postalCode: text(1, 12),
    city: text(1, 60),
    country: text(1, 60),
  }),
  hours: z.array(z.strictObject({ days: text(1, 40), time: text(1, 40) })).default([]),
  // The company's identification: in Czechia IČO (eight digits) and DIČ, in
  // another country its company and VAT numbers.
  company: z.strictObject({
    id: z.string().regex(/^[A-Z0-9][A-Z0-9 -]{3,19}$/, "a company number of digits and letters"),
    vatId: z
      .string()
      .regex(/^[A-Z]{2}[A-Z0-9]{2,13}$/, "a VAT number such as CZ12345678")
      .optional(),
    register: text(1, 200).optional(),
  }),
  people: z
    .array(
      z.strictObject({
        name: text(1, 80),
        role: text(1, 80),
        email: z.email().optional(),
        phone: z
          .string()
          .regex(/^\+?[0-9 ]{9,20}$/)
          .optional(),
      }),
    )
    .default([]),
});

export const PAGE_SHOWS = ["services", "news", "contacts"] as const;
export type PageShows = (typeof PAGE_SHOWS)[number];

export function pageSchema<I extends z.ZodType>(image: I) {
  return withImage(
    {
      title: text(1, 70),
      description: text(50, 170),
      menu: z.enum(["main", "footer", "none"]).default("none"),
      order: z.number().int().min(0).max(999).default(100),
      shows: z.enum(PAGE_SHOWS).optional(),
      hero: z
        .strictObject({
          eyebrow: text(1, 80).optional(),
          title: text(1, 120),
          lead: text(1, 320).optional(),
          actions: z.array(action).max(2).default([]),
        })
        .optional(),
      facts: z
        .array(z.strictObject({ value: text(1, 16), label: text(1, 60) }))
        .max(4)
        .optional(),
      highlights: z
        .array(z.strictObject({ title: text(1, 60), text: text(1, 240) }))
        .max(6)
        .optional(),
    },
    image,
  );
}

export function serviceSchema<I extends z.ZodType>(image: I) {
  return withImage(
    {
      title: text(1, 70),
      summary: text(20, 200),
      description: text(50, 170),
      order: z.number().int().min(0).max(999).default(100),
      price: text(1, 60).optional(),
    },
    image,
  );
}

export function newsSchema<I extends z.ZodType>(image: I) {
  return withImage(
    {
      title: text(1, 100),
      date: z.coerce.date(),
      summary: text(20, 240),
      description: text(50, 170).optional(),
      draft: z.boolean().default(false),
    },
    image,
  );
}

// The types of the parsed data, with the image as whatever the schema's image
// field produced (Astro's ImageMetadata, or a path in the validator).
type Out<S extends (image: z.ZodType) => z.ZodType, I> = z.output<ReturnType<S>> & {
  image?: I;
};
export type SiteData<I> = Omit<z.output<ReturnType<typeof siteSchema>>, "shareImage"> & {
  shareImage: I;
};
export type ContactsData = z.output<typeof contactsSchema>;
export type PageData<I> = Omit<Out<typeof pageSchema, I>, "image"> & { image?: I };
export type ServiceData<I> = Omit<Out<typeof serviceSchema, I>, "image"> & { image?: I };
export type NewsData<I> = Omit<Out<typeof newsSchema, I>, "image"> & { image?: I };
