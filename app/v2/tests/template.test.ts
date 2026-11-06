import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import packageJson from "../package.json";
import { root } from "./support";

// The template contract of the Marketplace of Lazurio: what the repository
// carries so that another Organization can adopt it (docs/adoption.md) and
// take its later releases by merge (docs/extending.md).
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

describe("template contract", () => {
  test("carries its license, notice and documents", () => {
    for (const path of [
      "LICENSE",
      "NOTICE",
      "README.md",
      "AGENTS.md",
      "CHANGELOG.md",
      "docs/adoption.md",
      "docs/extending.md",
      "docs/publishing.md",
      "data/v2/README.md",
    ]) {
      expect(existsSync(join(root, path)) && read(path).trim().length > 0, path).toBe(true);
    }
    expect(read("LICENSE")).toStartWith("MIT License");
    expect(read("LICENSE")).toContain("Copyright (c) 2026 Lazurio contributors");
  });

  test("is generation app/v2 with its content in data/v2", () => {
    const manifest = JSON.parse(read("lazurio.module.json"));
    expect(manifest.apps).toEqual(["app/v2/package.json"]);
    expect(manifest.default_app).toBe("app/v2/package.json");
    expect(existsSync(join(root, "app/v1"))).toBe(false);
    expect(packageJson.lazurio.preparation.owner_package).toBe("app/v2/package.json");
    for (const language of ["cs", "en"]) {
      expect(existsSync(join(root, "data/v2", language, "site.yaml")), language).toBe(true);
    }
    expect(read("data/v2/language.yaml")).toMatch(/^language: cs$/m);
  });

  test("names the Organization only by placeholders", () => {
    const manifest = JSON.parse(read("lazurio.module.json"));
    expect(manifest.company).toBe("REPLACE-WITH-ORG-NAME");
    expect(packageJson.lazurio.runtime.company).toBe("REPLACE-WITH-ORG-NAME");
    expect(packageJson.lazurio.runtime.id).toBe("replace-with-org-slug-website-v2");
    expect(existsSync(join(root, ".github/CODEOWNERS"))).toBe(false);
  });

  test("pins Bun and every dependency exactly, on the content profile", () => {
    expect(packageJson.packageManager).toBe("bun@1.4.4");
    const ranges = Object.entries({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }).filter(
      ([, version]) => !/^(?:\d+\.\d+\.\d+|github:[\w.-]+\/[\w.-]+#v\d+\.\d+\.\d+)$/.test(version),
    );
    expect(ranges).toEqual([]);
    expect(packageJson.dependencies.astro).toBe("7.4.5");
    expect(packageJson.devDependencies.typescript).toBe("6.0.3");
    expect(packageJson.devDependencies["@biomejs/biome"]).toBe("2.6.4");
    expect(read("README.md")).toContain("content@2026.11");
  });

  test("CI runs the pinned Bun and the one check", () => {
    const bun = packageJson.packageManager.replace("bun@", "");
    for (const path of [".github/workflows/check.yml", ".github/workflows/windows.yml"]) {
      const workflow = read(path);
      expect(workflow, path).toContain(`bun-version: ${bun}`);
      expect(workflow, path).toContain("run: bun run check");
      expect(workflow, path).toContain("working-directory: app/v2");
    }
    expect(read(".github/workflows/check.yml")).toContain(`test "$(bun --version)" = "${bun}"`);
    // Windows runs only for pull requests that change code, and on request.
    const windows = read(".github/workflows/windows.yml");
    expect(windows).toMatch(/pull_request:\n\s+paths:\n\s+- /);
    expect(windows).toContain("workflow_dispatch:");
    expect(windows).not.toMatch(/\bpush:/);
  });

  test("the changelog has an entry for the App's version", () => {
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
