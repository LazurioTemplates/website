import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import packageJson from "../../package.json";
import { checkContent } from "../../src/content/read";
import { data, isTemplate, root } from "../support";

// The template contract of the Marketplace of Lazurio: what the template
// itself carries before an Organization adopts it. An adopted module replaces
// the placeholders, keeps one language and its own content
// (docs/adoption.md), so these checks skip there; the checks every module
// keeps are in the other test files.
const read = (path: string) => readFileSync(join(root, path), "utf8");

// Width of a WebP image from its header (VP8, VP8L or VP8X).
function webpWidth(bytes: Uint8Array): number {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (ascii(0, 4) !== "RIFF" || ascii(8, 12) !== "WEBP") throw new Error("not a WebP file");
  const at = (i: number) => bytes[i] ?? 0;
  const chunk = ascii(12, 16);
  if (chunk === "VP8X") return 1 + (at(24) | (at(25) << 8) | (at(26) << 16));
  if (chunk === "VP8 ") return (at(26) | (at(27) << 8)) & 0x3fff;
  if (chunk === "VP8L") return 1 + ((at(21) | (at(22) << 8)) & 0x3fff);
  throw new Error(`unknown WebP chunk ${chunk}`);
}

describe.skipIf(!isTemplate)("template contract", () => {
  test("names the Organization only by placeholders", () => {
    const manifest = JSON.parse(read("lazurio.module.json"));
    expect(manifest.company).toBe("REPLACE-WITH-ORG-NAME");
    expect(packageJson.lazurio.runtime.company).toBe("REPLACE-WITH-ORG-NAME");
    expect(packageJson.lazurio.runtime.id).toBe("replace-with-org-slug-website-v2");
    expect(existsSync(join(root, ".github/CODEOWNERS"))).toBe(false);
    expect(read("LICENSE")).toContain("Copyright (c) 2026 Lazurio contributors");
  });

  test("carries Czech and English, Czech by default, both valid", () => {
    expect(read("data/v2/language.yaml")).toMatch(/^language: cs$/m);
    for (const language of ["cs", "en"]) {
      expect(existsSync(join(data, language, "site.yaml")), language).toBe(true);
    }
    expect(checkContent(data)).toEqual([]);
  });

  test("is on the stack profile it names, and its changelog names the version", () => {
    expect(packageJson.packageManager).toBe("bun@1.4.4");
    expect(packageJson.dependencies.astro).toBe("7.4.5");
    expect(packageJson.devDependencies.typescript).toBe("6.0.3");
    expect(packageJson.devDependencies["@biomejs/biome"]).toBe("2.6.4");
    expect(read("README.md")).toContain("content@2026.11");
    expect(read("CHANGELOG.md")).toContain(`## ${packageJson.version}`);
  });

  test("the Marketplace screens are WebP files 1600 px wide, the same shots in each language", () => {
    const shots = (language: string) =>
      readdirSync(join(root, "docs/screenshots", language))
        .filter((name) => !name.startsWith("."))
        .sort();
    const [cs, en] = [shots("cs"), shots("en")];
    expect(cs.length).toBeGreaterThan(0);
    expect(en).toEqual(cs);
    for (const language of ["cs", "en"]) {
      for (const name of shots(language)) {
        expect(name).toEndWith(".webp");
        const path = join(root, "docs/screenshots", language, name);
        expect(webpWidth(readFileSync(path)), `${language}/${name}`).toBe(1600);
      }
    }
  });
});
