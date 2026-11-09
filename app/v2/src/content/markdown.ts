import { htmlToHast, markdownToHast } from "satteri";

// What a Markdown text of the content renders to, read with the parser Astro
// renders it with: Sätteri (`satteri`), Astro 7's Markdown processor, at the
// exact version Astro 7.4.5 installs, with the same features (astro.config.ts
// configures Astro's processor with MARKDOWN_FEATURES). The checks walk the
// rendered hast elements, not the Markdown source, so every form that renders
// an image or a link is seen: inline, reference with its definition anywhere
// (also on the next line), and HTML written in the text, which the parser
// keeps as raw HTML and htmlToHast parses here as a browser would.
// tests/build.test.ts builds a page with these forms and compares.

export const MARKDOWN_FEATURES = { gfm: true, smartPunctuation: true } as const;

export type RenderedImage = { src: string; alt: string };
export type RenderedNodes = { images: RenderedImage[]; links: string[] };

type Node = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

const text = (value: unknown): string =>
  typeof value === "string" ? value : Array.isArray(value) ? value.join(" ") : "";

function walk(node: Node, found: RenderedNodes): void {
  if (node.type === "element" && node.tagName === "img") {
    found.images.push({ src: text(node.properties?.src), alt: text(node.properties?.alt) });
  }
  if (node.type === "element" && node.tagName === "a" && node.properties?.href !== undefined) {
    found.links.push(text(node.properties.href));
  }
  if (node.type === "raw" && typeof node.value === "string") {
    walk(htmlToHast(node.value, { fragment: true }) as Node, found);
  }
  for (const child of node.children ?? []) walk(child, found);
}

export function renderedNodes(markdown: string): RenderedNodes {
  const found: RenderedNodes = { images: [], links: [] };
  walk(markdownToHast(markdown, { features: MARKDOWN_FEATURES, position: false }) as Node, found);
  return found;
}
