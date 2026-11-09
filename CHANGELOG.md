# Changelog: website

A release is an annotated tag `v<semver>` with a GitHub Release, and the
version is independent of the App generation (`docs/extending.md`).

## 0.1.0

A draft of the first release; it gets its date when it is tagged.

The first release of the company website template of the Marketplace of
Lazurio: App generation `app/v2` on the stack profile `content@2026.11`
(Bun 1.4.4, Astro 7.4.5, TypeScript 6.0.3, Biome 2.6.4, every version exact).

### Added

- The website of Example, an invented company, in Czech and in English: a home
  page with a headline, numbers, highlights, services and news; a services
  page with four services and their pages; an about page; news with three
  items; a contact page; and a privacy page in the footer.
- Two languages: the interface words in `app/v2/src/lib/texts.ts` and the
  content in `data/v2/cs/` and `data/v2/en/`; `data/v2/language.yaml` chooses
  one for the whole website, Czech by default. Lazurio passes no language to a
  module's App, so an adoption sets the file to the Organization's language.
- The content in `data/v2/<language>/` (Markdown and YAML) with Zod schemas
  in Astro content collections and rules of the whole website (one home page,
  one page per list, unique addresses, links that lead somewhere, dated news,
  images with alternative text, a locale of the website's language).
  `bun run validate:data` checks the same schemas and rules in both languages
  without Astro and is part of `bun run check`.
- Search engines and link previews: titles, descriptions, canonical
  addresses, Open Graph and Twitter cards, `sitemap.xml`, `robots.txt`
  (indexing off until `indexing: true`) and schema.org data of the
  Organization.
- Accessibility and speed: landmarks, a skip link, a keyboard menu that
  works without JavaScript, alternative texts, WCAG AA contrast in both
  themes, static pages, no web fonts and WebP images in several sizes.
- The look of `LazurioTemplates/design-system` v1.0.0, merged into
  `design-system/` as its `docs/adoption.md` asks (the release commit stays an
  ancestor) and recorded in `design-system.lock.json`. The website imports its
  tokens, stylesheet and components (`@design-system/*`) and keeps no copy.
- Skills for agents in `.agents/skills/` and `.claude/skills/`: `edit-page`,
  `write-news` and `change-contacts`, each ending with a check in the browser.
- `docs/adoption.md`, `docs/extending.md`, `docs/publishing.md` and
  `data/v2/README.md`; five screens for the Marketplace card in each language,
  `docs/screenshots/cs/` and `docs/screenshots/en/`.
- Tests: the start and build contracts of the Lazurio Module Standard, the
  content contract on a stable fixture (`app/v2/tests/fixtures/content/`), the
  site model, the build of each kept language with exactly the published pages
  and their SEO, accessibility and words of one language, drafts and empty
  lists, contrast, styles from tokens only, the merged design system, paths
  that check out on Windows, the skills and the module's files. The template's
  own contract and an adoption in each language (`app/v2/tests/template/`)
  skip in an adopted module. CI runs `bun run check` on Linux for every pull
  request and on Windows for pull requests that change the App, the content
  or a workflow.
- `bun run build` stops on the same content rules as `validate:data` in the
  language it builds, the alternative text of every image included. Images
  and links are read from the hast that Astro's Markdown processor, Sätteri
  0.10.5, renders (`app/v2/src/content/markdown.ts`), so references, their
  definitions on the next line and HTML in the text count too; Astro's
  processor is configured with the same features.

### For adopted modules

Nothing yet: this is the first release.
