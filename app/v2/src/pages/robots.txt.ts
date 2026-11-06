import type { APIRoute } from "astro";
import { robotsTxt } from "../lib/seo";
import { loadSite } from "../lib/site";

// Search engines may index the website only once `indexing: true` is set in
// data/v2/site.yaml, at its publication (docs/publishing.md).
export const GET: APIRoute = async () => {
  const { settings } = await loadSite();
  return new Response(robotsTxt(settings.url, settings.indexing), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
