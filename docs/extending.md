# Extending the website

How to keep developing this module after you adopted it, how it would change
generation, how to take a newer release of the template or of the design
system, and how the template itself is released. For the first adoption see
[adoption.md](adoption.md); for putting the website on the internet see
[publishing.md](publishing.md).

## Generation and stack profile

The App is generation **`app/v2`**. In Lazurio a generation names the data
layer, not quality: `app/v1` and `app/v2` have no data layer of their own,
`app/v3` keeps records in repository-db and `app/v4` in a Dolt database. The
website is much content that changes now and then and that agents edit, so
its content lies beside the App in `data/v2/` with a declared structure the
App checks (Zod schemas in Astro content collections), and people and agents
change it in pull requests like the code. That is `app/v2`. In `app/v1` the
content would be part of the App, without a contract of its own.

The tools follow the stack profile **[`content@2026.11`](https://github.com/Lazurio/LazurioPlatform/blob/main/docs/stack-profiles.md#content)** of Lazurio,
shared by the Marketplace templates built on Astro (design system, website,
knowledge base):

| Tool | Version | Why |
| --- | --- | --- |
| Bun (`packageManager`, runtime, tests) | 1.4.4 | The App's runtime in Lazurio; `bun test` needs no other test runner |
| Astro | 7.4.5 | Static build, content collections with Zod schemas, image optimization |
| `@astrojs/check` | 0.9.12 | Type check of `.astro` files |
| TypeScript | 6.0.3 | `astro check` does not support TypeScript 7 yet |
| Biome | 2.6.4 | Lint and format in one tool |
| `@lazurio/module-kit` | 0.2.0 | Listener, shutdown and development server options |

Every dependency is pinned exactly (no `^` or `~`) and `bun.lock` is
committed; the module test fails on a range. As the profile asks, Biome
lints and formats the TypeScript, JSON and CSS of the App, leaves `.astro`
files out, and keeps its Markdown and YAML formatters off. The images of the
content are converted by sharp, the optional image service Astro installs
with itself; nothing else is added to the profile.

## Changes within the generation

Most work is here and needs no plan beyond an ordinary pull request:

- **Content.** Pages, services, news, contacts and settings in
  `data/v2/<language>/`. The skills `edit-page`, `write-news` and
  `change-contacts` describe it; the fields are in
  [`data/v2/README.md`](../data/v2/README.md).
- **A new kind of content** (references, a price list, team members, jobs).
  Add a collection: its Zod schema in `app/v2/src/content/schemas.ts`, the
  collection in `app/v2/src/content.config.ts`, its files in
  `app/v2/src/content/read.ts` for `validate:data`, its rules in
  `app/v2/src/content/model.ts` when it has addresses or links, and a
  component that shows it. Add its example content in both languages, its
  fields to `data/v2/README.md`, a test, and a skill when agents will be
  asked to change it.
- **Layout and sections.** `app/v2/src/components/` and
  `app/v2/src/styles/site.css`, on the design system's tokens and components.
- **Interface words.** `app/v2/src/lib/texts.ts`, in both languages.
- **A contact form, analytics, a newsletter.** Each needs a service outside
  the static website and changes what the website does with personal data;
  see [publishing.md](publishing.md#what-the-template-does-not-do).

Before the pull request run, in `app/v2`:

```sh
bun install --frozen-lockfile
bun run check      # astro check, Biome, the content and every test, the build of each kept language included
```

The tests hold the website's rules, whatever the module's content is: the
build of each kept language has exactly the pages its content publishes
(drafts and empty lists included, also on the stable fixture
`app/v2/tests/fixtures/content/`) with one h1, titles, descriptions, canonical
addresses, link previews, alternative texts, landmarks, links that lead
somewhere, no other origin, little JavaScript and the words of one language;
every kind of content mistake on copies of the fixture; the build stopping on
a broken content rule; contrast of the colours the website uses, styles from
tokens only, the merged design system, paths that check out on Windows, the
skills, the start and build contracts of the Lazurio Module Standard and the
module's files. `app/v2/tests/template/` adds the template's own contract and
an adoption in each language; it skips in an adopted module.

## Languages

The website speaks one language at a time, `data/v2/language.yaml`. The
template carries Czech and English; an adopted module usually keeps only its
own. Lazurio does not pass a language to a module's App today; if it starts
to, the website still decides its language in its repository, because a
static build takes nothing from its environment, and the adoption sets the
file from the Organization's language.

A website in two languages at once (Czech at `/`, English at `/en/`, with a
switch and `hreflang`) is a change within the generation: routes for each
language in `app/v2/src/pages/`, the site model per language and tests for
both. It is not part of the template.

## When the module would change generation

Only when its content gets a data layer of its own. Examples: people who do
not use Git edit pages in a form, with a draft that someone reviews and
publishes; or the news, references or job offers come as records from
another module of the Organization. Then the records move to repository-db
and the App becomes `app/v3`:

1. A new `app/v3/` appears beside `app/v2/`, on the stack profile `content`
   with the data layer of `app-data` (`lazurio module create --data` writes
   the same layout). `app/v2` stays the default and the way back.
2. The Zod schemas of `app/v2/src/content/schemas.ts` become the schemas of
   the records; a migration script moves the files of `data/v2/` into the
   data repository and checks that nothing was lost.
3. `default_app` in `lazurio.module.json` switches to `app/v3` only on the
   decision of the Organization's Steward or the person, never as a fix.
4. The module keeps at most two generations; after the switch has held, the
   old one and `data/v2/` are deleted in a pull request (Git history keeps
   them).

## The design system

The look is the design system in `design-system/`: a release merged so that
its commit stays an ancestor (the design system's own `docs/adoption.md`),
recorded in `design-system.lock.json`, and used directly through the alias
`@design-system/*` (`design-system/app/v1/src/*`): its tokens, stylesheet and
components. Nothing of it is copied or edited here.

**A newer release** of the same design system (for example 2.0.0 of
`LazurioTemplates/design-system`, or the Organization's own next release) is
a merge of its tag into the same directory:

```sh
git fetch <the design system's repository URL> refs/tags/v<version>
test "$(git rev-parse 'FETCH_HEAD^{commit}')" = "<commit of the release>"
git merge -X subtree=design-system --no-ff -m "Website: take design system v<version>" FETCH_HEAD
```

Read the release's `CHANGELOG.md` first. Then update `design-system.lock.json`
(tag, commit, tree `git rev-parse HEAD:design-system`), adapt the website where
the design system changed what it uses (the alias, a component's properties,
a class of its stylesheet), run `bun run check`, look at the website in the
browser in both themes, and open a pull request that names the release.

**Another design system** (the Organization's own brand) replaces the
directory by a merge of its release, as step 7 of
[adoption.md](adoption.md#7-make-it-the-organizations-own) shows. From then
on, `design-system/` follows the Organization's design system; a release of
this template that moves to a newer design system conflicts there, and you
keep the Organization's directory and take that newer release into the
Organization's design system first.

## Taking an update of the template

A newer release of this template reaches an adopted module as a merge of its
tag, never as a copy. In a task worktree of the module:

```sh
git fetch template tag v<version>
test "$(git rev-parse 'v<version>^{commit}')" = "<commit from the Marketplace registry>"
git merge --no-ff -m "Website: take template release v<version>" 'v<version>^{commit}'
```

Read the release's `CHANGELOG.md` entry first; it says what changed and what
to do. When files conflict, keep the module's own: its identity
(`lazurio.module.json`, the `lazurio.runtime` id and names), its content in
`data/v2/<language>/` and `data/v2/language.yaml`, a deleted language
directory, and its own `design-system/` with `design-system.lock.json` when
the Organization replaced the design system. Take the template's tooling
(dependencies, `bun.lock`, configuration, App code, tests, skills,
workflows). Then run `bun install --frozen-lockfile` and `bun run check`, and
open a pull request that names the release and its commit. Declining the pull
request keeps the module as it was; an undo is a reviewed revert, never a
reset.

## Releasing the template

This part is for the maintainers of `LazurioTemplates/website`. A release is
an annotated tag `v<semver>` on `main` and a GitHub Release; the Marketplace
registry records the full commit of the tag. Creating the tag and the Release
is a Publication and waits for the maintainer's explicit instruction.

The version is semantic and independent of the generation:

- **major**: an adopted module must change its own files to take it: the
  shape of the content files, moved or renamed files, a new generation, a
  design system release or a stack profile release that breaks code;
- **minor**: new kinds of content, sections, interface words or tests, a
  design system or stack profile release that needs no change in adopted
  modules;
- **patch**: fixes, and patch versions of tools for a security fix.

Tool versions change only in two planned ways: a **profile release** of
Lazurio (`YYYY.MM`: new versions of the tools within the generation, for
example TypeScript 7 once `@astrojs/check` supports it) and a **generation
change** (the data layer). Besides these, only a patch version with a security
fix changes. The template adopts a profile release as a release of its own and
names the profile release in `README.md` and `CHANGELOG.md`; adopted modules
take it by merging that tag. A new release of the design system is taken the
same way, as a release of this template that names it.

Before a release:

1. Update `CHANGELOG.md` and `version` in `app/v2/package.json`. Keep
   `app/v2/tests/template/adoption.test.ts` true to `docs/adoption.md`: it is
   the proof that an adopted module passes its check.
2. Refresh the screens in `docs/screenshots/cs/` and `docs/screenshots/en/`
   (the same file names in both) when the website looks different: WebP,
   1600 px wide, taken from the static build at twice the pixel density of a
   1440 × 900 window and scaled down, invented content only. The first file
   of the registry's list is the Marketplace card.
3. Run `bun run check` and wait for green CI on `main`.
4. On the instruction: `git tag -a v<version> -m "v<version>"`, push the tag,
   `gh release create v<version> --verify-tag`, then a pull request to the
   registry (`Lazurio/marketplace`) with the tag's full commit.
