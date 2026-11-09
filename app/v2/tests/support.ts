import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const app = resolve(import.meta.dir, "..");
export const root = resolve(app, "../..");
export const data = join(root, "data/v2");
// A small invented website in the shape of data/v2/ that the tests mutate and
// build; it does not change when a module replaces the example content.
export const fixture = join(app, "tests/fixtures/content");

// The template itself, or a module adopted from it? The template names the
// Organization only by a placeholder; an adoption writes the Organization's
// slug (docs/adoption.md). The tests in tests/template/ check the template and
// skip in an adopted module.
export const isTemplate =
  JSON.parse(readFileSync(join(root, "lazurio.module.json"), "utf8")).company ===
  "REPLACE-WITH-ORG-NAME";

// A temporary directory by its long, real path: Windows runners hand out an
// 8.3 short temp path (RUNNER~1) that Git reports in its long form.
export function tempDir(prefix: string): string {
  return mkdtempSync(join(realpathSync.native(tmpdir()), `website-${prefix}-`));
}
