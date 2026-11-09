# Website: rules for agents

This repository is the website module of an Organization; in the template the
Organization is Example, an invented company. These rules add to the
Organization root `AGENTS.md`.

A module is one area of the Organization's work: the process agents follow,
the data the work is about and the app in which people see and change it.
Here the process is this file and the skills, the data is the website's
content in `data/v2/`, and the app is the website itself, built by `app/v2/`.

## Where things are

The website speaks one language, named in `data/v2/language.yaml` (`cs` or
`en`); its content is in `data/v2/<language>/`. `<language>` below means it.

| You are asked to change | Change | Skill |
| --- | --- | --- |
| A page, a text on it, the home page, a service | `data/v2/<language>/pages/`, `data/v2/<language>/services/` | `edit-page` |
| A news item | `data/v2/<language>/news/` | `write-news` |
| Address, phone, e-mail, hours, people, company details | `data/v2/<language>/contacts.yaml` | `change-contacts` |
| The website's name, public address, description, link preview, call to action | `data/v2/<language>/site.yaml` | `edit-page` |
| An image | `data/v2/<language>/media/` and the file that names it | `edit-page` |
| A word of the interface itself (Menu, Všechny služby, All news) | `app/v2/src/lib/texts.ts`, in both languages | |
| Colours, type, spacing, components | the design system, never here (see Design system) | |
| A new kind of content, a new section of a page, a new layout | `app/v2/src/` (code, with its tests) | |

The skills are in `.agents/skills/` (Codex) and `.claude/skills/` (Claude
Code), the same text in both. The fields of every content file are described
in `data/v2/README.md`. When a person sends a screenshot or a sentence,
search for it: `grep -rn "<a few words>" data/v2/<language> app/v2/src/lib/texts.ts`.

## Language

- The website's interface and content are in one language at a time, never
  mixed on a page. The template carries Czech (`data/v2/cs/`, the default)
  and English (`data/v2/en/`); `data/v2/language.yaml` chooses.
- Lazurio does not pass a language to a module's App today: the App's
  environment has none, and the shell document that carries the Folder's
  language is not served on a module's origin. So the language is this file,
  set when the template is adopted to the Organization's language
  (`docs/adoption.md`); a static build takes nothing from its environment.
- A new interface word goes into `app/v2/src/lib/texts.ts` in both languages;
  the build test fails when a page shows a word of the other language.
- `WEBSITE_LANGUAGE=en` (or `cs`) builds the other language for a preview or
  a test, and `WEBSITE_DATA` builds another content directory (the tests build
  their fixture with it). Lazurio never sets either.

## Rules for the content

- Content changes go to `data/v2/<language>/`, never into the code. The schemas in
  `app/v2/src/content/schemas.ts` change only when the person wants a new
  kind of content.
- Never invent a fact, price, number, person, customer, reference or quote.
  Ask the person for the one thing that is missing, or find it in the
  Organization (its knowledge base, an earlier website).
- A person's name, e-mail or phone goes on the website only when the person
  you work for says that colleague agreed.
- Use only images and texts the Organization owns or may use.
- Write in the website's language and the Organization's voice (its voice
  guide, where it has one), with the typography of the language.
- Links inside the website are addresses with the trailing slash
  (`/kontakt/`); `bun run validate:data` refuses a link that leads nowhere.

## See the website in a browser

After every change, look at what people will see, on a wide and a narrow
screen:

```sh
cd app/v2
bun run build
PORT=$(bun -e 'const s = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } }); console.log(s.port); s.stop()')
LAZURIO_RUNTIME_LISTENER_APP_HOST=127.0.0.1 LAZURIO_RUNTIME_LISTENER_APP_PORT=$PORT bun run preview &
PREVIEW=$!
```

Open `http://127.0.0.1:$PORT/<address>/` in the Environment browser:
`lazurio browser window --json` prints the `agent-browser` command for your
window and a link where the person can watch. Check the changed pages 1280
and 390 px wide (`set viewport 390 844`), the menu on the narrow screen, the
links you touched, and the page in the dark theme when you changed something
visual. Put a screenshot of the change into the pull request. Stop the
preview with `kill $PREVIEW`: stop only the processes you started, by their
PID, and use only a port you found free.

The build is in the website's language; `WEBSITE_LANGUAGE=en bun run build`
(or `cs`) builds the other one when you changed something both share, such as
the interface or the layout. `bun run dev` with the listener variables runs
the development server instead,
which shows a change of `data/v2/` at once; the build is what Lazurio and a
hosting serve, so check the build before the pull request.

## Publication

- The merge of a pull request into `main` is the person's Publication: never
  merge without their instruction. After it, Lazurio builds the website from
  `main` and shows it to the Organization.
- Putting the website on the internet, connecting a domain, changing DNS or a
  hosting is a separate Publication on a service of the Organization's choice
  (`docs/publishing.md`). Prepare it; do it only on the person's explicit
  instruction. Lazurio itself publishes no website to the internet.
- `indexing: true` in `data/v2/<language>/site.yaml` belongs to the publication: until the
  website is public at `url`, search engines are asked not to index it.
