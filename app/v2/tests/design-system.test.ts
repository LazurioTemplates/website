import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import packageJson from "../package.json";
import { app, root } from "./support";

// The website takes its look from the design system as a package: a Git
// dependency on a released tag, installed from bun.lock (Lazurio Module
// Standard: a design system's assets come as a dependency on its package,
// never by a relative path). The template depends on the public template's
// release; an Organization's module on its own design system, over SSH.
// Nothing of the design system is copied into this repository.
const PUBLIC = /^github:[A-Za-z0-9-]+\/[A-Za-z0-9._-]+#v\d+\.\d+\.\d+$/;
const PRIVATE =
  /^git\+ssh:\/\/git@github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\.git#v\d+\.\d+\.\d+$/;
const dependency = (packageJson.dependencies as Record<string, string>)["design-system"] ?? "";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("the design system", () => {
  test("is a dependency on a released tag, locked in bun.lock", () => {
    expect(PUBLIC.test(dependency) || PRIVATE.test(dependency), dependency).toBe(true);
    const lock = readFileSync(join(app, "bun.lock"), "utf8");
    expect(lock).toContain(`"design-system": "${dependency}"`);
    expect(lock).toMatch(/"design-system": \["design-system@[^"]+#[0-9a-f]{7,40}"/);
  });

  test("is installed as the package, not kept in the repository", () => {
    expect(existsSync(join(root, "design-system"))).toBe(false);
    expect(existsSync(join(root, "design-system.lock.json"))).toBe(false);
    const installed = JSON.parse(
      readFileSync(join(app, "node_modules/design-system/package.json"), "utf8"),
    );
    expect(installed.name).toBe("design-system");
  });

  test("the website imports it by its package name only", () => {
    const sources = files(join(app, "src")).filter((path) => /\.(?:astro|ts|css)$/.test(path));
    const code = sources.map((path) => readFileSync(path, "utf8")).join("\n");
    const imports = [...code.matchAll(/(?:from |import )"([^"]*design-system[^"]*)"/g)].map(
      ([, spec]) => spec as string,
    );
    expect(imports.length).toBeGreaterThan(0);
    for (const spec of imports) expect(spec, spec).toMatch(/^design-system(?:\/|$)/);
    expect(code).toContain('import "design-system/styles.css"');
    expect(code).not.toMatch(/\.\.\/[^"]*design-system|design-system\/app\//);
  });
});
