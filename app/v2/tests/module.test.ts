import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import packageJson from "../package.json";
import { readLanguage } from "../src/content/language";
import { data, root } from "./support";

// What the module holds, in the template and in every module adopted from it
// (docs/adoption.md): its license and documents, the App generation app/v2
// with its content in data/v2/, exact pins of the stack profile and the CI of
// the Lazurio Module Standard.
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("module contract", () => {
  test("carries its license, notice and documents", () => {
    for (const path of [
      "LICENSE",
      "NOTICE",
      "README.md",
      "AGENTS.md",
      "docs/adoption.md",
      "docs/extending.md",
      "docs/publishing.md",
      "data/v2/README.md",
    ]) {
      expect(existsSync(join(root, path)) && read(path).trim().length > 0, path).toBe(true);
    }
    expect(read("LICENSE")).toStartWith("MIT License");
  });

  test("is generation app/v2 with the content of its language in data/v2", () => {
    const manifest = JSON.parse(read("lazurio.module.json"));
    expect(manifest.apps).toEqual(["app/v2/package.json"]);
    expect(manifest.default_app).toBe("app/v2/package.json");
    expect(packageJson.lazurio.preparation.owner_package).toBe("app/v2/package.json");
    expect(packageJson.lazurio.runtime.company).toBe(manifest.company);
    expect(packageJson.lazurio.runtime.module).toBe(manifest.id);
    expect(packageJson.lazurio.runtime.id).toEndWith("-v2");
    const language = readLanguage(data, "");
    expect(existsSync(join(data, language, "site.yaml")), language).toBe(true);
  });

  test("pins Bun and every dependency exactly, on the content profile", () => {
    expect(packageJson.packageManager).toMatch(/^bun@\d+\.\d+\.\d+$/);
    const ranges = Object.entries({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }).filter(
      ([, version]) =>
        !/^(?:\d+\.\d+\.\d+|github:[\w.-]+\/[\w.-]+#v\d+\.\d+\.\d+|git\+ssh:\/\/git@github\.com\/[\w.-]+\/[\w.-]+\.git#v\d+\.\d+\.\d+)$/.test(
          version,
        ),
    );
    expect(ranges).toEqual([]);
    for (const script of Object.values(packageJson.scripts)) {
      const file = /^bun run (src\/\S+\.ts)$/.exec(script)?.[1];
      if (file) expect(existsSync(join(root, "app/v2", file)), script).toBe(true);
    }
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
});
