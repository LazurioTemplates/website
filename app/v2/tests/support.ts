import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const app = resolve(import.meta.dir, "..");
export const root = resolve(app, "../..");
export const data = join(root, "data/v2");

// A temporary directory by its long, real path: Windows runners hand out an
// 8.3 short temp path (RUNNER~1) that Git reports in its long form.
export function tempDir(prefix: string): string {
  return mkdtempSync(join(realpathSync.native(tmpdir()), `website-${prefix}-`));
}
