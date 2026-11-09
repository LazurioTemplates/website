import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import packageJson from "../package.json";
import { LANGUAGES, type Language, readLanguage } from "../src/content/language";
import { renderedNodes } from "../src/content/markdown";
import { readLanguageSite } from "../src/content/read";
import { texts } from "../src/lib/texts";
import { app, data, fixture, tempDir } from "./support";

// The build contract of the Lazurio Module Standard (The built version from
// `main`): the Launchpad runs `build_script` with only bun on PATH,
// `NODE_ENV=production` and no listener, then serves `build_output` with its
// own static server; the health path must resolve to a file directly. And
// what a website owes its readers and search engines on every page of every
// language the module keeps: exactly the pages its content publishes (no
// draft), one h1, a title and description, a canonical address, link
// previews, images with alternative text, landmarks, links that lead
// somewhere, no request to another origin, little JavaScript and the words of
// one language. The build itself stops on a broken rule of the content.
const runtime = packageJson.lazurio.runtime;
const [entrypoint] = runtime.listeners;
if (!entrypoint) throw new Error("lazurio.runtime declares no listener");
const output = join(app, runtime.build_output);
const buildTimeoutMs = 300_000;
const configured = readLanguage(data, "");
// The languages whose content the module keeps (an adopted module keeps one).
const kept = LANGUAGES.filter((language) => existsSync(join(data, language)));

type Built = { dir: string; pages: { address: string; html: string }[] };
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

