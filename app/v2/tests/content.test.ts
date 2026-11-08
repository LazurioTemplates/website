import { afterAll, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readLanguage } from "../src/content/language";
import { checkContent, splitFrontmatter } from "../src/content/read";
import { data, fixture, tempDir } from "./support";

// The content contract of data/v2/ (src/content/schemas.ts and the rules of
// src/content/model.ts). The module's own content passes, whatever it is; each
// kind of mistake an agent or a person can make is reported with its file, on
// copies of the test fixture (tests/fixtures/content/), which stays the same
// when a module replaces its example content.

const copies: string[] = [];
afterAll(() => {
  for (const dir of copies) rmSync(dir, { recursive: true, force: true });
});

// A copy of the fixture with one change, and the problems the validator reports.
function problemsAfter(change: (dir: string) => void): string[] {
  const dir = tempDir("content");
  copies.push(dir);
  cpSync(fixture, dir, { recursive: true });
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

const write = (dir: string, path: string, text: string) => {
  mkdirSync(join(dir, path, ".."), { recursive: true });
  writeFileSync(join(dir, path), text);
};

const service = `---
title: Zkušební služba
summary: Služba zkušebního webu pro testy.
description: Služba zkušebního webu, která existuje jen kvůli testům obsahu.
---

Text služby.
`;

describe("the module's content", () => {
  test("data/v2 follows its schemas and rules", () => {
    expect(checkContent(data)).toEqual([]);
  });
});

describe("the content checks", () => {
  test("the fixture passes", () => {
    expect(checkContent(fixture)).toEqual([]);
  });

  test("front matter is read with LF and CRLF line ends", () => {
    expect(splitFrontmatter("---\ntitle: A\n---\nText")).toEqual({
      frontmatter: "title: A",
      body: "Text",
    });
    expect(splitFrontmatter("---\r\ntitle: A\r\n---\r\nText")?.frontmatter).toBe("title: A");
    expect(splitFrontmatter("title: A")).toBeNull();
  });

  test("the website's language is cs or en and has its directory", () => {
    expect(readLanguage(fixture, "")).toBe("cs");
    const unknown = problemsAfter((dir) =>
      edit(dir, "language.yaml", "language: cs", "language: de"),
    );
    expect(unknown).toEqual(["data/v2/language.yaml: language is cs or en"]);
    const missing = problemsAfter((dir) =>
      edit(dir, "language.yaml", "language: cs", "language: en"),
    );
    expect(missing).toContain("data/v2/en/ is missing: it is the website's language");
    const stray = problemsAfter((dir) =>
      cpSync(join(dir, "cs"), join(dir, "de"), { recursive: true }),
    );
    expect(stray.join("\n")).toContain("data/v2/de/ is not a language of the website");
    // Without the file the website is Czech.
    const dir = tempDir("language");
    copies.push(dir);
    expect(readLanguage(dir, "")).toBe("cs");
    expect(readLanguage(dir, "en")).toBe("en");
    expect(() => readLanguage(dir, "de")).toThrow("WEBSITE_LANGUAGE");
  });

  test("a misspelt field is an error, not ignored", () => {
    const problems = problemsAfter((dir) =>
      edit(dir, "cs/pages/kontakt.md", "description:", "descripton:"),
    );
    expect(problems.join("\n")).toContain("cs/pages/kontakt.md");
  });

  test("a description too short for search engines is an error", () => {
    const problems = problemsAfter((dir) =>
      edit(dir, "cs/pages/kontakt.md", /^description: .*$/m, "description: Krátký popis."),
    );
    expect(problems.some((p) => p.startsWith("cs/pages/kontakt.md: description"))).toBe(true);
  });

  test("an image needs its alternative text, and the file must exist", () => {
    const withoutAlt = problemsAfter((dir) =>
      edit(
        dir,
        "cs/pages/kontakt.md",
        "shows: contacts",
        "shows: contacts\nimage: ../media/share.png",
      ),
    );
    expect(withoutAlt.join("\n")).toContain("image and imageAlt go together");
    const missing = problemsAfter((dir) =>
      edit(dir, "cs/site.yaml", "./media/share.png", "./media/chybi.png"),
    );
    expect(missing.join("\n")).toContain("the image ./media/chybi.png does not exist");
    const inText = problemsAfter((dir) =>
      edit(dir, "cs/pages/index.md", "Text úvodní", "![](../media/share.png)\n\nText úvodní"),
    );
    expect(inText).toContain(
      "cs/pages/index.md: the image ../media/share.png has no alternative text",
    );
    const inHtml = problemsAfter((dir) =>
      edit(
        dir,
        "cs/pages/index.md",
        "Text úvodní",
        '<img src="../media/share.png" alt="">\n\nText úvodní',
      ),
    );
    expect(inHtml.join("\n")).toContain("has no alternative text");
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

  test("a draft is not a page: a link to it is dead until it is published", () => {
    const problems = problemsAfter((dir) =>
      edit(
        dir,
        "cs/pages/index.md",
        "Text úvodní",
        "[Koncept](/aktuality/koncept/)\n\nText úvodní",
      ),
    );
    expect(problems.join("\n")).toContain("/aktuality/koncept/ leads to no page");
    const published = problemsAfter((dir) => {
      edit(dir, "cs/news/2026-01-02-koncept.md", "draft: true\n", "");
      edit(
        dir,
        "cs/pages/index.md",
        "Text úvodní",
        "[Koncept](/aktuality/koncept/)\n\nText úvodní",
      );
    });
    expect(published).toEqual([]);
  });

  test("the date of a news item matches its file name", () => {
    const problems = problemsAfter((dir) =>
      edit(dir, "cs/news/2026-01-02-koncept.md", "date: 2026-01-02", "date: 2026-01-03"),
    );
    expect(problems).toContain(
      "cs/news/2026-01-02-koncept.md: date 2026-01-03 differs from the date in the file name",
    );
  });

  test("one page shows each list, the home page exists, services have their page", () => {
    const twice = problemsAfter((dir) =>
      edit(dir, "cs/pages/kontakt.md", "shows: contacts", "shows: services"),
    );
    expect(twice.join("\n")).toContain("only one page shows services");
    const noHome = problemsAfter((dir) => rmSync(join(dir, "cs/pages/index.md")));
    expect(noHome).toContain("cs/pages/index.md is missing: it is the home page");
    const unlisted = problemsAfter((dir) => {
      edit(dir, "cs/pages/sluzby.md", "shows: services\n", "");
      write(dir, "cs/services/zkouska.md", service);
    });
    expect(unlisted).toContain(
      "cs/services/ has services, but no page shows them (shows: services)",
    );
    const listed = problemsAfter((dir) => write(dir, "cs/services/zkouska.md", service));
    expect(listed).toEqual([]);
  });

  test("a file name is an address: lowercase letters, digits and hyphens", () => {
    const problems = problemsAfter((dir) =>
      cpSync(join(dir, "cs/pages/kontakt.md"), join(dir, "cs/pages/Kontakt Nový.md")),
    );
    expect(problems.join("\n")).toContain(
      "cs/pages/Kontakt Nový.md: a file name has lowercase letters",
    );
  });

  test("contacts keep their shape", () => {
    const problems = problemsAfter((dir) =>
      edit(dir, "cs/contacts.yaml", 'id: "00000000"', "id: 123"),
    );
    expect(problems.join("\n")).toContain("cs/contacts.yaml: company.id");
  });

  test("the locale belongs to the website's language", () => {
    const problems = problemsAfter((dir) =>
      edit(dir, "cs/site.yaml", "locale: cs_CZ", "locale: en_GB"),
    );
    expect(problems.join("\n")).toContain("locale en_GB is not of the website's language cs");
  });
});
