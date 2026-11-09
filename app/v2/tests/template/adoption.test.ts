import { afterAll, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { LANGUAGES, type Language } from "../../src/content/language";
import { isTemplate, root, tempDir } from "../support";

// The adoption docs/adoption.md describes, done on a copy of the template for
// each language, and then the module's own `bun run check` in that copy: it
// must pass in a module with the Organization's identity, one language and
// its own content. The copy installs its dependencies from bun.lock, as an
// adoption does (Bun's cache makes it quick). On Windows the copy's check
// would double a long run, so it runs on Linux and macOS only.

const copies: string[] = [];
afterAll(() => {
  for (const dir of copies) rmSync(dir, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): string {
  const run = Bun.spawnSync(
    ["git", "-c", "user.name=Adoption", "-c", "user.email=adoption@example.org", ...args],
    { cwd, stdout: "pipe", stderr: "pipe" },
  );
  if (run.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${run.stderr.toString()}`);
  return run.stdout.toString();
}

const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

// The template's files as a merge brings them, then the adoption's changes.
function adopt(language: Language): string {
  const dir = tempDir(`adoption-${language}`);
  copies.push(dir);
  const files = git(
    root,
    "-c",
    "core.quotePath=false",
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
  )
    .split("\0")
    .filter((path) => path && existsSync(join(root, path)));
  for (const path of files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    copyFileSync(join(root, path), join(dir, path));
  }

  // Step 6: the Organization's identity.
  const manifest = json(join(dir, "lazurio.module.json"));
  manifest.company = "adopting-org";
  writeJson(join(dir, "lazurio.module.json"), manifest);
  const pkg = json(join(dir, "app/v2/package.json"));
  pkg.lazurio.runtime.company = "adopting-org";
  pkg.lazurio.runtime.id = "adopting-org-website-v2";
  writeJson(join(dir, "app/v2/package.json"), pkg);

  // Step 7: one language.
  const data = join(dir, "data/v2");
  writeFileSync(join(data, "language.yaml"), `language: ${language}\n`);
  for (const other of LANGUAGES.filter((l) => l !== language)) {
    rmSync(join(data, other), { recursive: true });
  }

  // Step 7: the Organization's own content; no services and no news yet.
  const content = join(data, language);
  const site = Bun.YAML.parse(readFileSync(join(content, "site.yaml"), "utf8")) as Record<
    string,
    unknown
  >;
  Object.assign(site, {
    name: "Adopted",
    legalName: "Adopted Organization s.r.o.",
    url: "https://www.example.net",
    description: "The website of the Organization that adopted the template, with its own words.",
  });
  writeJson(join(content, "site.yaml"), site);
  const contacts = Bun.YAML.parse(readFileSync(join(content, "contacts.yaml"), "utf8")) as Record<
    string,
    unknown
  >;
  Object.assign(contacts, { email: "info@example.net", people: [] });
  writeJson(join(content, "contacts.yaml"), contacts);
  rmSync(join(content, "services"), { recursive: true });
  rmSync(join(content, "news"), { recursive: true });
  for (const name of readdirSync(join(content, "media"))) {
    if (name !== "share.png") rmSync(join(content, "media", name));
  }
  const privacy = readdirSync(join(content, "pages")).find((name) =>
    readFileSync(join(content, "pages", name), "utf8").includes("menu: footer"),
  );
  if (privacy) {
    const file = join(content, "pages", privacy);
    const [front] = readFileSync(file, "utf8").split(/\n---\n/);
    writeFileSync(file, `${front}\n---\n\nThe privacy text of the Organization.\n`);
  }

  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "Adopted website");
  return dir;
}

describe.skipIf(!isTemplate || process.platform === "win32")("adoption (docs/adoption.md)", () => {
  for (const language of LANGUAGES) {
    test(`a module adopted in ${language} with its own identity and content passes bun run check`, () => {
      const dir = adopt(language);
      const env = Object.fromEntries(
        Object.entries(process.env).filter(([name]) => !name.startsWith("WEBSITE_")),
      );
      // As step 8 of the adoption does: the frozen install, then the check.
      const install = Bun.spawnSync([process.execPath, "install", "--frozen-lockfile"], {
        cwd: join(dir, "app/v2"),
        env,
        stdout: "pipe",
        stderr: "pipe",
      });
      if (install.exitCode !== 0) console.error(`${install.stdout}${install.stderr}`);
      expect(install.exitCode).toBe(0);
      const run = Bun.spawnSync([process.execPath, "run", "check"], {
        cwd: join(dir, "app/v2"),
        env,
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = `${run.stdout}${run.stderr}`;
      if (run.exitCode !== 0) console.error(output.slice(-6000));
      expect(run.exitCode).toBe(0);
      // The template's own checks skipped there; the module's ran.
      expect(output).toMatch(/\d+ skip/);
      expect(output).toContain("0 fail");
    }, 600_000);
  }
});
