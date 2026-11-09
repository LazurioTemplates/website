import { getCollection } from "astro:content";
import { buildSite } from "../content/model";
import { texts } from "./texts";

// The whole website, read once per build from the content collections of its
// language (src/content.config.ts) and checked by the rules of
// src/content/model.ts, with the interface words of that language.
async function read() {
  const language = __WEBSITE_LANGUAGE__;
  const [settings] = await getCollection("site");
  const [contacts] = await getCollection("contacts");
  if (!settings) throw new Error(`data/v2/${language}/site.yaml is missing`);
  if (!contacts) throw new Error(`data/v2/${language}/contacts.yaml is missing`);
  const [pages, services, news] = await Promise.all([
    getCollection("pages"),
    getCollection("services"),
    getCollection("news"),
  ]);
  const model = buildSite({
    language,
    settings: settings.data,
    contacts: contacts.data,
    pages,
    services,
    news,
  });
  return { settings: settings.data, contacts: contacts.data, texts: texts[language], ...model };
}

let site: ReturnType<typeof read> | undefined;
export function loadSite(): ReturnType<typeof read> {
  site ??= read();
  return site;
}

export type Site = Awaited<ReturnType<typeof read>>;
export type SiteRoute = Site["routes"][number];
