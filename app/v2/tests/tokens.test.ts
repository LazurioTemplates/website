import { describe, expect, test } from "bun:test";
import {
  contrastRatio,
  ROLES,
  type Role,
  roleColor,
  THEMES,
  tokenStylesheet,
  tokens,
} from "@design-system/tokens";

// The website takes its colours from the design system merged into
// design-system/ (its content/brand/colors/tokens.json). Whatever design
// system it takes, every
// pair of roles the website draws must reach WCAG 2.2 AA in both themes:
// 4.5:1 for text, 3:1 for the boundaries of controls and focus indicators.
// A design system whose palette fails here does not fit the website as is.
describe("contrast of the pairs the website uses (WCAG AA)", () => {
  const pairs: [Role, Role, number][] = [
    // Text on the page, the header, cards and the footer.
    ...(["text", "text-muted", "accent-text"] as Role[]).flatMap((fg) =>
      (["surface", "surface-raised", "surface-sunken"] as Role[]).map(
        (bg): [Role, Role, number] => [fg, bg, 4.5],
      ),
    ),
    ["text-subtle", "surface", 4.5],
    ["text-subtle", "surface-sunken", 4.5],
    // The primary button, the price and the call to action.
    ["on-accent", "accent", 4.5],
    ["on-accent", "accent-hover", 4.5],
    ["text", "accent-subtle", 4.5],
    ["accent-text", "accent-subtle", 4.5],
    // Boundaries and focus.
    ["border-strong", "surface-raised", 3],
    ["focus", "surface", 3],
    ["focus", "surface-raised", 3],
    ["focus", "surface-sunken", 3],
    ["accent", "surface", 3],
  ];
  for (const theme of THEMES) {
    for (const [fg, bg, minimum] of pairs) {
      test(`${theme}: ${fg} on ${bg} is at least ${minimum}:1`, () => {
        const ratio = contrastRatio(roleColor(tokens, theme, fg), roleColor(tokens, theme, bg));
        expect(ratio).toBeGreaterThanOrEqual(minimum);
      });
    }
  }

  test("the stylesheet sets every role for both themes", () => {
    const css = tokenStylesheet(tokens);
    for (const role of ROLES) expect(css).toContain(`--${role}: `);
    expect(css).toContain("prefers-color-scheme: dark");
  });
});
