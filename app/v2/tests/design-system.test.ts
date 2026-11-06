import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { app, root } from "./support";

// The website takes its look from the design system as its docs/adoption.md
// asks: a merge of a release that stays an ancestor, never a copy. The
// release lies in design-system/, design-system.lock.json names it, and the
// website imports the design system's tokens, components and stylesheet from
// there (`@design-system/…`) instead of keeping copies of its own. A later
// release arrives as a merge of its tag (docs/extending.md).

const lock = JSON.parse(readFileSync(join(root, "design-system.lock.json"), "utf8")) as {
  source: string;
  tag: string;
  commit: string;
  tree: string;
  directory: string;
};

function git(...args: string[]): string {
  const run = Bun.spawnSync(["git", "-c", "core.quotePath=false", ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (run.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${run.stderr.toString()}`);
  return run.stdout.toString().trim();
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("the design system", () => {
  test("the lock names a release of a design system repository", () => {
    expect(Object.keys(lock).sort()).toEqual(["commit", "directory", "source", "tag", "tree"]);
    expect(lock.source).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+$/);
    expect(lock.tag).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(lock.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(lock.tree).toMatch(/^[0-9a-f]{40}$/);
    expect(lock.directory).toBe("design-system");
  });

  test("design-system/ is exactly the merged release, never edited by hand", () => {
    // The committed tree of the directory is the release's tree, and nothing
    // in it is changed in the working tree.
    expect(git("rev-parse", `HEAD:${lock.directory}`)).toBe(lock.tree);
    expect(git("status", "--porcelain", "--", lock.directory)).toBe("");
  });

  test("it carries what the website uses", () => {
    for (const path of [
      "LICENSE",
      "content/brand/colors/tokens.json",
      "app/v1/src/tokens.ts",
      "app/v1/src/styles/global.css",
      "app/v1/src/components/ui/Button.astro",
      "app/v1/src/components/ui/Card.astro",
      "app/v1/src/components/ui/Icon.astro",
      "app/v1/src/layouts/MenuToggle.astro",
    ]) {
      expect(existsSync(join(root, lock.directory, path)), path).toBe(true);
    }
  });

  test("the website imports it and keeps no copy of its own", () => {
    const sources = files(join(app, "src"));
    const names = sources.map((path) => path.split(/[\\/]/).at(-1));
    for (const copy of [
      "tokens.ts",
      "tokens.json",
      "global.css",
      "Button.astro",
      "Card.astro",
      "Icon.astro",
      "MenuToggle.astro",
    ]) {
      expect(names, copy).not.toContain(copy);
    }
    const imports = sources
      .filter((path) => /\.(?:astro|ts)$/.test(path))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(imports).toContain('from "@design-system/tokens"');
    expect(imports).toContain('import "@design-system/styles/global.css"');
    expect(imports).toContain('from "@design-system/components/ui/Button.astro"');
  });
});
