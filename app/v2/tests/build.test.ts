import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cpSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import packageJson from "../package.json";
import { LANGUAGES, type Language, readLanguage } from "../src/content/language";
import { texts } from "../src/lib/texts";
import { app, data, tempDir } from "./support";

// The build contract of the Lazurio Module Standard (The built version from
// `main`): the Launchpad runs `build_script` with only bun on PATH,
// `NODE_ENV=production` and no listener, then serves `build_output` with its
// own static server; the health path must resolve to a file directly. And
// what a website owes its readers and search engines on every page, in each
// language of the template: one h1, a title and description, a canonical
// address, link previews, images with alternative text, landmarks, links that
// lead somewhere, no request to another origin, little JavaScript, and the
// words of one language only.
const runtime = packageJson.lazurio.runtime;
const [entrypoint] = runtime.listeners;
if (!entrypoint) throw new Error("lazurio.runtime declares no listener");
const output = join(app, runtime.build_output);
const buildTimeoutMs = 240_000;
const configured = readLanguage(data, "");

type Built = { dir: string; pages: { address: string; html: string }[] };
const builds = new Map<Language, Built>();
const copies = tempDir("build");

function files(dir: string, suffix: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path, suffix);
    return path.endsWith(suffix) ? [path] : [];
  });
}
const isFile = (path: string) => statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
const posix = (path: string) => path.split("\\").join("/");
const attr = (html: string, pattern: RegExp) => pattern.exec(html)?.[1];