// The build exactly as the Launchpad runs it. WEBSITE_LANGUAGE builds a kept
// language other than the configured one, WEBSITE_DATA a test fixture;
// Lazurio sets neither.
function runBuild(extra: Record<string, string>) {
  rmSync(output, { recursive: true, force: true });
  return Bun.spawnSync([process.execPath, "--no-env-file", "run", runtime.build_script], {
    cwd: app,
    env: {
      HOME: process.env.HOME ?? "",
      PATH: dirname(process.execPath),
      NODE_ENV: "production",
      ...extra,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
}

function build(name: string, extra: Record<string, string>): Built {
  const run = runBuild(extra);
  if (run.exitCode !== 0) {
    throw new Error(`the ${name} build failed:\n${run.stdout}\n${run.stderr}`);
  }
  const dir = join(copies, name);
  cpSync(output, dir, { recursive: true });
  const pages = files(dir, ".html")
    .filter((file) => !file.endsWith("404.html"))
    .map((file) => {
      const path = posix(relative(dir, dirname(file)));
      return { address: path === "" ? "/" : `/${path}/`, html: readFileSync(file, "utf8") };
    });
  return { dir, pages };
}

// The addresses the content publishes, from the same site model the build uses.
function published(dataDir: string, language: Language): string[] {
  const { problems, site } = readLanguageSite(dataDir, language);
  if (!site) throw new Error(`the content of ${language} has problems:\n${problems.join("\n")}`);
  return site.routes.map((route) => route.path).sort();
}

const builds = new Map<string, Built>();
beforeAll(() => {
  builds.set("fixture", build("fixture", { WEBSITE_DATA: fixture }));
  // The configured language last, so that dist/ is what Lazurio would serve.
  for (const language of [...kept.filter((l) => l !== configured), configured]) {
    builds.set(
      language,
      build(language, language === configured ? {} : { WEBSITE_LANGUAGE: language }),
    );
  }
}, buildTimeoutMs);
afterAll(() => rmSync(copies, { recursive: true, force: true }));

describe("build contract", () => {
  test("the build is declared, and the health path is a file of the output", () => {
    expect(runtime.build_script).toBe("build");
    expect(runtime.build_output).toBe("dist");
    const path = entrypoint.health.path;
    const candidates = path.endsWith("/") ? [`${path}index.html`] : [path, `${path}.html`];
    expect(candidates.some((file) => isFile(join(output, file)))).toBe(true);
  });

  test("the static fallback has its 404 page", () => {
    expect(runtime.static_fallback).toBe("404");
    const html = readFileSync(join(output, "404.html"), "utf8");
    expect(html).toContain('content="noindex, nofollow"');
    expect(html).not.toContain('rel="canonical"');
  });

  // Each form, built: the build stops with the problem the content check
  // names (src/content/markdown.ts reads what the parser renders).
  const broken: [string, string, string][] = [
    [
      "an inline image without alternative text",
      "![](../media/share.png)",
      "pages/index.md: the image ../media/share.png has no alternative text",
    ],
    [
      "a reference image without alternative text",
      "![][image]\n\n[image]: https://example.org/asset.png",
      "pages/index.md: the image https://example.org/asset.png has no alternative text",
    ],
    [
      "an HTML image without alternative text",
      '<img src="https://example.org/asset.png">',
      "pages/index.md: the image https://example.org/asset.png has no alternative text",
    ],
    [
      "a reference link that leads nowhere",
      "[Kontakt][k]\n\n[k]:\n  /kontakty/",
      "pages/index.md: the link /kontakty/ leads to no page of the website",
    ],
  ];
  for (const [form, markdown, problem] of broken) {
    test(
      `the build stops on a broken rule of the content: ${form}`,
      () => {
        // Beside the App, as content always is: on Windows Astro cannot resolve
        // the images of content on another drive than the App (a temporary
        // directory on C: while the checkout is on D:).
        const cache = join(app, "node_modules", ".cache");
        mkdirSync(cache, { recursive: true });
        const dir = mkdtempSync(join(cache, "website-broken-content-"));
        cpSync(fixture, dir, { recursive: true });
        const page = join(dir, "cs/pages/index.md");
        writeFileSync(
          page,
          readFileSync(page, "utf8").replace("Text úvodní", `${markdown}\n\nText úvodní`),
        );
        const run = runBuild({ WEBSITE_DATA: dir });
        rmSync(dir, { recursive: true, force: true });
        expect(run.exitCode).not.toBe(0);
        expect(`${run.stdout}${run.stderr}`).toContain(problem);
      },
      buildTimeoutMs,
    );
  }
});

describe("drafts and empty lists (the test fixture)", () => {
  const built = () => builds.get("fixture") as Built;
  const words = texts.cs;

  test("the build has exactly the published pages: no draft", () => {
    expect(
      built()
        .pages.map((p) => p.address)
        .sort(),
    ).toEqual(published(fixture, "cs"));
    expect(existsSync(join(built().dir, "aktuality/koncept"))).toBe(false);
    const sitemap = readFileSync(join(built().dir, "sitemap.xml"), "utf8");
    expect(sitemap).not.toContain("koncept");
  });

  test("the content check sees every image and link the page renders", () => {
    const html = built().pages.find((p) => p.address === "/zapis/")?.html ?? "";
    const body = readFileSync(join(fixture, "cs/pages/zapis.md"), "utf8").split(/\n---\n/)[1] ?? "";
    const seen = renderedNodes(body);
    const main = /<main[\s\S]*<\/main>/.exec(html)?.[0] ?? "";
    const rendered = [...main.matchAll(/<img\b[^>]*>/g)].map(([tag]) => tag);
    expect(seen.images.length).toBe(6);
    expect(rendered.length).toBe(seen.images.length);
    for (const { src, alt } of seen.images) {
      expect(
        rendered.some((tag) => tag.includes(`src="${src}"`) && tag.includes(`alt="${alt}"`)),
        src,
      ).toBe(true);
    }
    expect(seen.links.filter((href) => href.startsWith("/"))).toEqual([
      "/kontakt/",
      "/aktuality/",
      "/sluzby/",
      "/kontakt/",
    ]);
    for (const href of seen.links) expect(main, href).toContain(`href="${href}"`);
  });

  test("an empty list says so", () => {
    const html = (address: string) => built().pages.find((p) => p.address === address)?.html ?? "";
    expect(html("/sluzby/")).toContain(words.noServices);
    expect(html("/aktuality/")).toContain(words.noNews);
    expect(html("/")).not.toContain(words.servicesHeading);
    expect(html("/")).not.toContain(words.allNews);
  });
});

for (const language of kept) {
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
    test("the build has exactly the pages the content publishes", () => {
      expect(
        built()
          .pages.map((p) => p.address)
          .sort(),
      ).toEqual(published(data, language));
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
        expect(html, address).toMatch(/<a class="ds-skip-link" href="#content"/);
        expect(html, address).toMatch(/<main id="content"/);
        expect(html, address).toMatch(/<header class="site-header"/);
        expect(html, address).toMatch(/<footer class="site-footer"/);
        // A page of the main menu is marked as the current one, and only it.
        const current = attr(html, /<a [^>]*href="([^"]+)"[^>]*aria-current="page"/);
        if (current !== undefined) expect(current, address).toBe(address);
        const menu = /<nav [^>]*id="site-navigation"[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "";
        if (menu !== "") expect(menu, address).toContain(`aria-label="${words.mainNavigation}"`);
        if (menu.includes(`href="${address}"`)) {
          expect(menu, address).toMatch(
            new RegExp(`<a [^>]*href="${address}"[^>]*aria-current="page"`),
          );
        }
      }
    });

    test("describes every image and declares its size", () => {
      for (const { address, html } of built().pages) {
        for (const [img] of html.matchAll(/<img\b[^>]*>/g)) {
          expect(img, address).toMatch(/\salt="[^"]*\S[^"]*"/);
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
