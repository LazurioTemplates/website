import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { z } from "astro/zod";
import { isLanguage, LANGUAGES, type Language, readLanguage } from "./language";
import {
  buildSite,
  ContentError,
  type NewsEntry,
  type PageEntry,
  type ServiceEntry,
  type SiteModel,
} from "./model";
import { contactsSchema, newsSchema, pageSchema, serviceSchema, siteSchema } from "./schemas";

// Reads and checks data/v2/ without Astro, for `bun run validate:data` and the
// tests: data/v2/language.yaml, and in every language's directory each file
// against its schema (src/content/schemas.ts), the images it names and the
// rules of the whole website (src/content/model.ts). The answer is the list
// of problems, each with its file; an empty list means the content builds.
// The language the website is built in must have its directory; the other
// language's directory, where it is kept, is checked the same way.

const IMAGE = /\.(?:png|jpe?g|webp|avif|gif|svg)$/i;
// In the validator an image is the path written in the file.
const imagePath = z
  .string()
  .regex(IMAGE, "must name a .png, .jpg, .webp, .avif, .gif or .svg file");

const posix = (path: string) => path.split(sep).join("/");

function markdownFiles(dir: string, recursive: boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return recursive ? markdownFiles(path, true) : [];
    return name.endsWith(".md") ? [path] : [];
  });
}

export function splitFrontmatter(text: string): { frontmatter: string; body: string } | null {
  const normalized = text.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n?---(?:\n|$)([\s\S]*)$/.exec(normalized);
  return match ? { frontmatter: match[1] ?? "", body: match[2] ?? "" } : null;
}

export function checkContent(data: string): string[] {
  let language: Language;
  try {
    // The file, never the override: the check is of the repository.
    language = readLanguage(data, "");
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  const present = LANGUAGES.filter((lang) => existsSync(join(data, lang)));
  const problems: string[] = [];
  if (!present.includes(language)) {
    problems.push(`data/v2/${language}/ is missing: it is the website's language`);
  }
  for (const name of readdirSync(data)) {
    if (statSync(join(data, name)).isDirectory() && !isLanguage(name)) {
      problems.push(`data/v2/${name}/ is not a language of the website (${LANGUAGES.join(", ")})`);
    }
  }
  for (const lang of present) problems.push(...checkLanguage(join(data, lang), lang).problems);
  return problems;
}

export type CheckedLanguage = {
  problems: string[];
  site: SiteModel<PageEntry, ServiceEntry, NewsEntry> | null;
};

// The content of one language directory, checked, and its site model when it
// has no problem: the addresses the build writes (tests/build.test.ts).
export function readLanguageSite(data: string, language: Language): CheckedLanguage {
  return checkLanguage(join(data, language), language);
}

function checkLanguage(root: string, language: Language): CheckedLanguage {
  const problems: string[] = [];
  let site: CheckedLanguage["site"] = null;
  const name = (path: string) => `${language}/${posix(relative(root, path))}`;

  function parse<S extends z.ZodType>(file: string, schema: S, yaml: string): z.output<S> | null {
    let value: unknown;
    try {
      value = Bun.YAML.parse(yaml) ?? {};
    } catch (error) {
      problems.push(
        `${name(file)}: not valid YAML: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
    const result = schema.safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path.join(".");
        problems.push(`${name(file)}: ${field ? `${field}: ` : ""}${issue.message}`);
      }
      return null;
    }
    return result.data;
  }

  function checkImage(file: string, path: unknown) {
    if (typeof path !== "string") return;
    const target = join(dirname(file), path);
    if (!existsSync(target) || !statSync(target).isFile()) {
      problems.push(`${name(file)}: the image ${path} does not exist`);
    }
  }

  // That the images of a text exist; their alternative text is a rule of the
  // site model, which the build checks too.
  function checkBodyImages(file: string, body: string) {
    for (const [, , src] of body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)/g)) {
      if (src && !/^[a-z]+:/.test(src) && !src.startsWith("/")) checkImage(file, src);
    }
  }

  function yamlFile<S extends z.ZodType>(file: string, schema: S): z.output<S> | null {
    if (!existsSync(file)) {
      problems.push(`${name(file)} is missing`);
      return null;
    }
    return parse(file, schema, readFileSync(file, "utf8"));
  }

  function entries<D>(
    dir: string,
    recursive: boolean,
    schema: z.ZodType<D>,
    images: (data: D) => unknown[],
  ): { id: string; data: D; body: string }[] {
    return markdownFiles(dir, recursive).flatMap((file) => {
      const split = splitFrontmatter(readFileSync(file, "utf8"));
      if (!split) {
        problems.push(`${name(file)}: starts with front matter between two --- lines`);
        return [];
      }
      const parsed = parse(file, schema, split.frontmatter);
      checkBodyImages(file, split.body);
      if (parsed === null) return [];
      for (const image of images(parsed)) checkImage(file, image);
      const id = posix(relative(dir, file)).replace(/\.md$/, "");
      return [{ id, data: parsed, body: split.body }];
    });
  }

  const settingsFile = join(root, "site.yaml");
  const settings = yamlFile(settingsFile, siteSchema(imagePath));
  if (settings) checkImage(settingsFile, settings.shareImage);
  const contacts = yamlFile(join(root, "contacts.yaml"), contactsSchema);
  const pages = entries(join(root, "pages"), true, pageSchema(imagePath), (d) => [d.image]);
  const services = entries(join(root, "services"), false, serviceSchema(imagePath), (d) => [
    d.image,
  ]);
  const news = entries(join(root, "news"), false, newsSchema(imagePath), (d) => [d.image]);

  // The rules of the whole website need every file; check them only when
  // each file is right, so that one mistake is not reported twice.
  if (problems.length === 0 && settings && contacts) {
    try {
      site = buildSite({
        language,
        settings,
        contacts,
        pages: pages as PageEntry[],
        services: services as ServiceEntry[],
        news: news as NewsEntry[],
      });
    } catch (error) {
      if (!(error instanceof ContentError)) throw error;
      problems.push(...error.problems.map((problem) => `${language}/${problem}`));
    }
  }
  return { problems, site };
}