// The build exactly as the Launchpad runs it; the language comes from
// data/v2/language.yaml, or for the other language from WEBSITE_LANGUAGE.
function build(language: Language): Built {
  rmSync(output, { recursive: true, force: true });
  const env: Record<string, string> = {
    HOME: process.env.HOME ?? "",
    PATH: dirname(process.execPath),
    NODE_ENV: "production",
  };
  if (language !== configured) env.WEBSITE_LANGUAGE = language;
  const run = Bun.spawnSync([process.execPath, "--no-env-file", "run", runtime.build_script], {
    cwd: app,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (run.exitCode !== 0) {
    throw new Error(`the ${language} build failed:\n${run.stdout}\n${run.stderr}`);
  }
  const dir = join(copies, language);
  cpSync(output, dir, { recursive: true });
  const pages = files(dir, ".html")
    .filter((file) => !file.endsWith("404.html"))
    .map((file) => {
      const path = posix(relative(dir, dirname(file)));
      return { address: path === "" ? "/" : `/${path}/`, html: readFileSync(file, "utf8") };
    });
  return { dir, pages };
}

beforeAll(() => {
  // The configured language last, so that dist/ is what Lazurio would serve.
  for (const language of [...LANGUAGES.filter((l) => l !== configured), configured]) {
    builds.set(language, build(language));
  }
}, buildTimeoutMs);
afterAll(() => rmSync(copies, { recursive: true, force: true }));

describe("build contract", () => {
  test("the health path is a file of the output", () => {
    const path = entrypoint.health.path;
    const candidates = path.endsWith("/") ? [`${path}index.html`] : [path, `${path}.html`];
    expect(candidates.some((file) => isFile(join(output, file)))).toBe(true);
    expect(runtime.build_script).toBe("build");
    expect(runtime.build_output).toBe("dist");
  });

  test("the static fallback has its 404 page", () => {
    expect(runtime.static_fallback).toBe("404");
    const html = readFileSync(join(output, "404.html"), "utf8");
    expect(html).toContain('content="noindex, nofollow"');
    expect(html).not.toContain('rel="canonical"');
  });
});

for (const language of LANGUAGES) {
  const site = Bun.YAML.parse(readFileSync(join(data, language, "site.yaml"), "utf8")) as {
    url: string;
    indexing: boolean;
  };
  const words = texts[language];
  const others = LANGUAGES.filter((l) => l !== language).flatMap((other) =>
    Object.entries(texts[other])
      .filter(
        ([key, value]) => typeof value === "string" && value !== words[key as keyof typeof words],
      )
      .map(([, value]) => value as string),
  );
  const built = () => builds.get(language) as Built;
  // An address the static server answers with a file of this build.
  const served = (href: string) => {
    const path = decodeURIComponent((href.split("#")[0] ?? "").split("?")[0] ?? "");
    const dir = built().dir;
    return path.endsWith("/") ? isFile(join(dir, path, "index.html")) : isFile(join(dir, path));
  };

  describe(`every page in ${language}`, () => {
    test("every page, service and news item of the language is built", () => {
      const markdown = (sub: string) =>
        readdirSync(join(data, language, sub), { recursive: true }).filter((name) =>
          String(name).endsWith(".md"),
        ).length;
      const expected = markdown("pages") + markdown("services") + markdown("news");
      expect(built().pages.length).toBe(expected);
    });

    test("has its language, one h1, a unique title and a description", () => {
      const titles = new Set<string>();
      for (const { address, html } of built().pages) {
        expect(html, address).toContain(`<html lang="${language}"`);
        expect((html.match(/<h1[\s>]/g) ?? []).length, address).toBe(1);
        const title = attr(html, /<title>([^<]+)<\/title>/);
        expect(title, address).toBeDefined();
        expect(titles.has(title as string), `${address} repeats the title ${title}`).toBe(false);
        titles.add(title as string);
        const description = attr(html, /<meta name="description" content="([^"]*)"/) ?? "";
        expect(description.length, address).toBeGreaterThanOrEqual(50);
      }
    });

    test("shows the interface words of its language only", () => {
      for (const { address, html } of built().pages) {
        expect(html, address).toContain(words.skipToContent);
        const text = html.replace(/<script[\s\S]*?<\/script>/g, "");
        for (const word of others)
          expect(text.includes(`>${word}<`), `${address}: ${word}`).toBe(false);
      }
    });

    test("names its canonical address and link preview on the public website", () => {
      for (const { address, html } of built().pages) {
        const canonical = new URL(address, `${site.url}/`).href;
        expect(attr(html, /<link rel="canonical" href="([^"]+)"/), address).toBe(canonical);
        expect(attr(html, /<meta property="og:url" content="([^"]+)"/), address).toBe(canonical);
        const image = attr(html, /<meta property="og:image" content="([^"]+)"/) ?? "";
        expect(image.startsWith(`${site.url}/_astro/`), address).toBe(true);
        expect(served(image.slice(site.url.length)), `${address}: ${image}`).toBe(true);
        expect(
          attr(html, /<meta property="og:image:alt" content="([^"]+)"/),
          address,
        ).toBeDefined();
        expect(html, address).toContain('<meta name="twitter:card" content="summary_large_image">');
        expect(html, address).toContain(
          site.indexing ? 'content="index, follow"' : 'content="noindex, nofollow"',
        );
      }
    });

    test("has landmarks, a skip link and a marked current page", () => {
      for (const { address, html } of built().pages) {
        expect(html, address).toMatch(/<a class="skip" href="#content"/);
        expect(html, address).toMatch(/<main id="content"/);
        expect(html, address).toMatch(/<header class="site-header"/);
        expect(html, address).toMatch(/<footer class="site-footer"/);
        expect(html, address).toContain(`aria-label="${words.mainNavigation}"`);
        // A page of the main menu is marked as the current one, and only it.
        const current = attr(html, /<a href="([^"]+)"[^>]*aria-current="page"/);
        if (current !== undefined) expect(current, address).toBe(address);
        const menu = /<nav id="site-navigation"[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "";
        if (menu.includes(`href="${address}"`)) {
          expect(menu, address).toMatch(new RegExp(`<a href="${address}"[^>]*aria-current="page"`));
        }
      }
    });

    test("describes every image and declares its size", () => {
      for (const { address, html } of built().pages) {
        for (const [img] of html.matchAll(/<img\b[^>]*>/g)) {
          expect(img, address).toMatch(/\salt="[^"]+"/);
          expect(img, address).toMatch(/\swidth="\d+"/);
          expect(img, address).toMatch(/\sheight="\d+"/);
        }
      }
    });

    test("links only to addresses that are served, ids are unique", () => {
      for (const { address, html } of built().pages) {
        for (const [, href] of html.matchAll(/\shref="(\/[^"]*)"/g)) {
          expect(served(href as string), `${address} links to ${href}`).toBe(true);
        }
        expect(html, address).not.toContain('href="#"');
        const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
        expect(
          ids.filter((id, i) => ids.indexOf(id) !== i),
          address,
        ).toEqual([]);
        for (const [, target] of html.matchAll(/\saria-(?:controls|labelledby)="([^"]+)"/g)) {
          expect(ids, `${address}: ${target}`).toContain(target);
        }
      }
    });

    test("loads nothing from another origin and little JavaScript", () => {
      for (const { address, html } of built().pages) {
        for (const [tag] of html.matchAll(/<(?:script|img|link|iframe|source)\b[^>]*>/g)) {
          if (/rel="canonical"/.test(tag)) continue;
          expect(tag, address).not.toMatch(/\s(?:src|href|srcset)="(?:https?:)?\/\//);
        }
        const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(([, src]) => src);
        const bytes = scripts.reduce(
          (sum, src) => sum + statSync(join(built().dir, src as string)).size,
          0,
        );
        const inline = [
          ...html.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g),
        ]
          .map(([, code]) => (code ?? "").length)
          .reduce((sum, length) => sum + length, 0);
        expect(bytes + inline, address).toBeLessThan(4_000);
      }
    });

    test("the home page describes the Organization for search engines", () => {
      const home = built().pages.find((p) => p.address === "/")?.html ?? "";
      const json = attr(home, /<script type="application\/ld\+json">([^<]+)<\/script>/);
      const organization = JSON.parse(json ?? "{}");
      expect(organization["@type"]).toBe("Organization");
      expect(organization.url).toBe(`${site.url}/`);
    });

    test("the sitemap lists every page at its public address and nothing else", () => {
      const xml = readFileSync(join(built().dir, "sitemap.xml"), "utf8");
      const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc).sort();
      expect(listed).toEqual(
        built()
          .pages.map((p) => new URL(p.address, `${site.url}/`).href)
          .sort(),
      );
    });

    test("robots.txt follows indexing", () => {
      const robots = readFileSync(join(built().dir, "robots.txt"), "utf8");
      if (site.indexing) {
        expect(robots).toContain(`Sitemap: ${site.url}/sitemap.xml`);
      } else {
        expect(robots).toBe("User-agent: *\nDisallow: /\n");
      }
    });
  });
}