- No secret (a hosting password, a deploy token) is ever written into this
  repository.

## Design system

The website takes its look from the design system as the design system's own
`docs/adoption.md` asks: a release merged so that its commit stays an
ancestor, never a copy of its files.

- `design-system/` is that release (today `LazurioTemplates/design-system`
  v1.0.0), merged into its own directory because the root belongs to the
  website. `design-system.lock.json` names its repository, tag, commit and
  tree. Never edit a file in `design-system/`: the test compares the
  directory with the release's tree. A missing colour, size, component or
  rule is proposed to the design system itself.
- The website uses the design system directly, never a copy: its tokens
  (`@design-system/tokens`), its stylesheet (`@design-system/styles/global.css`)
  and its components (`Button`, `Card`, `Icon`, `MenuToggle`). The alias
  `@design-system/*` is `design-system/app/v1/src/*` (`app/v2/tsconfig.json`).
- `app/v2/src/styles/site.css` is the website's own layout on the tokens; its
  classes start with `site-`. Name tokens (`var(--text-muted)`,
  `var(--space-4)`); the tests refuse a literal colour and a px value outside
  the website's own geometry block.
- A newer release of the design system, or the Organization's own design
  system in place of the template's, arrives as a merge into `design-system/`
  (`docs/extending.md`). That is how the brand of the website changes.

## Lazurio Module Standard

- One repository is one module; the App lives in `app/v2/`, its content in
  `data/v2/`. `design-system/` is the merged design system release; its own
  manifest and App package are part of that release, not Apps of this module,
  and Lazurio does not read them.
- `dev` starts one Astro server; `prepare:app` (`astro sync`) is the
  preparation and `check:prepared` checks it.
- Opened from `main`, the App runs as its static build (`build_output:
  "dist"`, `static_fallback: "404"`). `build` (`astro build`) must succeed
  without the listener and write `dist/index.html` for the health path `/`;
  the build contract test checks it.
- The App reads its host and port only from
  `LAZURIO_RUNTIME_LISTENER_APP_HOST` and `_PORT` through `@lazurio/module-kit`
  and exits with code 2 without them. The port lives only in
  `lazurio.module.json`.
- No `.env*` files, secrets or imports from outside this repository
  (`design-system/` is part of it).
- One change, one worktree, one branch, one pull request; the primary checkout
  stays on `main`.

## Template

This repository is a public template of the Marketplace of Lazurio (MIT,
`LICENSE` and `NOTICE`), published by LazurioTemplates. Everything in it must
stay publishable:

- only the invented company Example, in Czech and English; never a real
  company's content, people, customers, logos or data, and never an image or
  font without a license that allows it (record it in `NOTICE`);
- the App stays generation `app/v2` on the content stack profile with exact
  versions; tool versions change only in a stack profile release or a
  generation change (`docs/extending.md`);
- a change that adopted modules must follow in their own files is a major
  release and says what to do in `CHANGELOG.md`;
- keep `docs/adoption.md`, `docs/extending.md`, `docs/publishing.md`,
  `data/v2/README.md` and the skills true when you change what they describe,
  and refresh `docs/screenshots/cs/` and `docs/screenshots/en/` (the same
  shots) when the website looks different;
- tags, GitHub Releases, merges and the registry entry are Publication: only
  on the maintainer's explicit instruction.

| You are doing | Read |
| --- | --- |
| An adoption of this template into another Organization | `docs/adoption.md` |
| A change of tools, a design system release, a generation change, a release or a template update | `docs/extending.md`, `CHANGELOG.md` |
| Putting the website on the internet | `docs/publishing.md` |

## Tests

- `bun run check` is the module's one gate: the type check, Biome,
  `validate:data` (the content of every language kept in `data/v2/`) and the
  tests in `app/v2/tests/`. They hold the module whatever its content is: the
  build of each kept language has exactly the pages its content publishes,
  and their SEO, accessibility and words of one language; the content rules,
  on copies of the stable fixture in `app/v2/tests/fixtures/content/`; the
  start and build contracts; tokens, styles, the design system, paths, skills
  and the module's files.
- `bun run build` stops on the same rules of the content as `validate:data`
  in the language it builds: the schemas, the site model and the alternative
  text of every image. Images and links are read from what the Markdown
  renders, with Astro's own parser (Sätteri, `app/v2/src/content/markdown.ts`),
  never with a pattern over the source, so every form counts: inline,
  references with their definition anywhere, and HTML in the text. Lazurio and a hosting run the build, so a broken rule
  never reaches the website.
- `app/v2/tests/template/` checks the template itself: its placeholders, both
  languages, the screens, and an adoption by `docs/adoption.md` in each
  language, whose own `bun run check` must pass. It skips once
  `lazurio.module.json` names an Organization, so an adopted module keeps it
  as it came, and later releases of the template merge into it without
  conflicts.

## Verification before a pull request

```sh
cd app/v2
bun install --frozen-lockfile
bun run check      # astro check, Biome, the content of data/v2 and every test, the build of each kept language included
lazurio module setup <path to the module> --root <Lazurio Folder> --json
```

The expected `module setup` status is `current`. Then look at the website in
the browser as above.
