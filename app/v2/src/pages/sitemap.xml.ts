import type { APIRoute } from "astro";
import { sitemapXml } from "../lib/seo";
import { loadSite } from "../lib/site";

// Every page of the website for search engines, at the public addresses of
// data/v2/site.yaml. News carry their date as the last change.
export const GET: APIRoute = async () => {
  const site = await loadSite();
  const entries = site.routes.map((route) => ({
    path: route.path,
    lastModified: route.kind === "news" ? route.entry.data.date : undefined,
  }));
  return new Response(sitemapXml(site.settings.url, entries), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
