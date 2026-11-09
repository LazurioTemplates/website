// Addresses and titles for search engines and link previews. The website's
// own origin comes from `url` in data/v2/site.yaml, so every canonical
// address, Open Graph link and sitemap entry points to the public website,
// wherever the build is served.

export function absoluteUrl(origin: string, path: string): string {
  return new URL(path, `${origin}/`).href;
}

// "Page | Example"; the home page uses its headline instead of "Úvod".
export function documentTitle(title: string | undefined, siteName: string): string {
  return title ? `${title} | ${siteName}` : siteName;
}

export function robotsTxt(origin: string, indexing: boolean): string {
  return indexing
    ? `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl(origin, "/sitemap.xml")}\n`
    : "User-agent: *\nDisallow: /\n";
}

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function sitemapXml(
  origin: string,
  entries: readonly { path: string; lastModified?: Date | undefined }[],
): string {
  const urls = entries.map(({ path, lastModified }) => {
    const lastmod = lastModified
      ? `<lastmod>${lastModified.toISOString().slice(0, 10)}</lastmod>`
      : "";
    return `  <url><loc>${escapeXml(absoluteUrl(origin, path))}</loc>${lastmod}</url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

// Structured data of the Organization for search engines (schema.org), as
// JSON that is safe inside a <script> element.
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
