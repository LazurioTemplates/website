import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "./support";

// The process of the module: its skills for agents, the same in the folder
// Codex reads (.agents/skills/) and the one Claude Code reads
// (.claude/skills/), with every file they name present.
const HARNESSES = [".agents/skills", ".claude/skills"];
const REQUIRED = ["edit-page", "write-news", "change-contacts"];
const skills = (dir: string) =>
  readdirSync(join(root, dir)).filter((name) => existsSync(join(root, dir, name, "SKILL.md")));

describe("skills of the module", () => {
  test("both harnesses carry the same skills, byte for byte", () => {
    const [codex, claude] = HARNESSES.map(skills) as [string[], string[]];
    expect(codex.sort()).toEqual(claude.sort());
    for (const name of REQUIRED) expect(codex).toContain(name);
    for (const name of codex) {
      expect(readFileSync(join(root, ".claude/skills", name, "SKILL.md"), "utf8"), name).toBe(
        readFileSync(join(root, ".agents/skills", name, "SKILL.md"), "utf8"),
      );
    }
  });

  for (const name of skills(".agents/skills")) {
    test(`${name} has its name, a description and only paths that exist`, () => {
      const text = readFileSync(join(root, ".agents/skills", name, "SKILL.md"), "utf8");
      expect(text).toMatch(new RegExp(`^---\\nname: ${name}\\ndescription: .{40,}\\n---\\n`));
      for (const [, path] of text.matchAll(/`((?:data\/v2|app\/v2|docs)\/[^`*<>\s]+)`/g)) {
        expect(existsSync(join(root, path as string)), `${name} names ${path}`).toBe(true);
      }
    });
  }
});
