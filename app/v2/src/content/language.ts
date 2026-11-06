import { readFileSync } from "node:fs";
import { join } from "node:path";

// The language of the website. Lazurio does not pass a language to a
// Module's App (its closed environment has none, and the shell document that
// carries the Folder's `locale` is served on the Launchpad, Chat and Automate
// origins only), and a static build gets no environment at all. So the
// website's language is part of its content: data/v2/language.yaml names it,
// the website is built from data/v2/<language>/ and the interface speaks it.
// Without the file the website is Czech. An adoption sets it to the
// Organization's language (docs/adoption.md).
//
// WEBSITE_LANGUAGE overrides the file for a preview or a test of the other
// language (tests/build.test.ts, the screenshots); Lazurio never sets it.

export const LANGUAGES = ["cs", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "cs";

export const isLanguage = (value: unknown): value is Language =>
  typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);

export function readLanguage(
  data: string,
  override: string | undefined = process.env.WEBSITE_LANGUAGE,
): Language {
  if (override) {
    if (!isLanguage(override)) {
      throw new Error(`WEBSITE_LANGUAGE is ${LANGUAGES.join(" or ")}, not ${override}`);
    }
    return override;
  }
  let text: string;
  try {
    text = readFileSync(join(data, "language.yaml"), "utf8");
  } catch {
    return DEFAULT_LANGUAGE;
  }
  const value = /^language:\s*["']?([^"'\s#]*)["']?\s*(?:#.*)?$/m.exec(text)?.[1];
  if (!isLanguage(value)) {
    throw new Error(`data/v2/language.yaml: language is ${LANGUAGES.join(" or ")}`);
  }
  return value;
}
