import { describe, expect, test } from "bun:test";
import { renderedNodes } from "../src/content/markdown";
import { buildSite, internalLinks, newsSlug, pagePath } from "../src/content/model";
import type { NewsData, PageData, ServiceData } from "../src/content/schemas";

// Addresses, menus and lists of the website from its content, on a minimal
// invented website.
const page = (id: string, data: Partial<PageData<unknown>> = {}) => ({
  id,
  body: "",
  data: { title: id, description: "d", menu: "none", order: 100, ...data } as PageData<unknown>,
});
const service = (id: string, order: number) => ({
  id,
  data: { title: id, summary: "s", description: "d", order } as ServiceData<unknown>,
});
const news = (id: string, draft = false) => ({
  id,
  data: {
    title: id,
    summary: "s",
    date: new Date(`${id.slice(0, 10)}T00:00:00Z`),
    draft,
  } as NewsData<unknown>,
});
const settings = { locale: "cs_CZ", callToAction: undefined } as never;
const contacts = {} as never;

describe("site model", () => {
  const site = buildSite({
    language: "cs",
    settings,
    contacts,
    pages: [
      page("index"),
      page("produkty", { shows: "services", menu: "main", order: 2 }),
      page("novinky", { shows: "news", menu: "main", order: 1 }),
      page("pravni/podminky", { menu: "footer" }),
    ],
    services: [service("b", 20), service("a", 10)],
    news: [news("2026-01-02-starsi"), news("2026-03-04-novejsi"), news("2026-05-06-koncept", true)],
  });

  test("a page lives at its file name, the home page at /", () => {
    expect(pagePath("index")).toBe("/");
    expect(pagePath("pravni/podminky")).toBe("/pravni/podminky/");
    expect(site.routes.filter((r) => r.kind === "page").map((r) => r.path)).toEqual([
      "/",
      "/produkty/",
      "/novinky/",
      "/pravni/podminky/",
    ]);
  });

  test("services and news live below the page that shows them", () => {
    expect(site.services.map((s) => s.path)).toEqual(["/produkty/a/", "/produkty/b/"]);
    expect(newsSlug("2026-03-04-novejsi")).toBe("novejsi");
    expect(site.news.map((n) => n.path)).toEqual(["/novinky/novejsi/", "/novinky/starsi/"]);
  });

  test("a draft news item is neither listed nor built", () => {
    expect(site.routes.some((r) => r.path.includes("koncept"))).toBe(false);
    expect(site.news.some((n) => n.entry.id.includes("koncept"))).toBe(false);
  });

  test("menus follow menu and order", () => {
    expect(site.mainMenu).toEqual([
      { label: "novinky", path: "/novinky/" },
      { label: "produkty", path: "/produkty/" },
    ]);
    expect(site.footerMenu).toEqual([{ label: "pravni/podminky", path: "/pravni/podminky/" }]);
  });

  test("two things at one address are refused", () => {
    expect(() =>
      buildSite({
        language: "cs",
        settings,
        contacts,
        pages: [page("index"), page("produkty", { shows: "services" }), page("produkty/a")],
        services: [service("a", 1)],
        news: [],
      }),
    ).toThrow("both want the address /produkty/a/");
  });

  test("the locale belongs to the website's language", () => {
    expect(() =>
      buildSite({
        language: "en",
        settings,
        contacts,
        pages: [page("index")],
        services: [],
        news: [],
      }),
    ).toThrow("locale cs_CZ is not of the website's language en");
  });

  test("links and images are read from what the Markdown renders", () => {
    expect(
      internalLinks('[a](/x/) [b](https://e.com) <a href="/y/#z">c</a> [d][r]\n\n[r]:\n  /w/'),
    ).toEqual(["/x/", "/y/#z", "/w/"]);
    expect(renderedNodes('![A](a.png) ![][b] <img src="c.png">\n\n[b]: b.png').images).toEqual([
      { src: "a.png", alt: "A" },
      { src: "b.png", alt: "" },
      { src: "c.png", alt: "" },
    ]);
  });
});
