import { describe, expect, test } from "bun:test";
import { contrast, MINIMUM } from "design-system";
import { type ColorRole, color, type Theme } from "design-system/tokens";

// The website takes its colours from the design system's package. Whatever
// design system the module depends on (the template's or the Organization's
// own), every pair of colour roles the website draws must reach WCAG 2.2 AA
// in both themes: 4.5:1 for text, 3:1 for the boundaries of controls and for
// focus. A design system whose palette fails here does not fit the website
// as it is.
const text: [ColorRole, ColorRole][] = [
  ["ink", "bg"],
  ["ink", "surface"],
  ["ink", "surface-muted"],
  ["ink", "surface-selected"],
  ["ink-muted", "bg"],
  ["ink-muted", "surface"],
  ["ink-muted", "surface-muted"],
  ["on-action", "action"],
  ["on-action", "action-hover"],
];
const graphic: [ColorRole, ColorRole][] = [
  ["line-strong", "surface"],
  ["focus", "bg"],
  ["focus", "surface"],
  ["focus", "surface-muted"],
  ["action", "bg"],
  ["action", "surface"],
  ["ink", "bg"],
];

describe("contrast of the pairs the website uses (WCAG AA)", () => {
  for (const theme of Object.keys(color) as Theme[]) {
    for (const [pairs, minimum] of [
      [text, MINIMUM.text],
      [graphic, MINIMUM.graphic],
    ] as const) {
      for (const [fg, bg] of pairs) {
        test(`${theme}: ${fg} on ${bg} is at least ${minimum}:1`, () => {
          expect(contrast(color[theme][fg], color[theme][bg])).toBeGreaterThanOrEqual(minimum);
        });
      }
    }
  }

  test("the design system has a light and a dark theme with the same roles", () => {
    expect(Object.keys(color).sort()).toEqual(["dark", "light"]);
    expect(Object.keys(color.dark).sort()).toEqual(Object.keys(color.light).sort());
  });
});
