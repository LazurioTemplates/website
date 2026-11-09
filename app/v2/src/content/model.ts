import type { Language } from "./language";
import { renderedNodes } from "./markdown";
import {
  type ContactsData,
  NEWS_FILE,
  type NewsData,
  type PageData,
  type PageShows,
  type ServiceData,
  type SiteData,
  SLUG,
} from "./schemas";

// The website as a whole: which page lives at which address, what the menus
// hold, which services and news are shown, and the rules that a schema of one
// file cannot hold (one home page, one page per list, unique addresses, links
// that lead somewhere, images in the text with their alternative text). Astro
// builds the pages from this model (src/lib/site.ts), so `bun run build`
// stops on a broken rule, and `bun run validate:data` checks the same model.

export type Entry<D> = { id: string; data: D; body?: string | undefined };
export type PageEntry = Entry<PageData<unknown>>;
export type ServiceEntry = Entry<ServiceData<unknown>>;
export type NewsEntry = Entry<NewsData<unknown>>;

export type Route<P, S, N> =
  | { kind: "page"; path: string; entry: P }
  | { kind: "service"; path: string; entry: S; list: P }
  | { kind: "news"; path: string; entry: N; list: P };

export type MenuItem = { label: string; path: string };

export type SiteModel<P, S, N> = {
  language: Language;
  home: P;
  routes: Route<P, S, N>[];
  services: { entry: S; path: string }[];
  news: { entry: N; path: string }[];
  lists: Partial<Record<PageShows, { entry: P; path: string }>>;
  mainMenu: MenuItem[];
  footerMenu: MenuItem[];
};

export type ContentInput<P, S, N> = {
  language: Language;
  settings: SiteData<unknown>;
  contacts: ContactsData;
  pages: P[];
  services: S[];
  news: N[];
};

// Files the build writes besides the pages; links may point to them.
export const BUILT_FILES = ["/sitemap.xml", "/robots.txt"] as const;

export class ContentError extends Error {
  constructor(readonly problems: string[]) {
    super(`The content in data/v2 breaks ${problems.length} rule(s):\n- ${problems.join("\n- ")}`);
    this.name = "ContentError";
  }
}

export const pagePath = (id: string): string => (id === "index" ? "/" : `/${id}/`);
export const newsSlug = (id: string): string => NEWS_FILE.exec(id)?.[2] ?? id;
// The calendar day of a date as YYYY-MM-DD; dates in the content are days, read as UTC.
export const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

const byOrder = <T extends { data: { order: number; title: string } }>(a: T, b: T) =>
  a.data.order - b.data.order || a.data.title.localeCompare(b.data.title, "cs");

