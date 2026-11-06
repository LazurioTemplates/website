import { afterAll, describe, expect, test } from "bun:test";
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readLanguage } from "../src/content/language";
import { checkContent, splitFrontmatter } from "../src/content/read";
import { data, tempDir } from "./support";

// The content contract of data/v2/ (src/content/schemas.ts and the rules of
// src/content/model.ts): the template's own content passes in both
// languages, and each kind of mistake an agent or a person can make is
// reported with its file.

const copies: string[] = [];
afterAll(() => {
  for (const dir of copies) rmSync(dir, { recursive: true, force: true });
});

// A copy of data/v2 with one change, and the problems the validator reports.
function problemsAfter(change: (dir: string) => void): string[] {
  const dir = tempDir("data");
  copies.push(dir);
  cpSync(data, dir, { recursive: true });
  change(dir);
  return checkContent(dir);
}

const edit = (dir: string, path: string, from: string | RegExp, to: string) => {
  const file = join(dir, path);
  const text = readFileSync(file, "utf8");
  const next = text.replace(from, to);
  if (next === text) throw new Error(`${path} does not contain ${from}`);
  writeFileSync(file, next);
};

describe("data/v2", () => {
  test("the template's content follows its schemas and rules", () => {
    expect(checkContent(data)).toEqual([]);
  });

  test("both languages of the template follow the same rules", () => {
    for (const language of ["cs", "en"]) {
      expect(existsSync(join(data, language, "site.yaml")), language).toBe(true);
    }
    const english = problemsAfter((dir) =>
      edit(dir, "en/pages/about.md", /^description: .*$/m, "description: Short."),
    );
    expect(english.some((p) => p.startsWith("en/pages/about.md: description"))).toBe(true);
  });

  test("the website's language is cs or en and has its directory", () => {
    expect(readLanguage(data, "")).toBe("cs");
    const unknown = problemsAfter((dir) =>
      edit(dir, "language.yaml", "language: cs", "language: de"),
    );
    expect(unknown).toEqual(["data/v2/language.yaml: language is cs or en"]);
    const missing = problemsAfter((dir) => {
      edit(dir, "language.yaml", "language: cs", "language: en");
      rmSync(join(dir, "en"), { recursive: true });
    });
    expect(missing).toContain("data/v2/en/ is missing: it is the website's language");
    const stray = problemsAfter((dir) =>
      cpSync(join(dir, "en"), join(dir, "de"), { recursive: true }),
    );
    expect(stray.join("\n")).toContain("data/v2/de/ is not a language of the website");
    // Without the file the website is Czech.
    const dir = tempDir("language");
    copies.push(dir);
    expect(readLanguage(dir, "")).toBe("cs");
    expect(readLanguage(dir, "en")).toBe("en");
    expect(() => readLanguage(dir, "de")).toThrow("WEBSITE_LANGUAGE");
  });

  test("front matter is read with LF and CRLF line ends", () => {
    expect(splitFrontmatter("---\ntitle: A\n---\nText")).toEqual({
      frontmatter: "title: A",
      body: "Text",
    });
    expect(splitFrontmatter("---\r\ntitle: A\r\n---\r\nText")?.frontmatter).toBe("title: A");
    expect(splitFrontmatter("title: A")).toBeNull();
  });

  test("a misspelt field is an error, not ignored", () => {
    const problems = problemsAfter((dir) =>
      edit(dir, "cs/pages/o-nas.md", "description:", "descripton:"),
    );
    expect(problems.join("\n")).toContain("cs/pages/o-nas.md");
    expect(problems.join("\n")).toMatch(/descripton|description/);
  });

  test("a description too short for search engines is an error", () => {
    const problems = problemsAfter((dir) =>
      edit(dir, "cs/services/skoleni-tymu.md", /^description: .*$/m, "description: Krátký popis."),
    );
    expect(problems.some((p) => p.startsWith("cs/services/skoleni-tymu.md: description"))).toBe(
      true,
    );
  });

  test("an image needs its alternative text, and the file must exist", () => {
    const withoutAlt = problemsAfter((dir) =>
      edit(dir, "cs/news/2026-09-08-co-ukazalo-38-experimentu.md", /^imageAlt: .*\n/m, ""),
    );
    expect(withoutAlt.join("\n")).toContain("image and imageAlt go together");
    const missing = problemsAfter((dir) =>
      edit(
        dir,
        "cs/news/2026-09-08-co-ukazalo-38-experimentu.md",
        "vysledky-experimentu.png",
        "chybi.png",
      ),
    );
    expect(missing.join("\n")).toContain("the image ../media/chybi.png does not exist");
    const inBody = problemsAfter((dir) =>
      edit(dir, "cs/pages/o-nas.md", "## Kdo jsme", "![](../media/share.png)\n\n## Kdo jsme"),
    );
    expect(inBody.join("\n")).toContain("has no alternative text");
  });

  test("a link inside the website must lead to a page, with its trailing slash", () => {
    const dead = problemsAfter((dir) =>
      edit(dir, "cs/pages/index.md", "(/kontakt/)", "(/kontakty/)"),
    );
    expect(dead).toContain(
      "cs/pages/index.md: the link /kontakty/ leads to no page of the website",
    );
    const slash = problemsAfter((dir) =>
      edit(dir, "cs/pages/index.md", "(/kontakt/)", "(/kontakt)"),
    );
    expect(slash.join("\n")).toContain("(did you mean /kontakt/?)");
    const action = problemsAfter((dir) =>
      edit(dir, "cs/site.yaml", "href: /kontakt/", "href: /nic/"),
    );
    expect(action).toContain("cs/site.yaml: the link /nic/ leads to no page of the website");
  });

  test("a link to a draft news item is dead until it is published", () => {
    const problems = problemsAfter((dir) => {
      edit(
        dir,
        "cs/news/2026-06-15-stehujeme-se-do-vetsi-kancelare.md",
        "---\n\n",
        "draft: true\n---\n\n",
      );
      edit(
        dir,
        "cs/pages/o-nas.md",
        "## Kdo jsme",
        "[Stěhování](/aktuality/stehujeme-se-do-vetsi-kancelare/)\n\n## Kdo jsme",
      );
    });
    expect(problems.join("\n")).toContain(
      "/aktuality/stehujeme-se-do-vetsi-kancelare/ leads to no page",
    );
  });

  test("the date of a news item matches its file name", () => {
    const problems = problemsAfter((dir) =>
      edit(
        dir,
        "cs/news/2026-10-20-nova-sluzba-skoleni-tymu.md",
        "date: 2026-10-20",
        "date: 2026-10-21",
      ),
    );
    expect(problems).toContain(
      "cs/news/2026-10-20-nova-sluzba-skoleni-tymu.md: date 2026-10-21 differs from the date in the file name",
    );
  });

  test("one page shows each list, and the home page exists", () => {
    const twice = problemsAfter((dir) =>
      edit(dir, "cs/pages/o-nas.md", "order: 20", "order: 20\nshows: services"),
    );
    expect(twice.join("\n")).toContain("only one page shows services");
    const noHome = problemsAfter((dir) => rmSync(join(dir, "cs/pages/index.md")));
    expect(noHome).toContain("cs/pages/index.md is missing: it is the home page");
    const unlisted = problemsAfter((dir) =>
      edit(dir, "cs/pages/sluzby.md", "shows: services\n", ""),
    );
    expect(unlisted).toContain(
      "cs/services/ has services, but no page shows them (shows: services)",
    );
  });

  test("a file name is an address: lowercase letters, digits and hyphens", () => {
    const problems = problemsAfter((dir) =>
      cpSync(join(dir, "cs/pages/o-nas.md"), join(dir, "cs/pages/O nás.md")),
    );
    expect(problems.join("\n")).toContain("cs/pages/O nás.md: a file name has lowercase letters");
  });

  test("contacts keep their shape", () => {
    const problems = problemsAfter((dir) =>
      edit(dir, "cs/contacts.yaml", 'id: "00000000"', "id: 123"),
    );
    expect(problems.join("\n")).toContain("cs/contacts.yaml: company.id");
  });
});
