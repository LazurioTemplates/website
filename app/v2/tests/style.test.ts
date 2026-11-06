import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tokens } from "@design-system/tokens";
import { app } from "./support";

// The website's look comes from the design system's stylesheet and tokens
// only. No colour is written in the website's stylesheet or a component, and no px value outside the one
// block of the website's own geometry and the breakpoint media queries, whose
// widths are the tokens' breakpoints.
const css = readFileSync(join(app, "src/styles/site.css"), "utf8");
const components = readdirSync(join(app, "src/components"))
  .filter((name) => name.endsWith(".astro"))
  .map((name) => ({ name, text: readFileSync(join(app, "src/components", name), "utf8") }));
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(/i;

describe("styles", () => {
  test("no literal colour in the stylesheet or a component", () => {
    const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toMatch(COLOUR);
    for (const { name, text } of components) {
      expect(text, name).not.toMatch(COLOUR);
      expect(text, name).not.toMatch(/\sstyle=/);
    }
  });

  test("px only in the website's geometry block and the breakpoints", () => {
    const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const [geometry, ...rest] = code.split(/\n}\n/);
    expect(geometry).toContain("--site-");
    const breakpoints = Object.values(tokens.breakpoint).map((px) => `${px}px`);
    for (const line of rest.join("\n}\n").split("\n")) {
      for (const [px] of line.matchAll(/\b\d+(?:\.\d+)?px\b/g)) {
        expect(line.trim().startsWith("@media"), line).toBe(true);
        expect(breakpoints, line).toContain(px);
      }
    }
  });
});