export function buildSite<P extends PageEntry, S extends ServiceEntry, N extends NewsEntry>(
  input: ContentInput<P, S, N>,
): SiteModel<P, S, N> {
  const problems: string[] = [];

  if (!input.settings.locale.startsWith(`${input.language}_`)) {
    problems.push(
      `site.yaml: locale ${input.settings.locale} is not of the website's language ${input.language}`,
    );
  }
  for (const page of input.pages) {
    if (!page.id.split("/").every((segment) => SLUG.test(segment))) {
      problems.push(
        `pages/${page.id}.md: a file name has lowercase letters, digits and hyphens only`,
      );
    }
  }
  for (const service of input.services) {
    if (!SLUG.test(service.id)) {
      problems.push(
        `services/${service.id}.md: a file name has lowercase letters, digits and hyphens only`,
      );
    }
  }
  for (const item of input.news) {
    const match = NEWS_FILE.exec(item.id);
    if (!match) {
      problems.push(`news/${item.id}.md: the file name is YYYY-MM-DD-name.md`);
    } else if (match[1] !== isoDay(item.data.date)) {
      problems.push(
        `news/${item.id}.md: date ${isoDay(item.data.date)} differs from the date in the file name`,
      );
    }
  }

  const home = input.pages.find((page) => page.id === "index");
  if (!home) problems.push("pages/index.md is missing: it is the home page");
  if (home?.data.shows) {
    problems.push("pages/index.md: the home page shows services and news by itself; remove shows");
  }

  const lists: SiteModel<P, S, N>["lists"] = {};
  for (const page of input.pages) {
    const shows = page.data.shows;
    if (!shows || page.id === "index") continue;
    const other = lists[shows];
    if (other) {
      problems.push(
        `pages/${page.id}.md: only one page shows ${shows}; pages/${other.entry.id}.md does already`,
      );
    } else {
      lists[shows] = { entry: page, path: pagePath(page.id) };
    }
  }
  if (input.services.length > 0 && !lists.services) {
    problems.push("services/ has services, but no page shows them (shows: services)");
  }
  if (input.news.length > 0 && !lists.news) {
    problems.push("news/ has news, but no page shows them (shows: news)");
  }

  const services = [...input.services]
    .sort(byOrder)
    .map((entry) => ({ entry, path: `${lists.services?.path ?? "/"}${entry.id}/` }));
  const news = input.news
    .filter((item) => !item.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id))
    .map((entry) => ({ entry, path: `${lists.news?.path ?? "/"}${newsSlug(entry.id)}/` }));

  const routes: Route<P, S, N>[] = [
    ...input.pages.map((entry) => ({ kind: "page" as const, path: pagePath(entry.id), entry })),
  ];
  if (lists.services) {
    const list = lists.services.entry;
    routes.push(
      ...services.map(({ entry, path }) => ({ kind: "service" as const, path, entry, list })),
    );
  }
  if (lists.news) {
    const list = lists.news.entry;
    routes.push(...news.map(({ entry, path }) => ({ kind: "news" as const, path, entry, list })));
  }
  const seen = new Map<string, string>();
  for (const route of routes) {
    const name = `${route.kind} ${route.entry.id}`;
    const other = seen.get(route.path);
    if (other) problems.push(`${name} and ${other} both want the address ${route.path}`);
    seen.set(route.path, name);
  }

  // Every link inside the website leads to a page that is built.
  const known = new Set<string>([...seen.keys(), ...BUILT_FILES]);
  const checkLink = (where: string, href: string) => {
    if (!href.startsWith("/")) return;
    const path = href.split("#")[0] ?? href;
    if (!known.has(path)) {
      const hint = known.has(`${path}/`) ? ` (did you mean ${path}/?)` : "";
      problems.push(`${where}: the link ${href} leads to no page of the website${hint}`);
    }
  };
  const checkBody = (where: string, body: string | undefined) => {
    for (const href of internalLinks(body ?? "")) checkLink(where, href);
  };
  const cta = input.settings.callToAction;
  if (cta) checkLink("site.yaml", cta.action.href);
  for (const page of input.pages) {
    const where = `pages/${page.id}.md`;
    for (const item of page.data.hero?.actions ?? []) checkLink(where, item.href);
    checkBody(where, page.body);
  }
  for (const service of input.services) checkBody(`services/${service.id}.md`, service.body);
  for (const item of input.news) {
    if (!item.data.draft) checkBody(`news/${item.id}.md`, item.body);
  }

  // Every image in a text says what it shows, for people who do not see it.
  for (const [where, body] of [
    ...input.pages.map((page) => [`pages/${page.id}.md`, page.body] as const),
    ...input.services.map((service) => [`services/${service.id}.md`, service.body] as const),
    ...input.news.map((item) => [`news/${item.id}.md`, item.body] as const),
  ]) {
    problems.push(...imageProblems(body ?? "").map((problem) => `${where}: ${problem}`));
  }

  if (problems.length > 0 || !home) throw new ContentError(problems);

  const menu = (where: "main" | "footer"): MenuItem[] =>
    input.pages
      .filter((page) => page.data.menu === where)
      .sort(byOrder)
      .map((page) => ({ label: page.data.title, path: pagePath(page.id) }));

  return {
    language: input.language,
    home,
    routes,
    services,
    news,
    lists,
    mainMenu: menu("main"),
    footerMenu: menu("footer"),
  };
}

// Images of a Markdown text that render without an alternative text, in any
// form the parser renders (src/content/markdown.ts).
export function imageProblems(markdown: string): string[] {
  return renderedNodes(markdown)
    .images.filter((image) => image.alt.trim() === "")
    .map((image) => `the image ${image.src || "without src"} has no alternative text`);
}

// The links of a Markdown text that render to a page of the website.
export function internalLinks(markdown: string): string[] {
  return renderedNodes(markdown).links.filter((href) => href.startsWith("/"));
}
