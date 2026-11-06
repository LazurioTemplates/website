import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
  contactsSchema,
  newsSchema,
  pageSchema,
  serviceSchema,
  siteSchema,
} from "./content/schemas";

// The content of the website lies beside the App in data/v2/ (App generation
// app/v2), one directory per language. The collections read the directory of
// the website's language (astro.config.ts, src/content/language.ts) and check each file
// against its schema in src/content/schemas.ts; data/v2/README.md describes
// them.
const DATA = `../../data/v2/${__WEBSITE_LANGUAGE__}`;
// The id of a Markdown entry is its path without `.md`, exactly as written,
// so that the address of a page is its file name.
const byPath = ({ entry }: { entry: string }) => entry.replace(/\.md$/, "");

const site = defineCollection({
  loader: glob({ pattern: "site.yaml", base: DATA }),
  schema: ({ image }) => siteSchema(image()),
});

const contacts = defineCollection({
  loader: glob({ pattern: "contacts.yaml", base: DATA }),
  schema: contactsSchema,
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: `${DATA}/pages`, generateId: byPath }),
  schema: ({ image }) => pageSchema(image()),
});

const services = defineCollection({
  loader: glob({ pattern: "*.md", base: `${DATA}/services`, generateId: byPath }),
  schema: ({ image }) => serviceSchema(image()),
});

const news = defineCollection({
  loader: glob({ pattern: "*.md", base: `${DATA}/news`, generateId: byPath }),
  schema: ({ image }) => newsSchema(image()),
});

export const collections = { site, contacts, pages, services, news };
