# Adopting the website into another Organization

This guide is for the agent that adopts this template for a person, usually
after "Přidat do Organizace" in the Marketplace of Lazurio handed it a brief
with the exact release, the target Organization and how the module starts.
Adoption is an agent's reviewed work in pull requests, not an installer. The
person decides; the agent prepares.

The result is a private module of the target Organization whose history
contains the release's commit as an ancestor, with the target's identity
(name, lease, Teams), its language, its own look (its design system) and,
unless the person chose the example, its own content. Later releases of the template reach it as
ordinary merges (see [Taking an update](extending.md#taking-an-update-of-the-template)).
Putting the website on the internet is not part of the adoption; it follows
[publishing.md](publishing.md) once the person wants it.

## What you need before you start

- The **release**: its tag `v<version>` and the full commit the tag points to,
  both from the brief or the Marketplace registry. A tag alone is not an
  immutable identity: fetch the tag and confirm that it resolves to that
  commit. If it does not, stop and report it.
- The **target Organization**, as the person named it. Never pick another one
  or a personal account instead.
- The **start**: `sample` keeps the website of the invented company Example to
  explore it; `empty` replaces it with the Organization's own content (step 7).
  When the brief does not say, ask.
- The **language**: `cs` or `en`, the language of the Organization. Lazurio
  does not pass a language to a module's App, so take the language Lazurio
  speaks in this Folder, `profile.locale` in `<Lazurio Folder>/.lazurio/preferences.json`,
  which is also the language of the brief. When the website's readers speak
  another language than the Organization's people, ask the person. Without an
  answer the website stays Czech.

## 1. Read the target's rules

Open the target Organization's root checkout and read its `AGENTS.md`, its
`lazurio.organization.json` and the nearest rules for modules. They apply
inside its checkout and win over this guide where they are stricter (language,
branch names, review). Work in a task worktree of the Organization root, never
in its primary checkout.

## 2. Check live rights

Rights come from GitHub now, not from a checkout:

```sh
gh api user --jq .login
gh api orgs/<Organization>/memberships/<login> --jq '.role,.state'   # admin, active
gh api repos/LazurioTemplates/website --jq .visibility                 # public
```

`lazurio module create` for an Organization is run by an active Owner (admin)
of that Organization. When the person is not one, do not look for another
way: prepare the plan and a short request for an Owner (who and what to run),
record it as an issue in the Organization's root repository, give the person
its URL and stop there.

## 3. Check the name

The template's module id is `website`. Look for a collision, letter case
ignored, before you propose the name:

- a slot or directory `website` in the target's `modules.manifest.json` or
  `workspace/`, and any module that already holds the Organization's website
  under another name (`website-<brand>`, `web`);
- a repository `<Organization>/website` on GitHub
  (`gh api repos/<Organization>/website`).

When the name is taken, do not reuse or overwrite anything. Tell the person
what exists and agree on another slug with them, for example
`website-<brand>` for a second brand's website. When the Organization already
has a website module, ask whether this one replaces it, stands beside it or
is only a trial; moving an existing website's content is a task of its own.
If the existing module is already an adoption of this template, this is an
update, not an adoption: follow
[Taking an update](extending.md#taking-an-update-of-the-template) in that
module instead.

## 4. Check compatibility

- Lazurio on the Environment runs Apps declared with `lazurio.runtime.v1` and
  `lazurio.preparation.v1`, knows `build_output` and `static_fallback`, and
  fetches the Bun the App pins (`packageManager`, `bun@1.4.4` in this release).
  `lazurio module list <Organization> --json` must list the Organization's
  modules.
- The App is static (`build_output: "dist"`) and declares no secrets and no
  siblings, so it needs nothing from the target besides a port of its pool.
- The Organization's design system: find it (a module `design-system`
  adopted from `LazurioTemplates/design-system` 2.0.0 or later, released as a
  tag of its repository) and the tag of its newest release. Step 7 makes the
  website depend on it in place of the template's.

## 5. Show the plan, then create the module

Run the generator as a dry run and show the person the plan together with
what follows from it (the private repository, the Teams that get Write, the
port, the release you will merge, the start, where the content and the look
will come from):

```sh
lazurio module create <Organization>/<slug> --stack astro --teams <team,team> --dry-run --json
```

The release is generation `app/v2`, which the generator does not write: it
writes `app/v1` for `--stack astro` without data, and the merge in step 6
replaces it with the template's `app/v2`. Do not add `--data`: the website has
no repository-db data. Teams come from the Organization's real list; ask the
person which ones, and never invent one. Only after the person confirms the
plan, run it with `--confirm <plan>` from the task worktree of the
Organization root. The run creates the private repository, places the module
in `workspace/<slug>`, pushes `main` and declares the slot in the worktree's
`modules.manifest.json`. Commit that and open the root's pull request;
merging it is the person's Publication.

## 6. Merge the release so it stays an ancestor

In a task worktree of the new module (`git worktree add`, a branch of its own):

```sh
git remote add template https://github.com/LazurioTemplates/website.git
git fetch template tag v<version>
test "$(git rev-parse 'v<version>^{commit}')" = "<commit from the brief>"
git merge --allow-unrelated-histories --no-ff --no-commit <commit>
```

Never squash, rebase or copy the files instead: the merge keeps the release as
an ancestor, and that is what lets a later release merge cleanly. Before you
commit the merge, resolve the files the scaffold and the template both have:

| File | Keep from the scaffold | Take from the template |
| --- | --- | --- |
| `lazurio.module.json` | `id`, `company`, `port_leases` | `apps`, `default_app` (both `app/v2/package.json`) |
| `app/v1/` | nothing: delete the whole directory (`git rm -r app/v1`) | |
| `app/v2/package.json` | `lazurio.runtime`: `title`, `company`, `module`, and `id` as the scaffold wrote it with `-v2` instead of `-v1` | everything else: `name`, `version`, scripts, exact dependencies, `packageManager`, `build_*`, `static_fallback`, `tags`, `description`, the listener, `preparation` |
| `app/v2/bun.lock` | | the template's; `bun install --frozen-lockfile` confirms it is current |
| `app/v2/` (the rest), `data/v2/`, `.agents/`, `.claude/`, `docs/`, `.gitattributes` | | the template's |
| `README.md`, `AGENTS.md` | | the template's, then adapt them (step 7) |
| `.gitignore` | | the template's: it keeps ignoring the build outputs of the deleted `app/v1` |
| `.github/workflows/` | | the template's `check.yml` and `windows.yml` |
| `.github/CODEOWNERS` | the target's Team, or no file when the Organization does not use one | |

Then `git commit -m "Website: adopt template release v<version>"`.

## 7. Make it the Organization's own

**Identity** (always):

- `README.md` and `AGENTS.md`: the Organization's name, and one line saying
  that the module was adopted from `LazurioTemplates/website` at
  `v<version>` (`<commit>`). Keep `LICENSE` and `NOTICE`; they are the
  template's license and attribution, which MIT requires to stay with the
  copy. Add a copyright line of your own to `NOTICE` for your changes if you
  want one.

**The language** (always): write the language into `data/v2/language.yaml`
(`language: cs` or `language: en`). Delete the directory of the other
language (`git rm -r data/v2/en` or `data/v2/cs`), so that nobody edits a
website that is never built; a later release of the template that changes
that language's example content then conflicts on deleted files, and you
keep them deleted.

**The look** (when the Organization has its own design system): the website
depends on the design system as a package, today the template's with the
fictional brand Example. Point it at the Organization's design system by
changing one line in `app/v2/package.json` (both packages are named
`design-system`, so no import changes):

```json
"design-system": "git+ssh://git@github.com/<Organization>/design-system.git#v<version>"
```

Then `bun install` (it updates `bun.lock`; commit both) and `bun run check`:
the contrast tests check the Organization's palette against every pair of
colours the website uses, in both themes. Changing the brand later is a new
release of the Organization's design system and a new tag in this line.
When the Organization has no design system yet, keep the template's and say
so in the pull request; the Organization may adopt the design system template
first. The wordmark beside the logo symbol is the text `name` of
`data/v2/<language>/site.yaml`.

*Known limitation:* an Organization's design system is a private repository,
and the module's GitHub Actions cannot install it without read access to it
(Lazurio/LazurioPlatform#915). On an Environment with the person's SSH key it
installs as it is; until the issue is resolved, tell the person that the
module's CI fails at `bun install` and ask the Organization's Admin for that
access (skill `admin-request`), without creating keys or secrets yourself.

**The content** (the `empty` start, or whenever the Organization is ready),
in `data/v2/<language>/`. Take every fact from the person or the Organization
(its earlier website, knowledge base, the commercial register); never invent
one and never copy another company's text or images:

1. `site.yaml`: `name`, `legalName`, `url` (the future public address, or keep
   `https://www.example.com` until it is known), `locale`, `description`, the
   call to action. Keep `indexing: false`.
2. `contacts.yaml`: the real contacts and company details; people only with
   their consent.
3. `pages/`: rewrite the home page, the about page and the contact text;
   replace the privacy page with the Organization's own privacy text, never
   the fictional one.
4. `services/` and `news/`: replace the examples or delete them. A list page
   without items says so; delete the page too when the website will not have
   that list.
5. `media/`: replace `share.png` with the Organization's own link preview
   (1200 × 630 px) and delete the example chart.

With the `sample` start, keep Example's content in the chosen language and do
the identity, the language and the look; tell the person that the content is
fictional and must not be published as it is.

## 8. Verify

In the module's task worktree:

```sh
cd app/v2
bun install --frozen-lockfile
bun run check      # astro check, Biome, the content and every test, the build of the kept language included
git merge-base --is-ancestor <commit> HEAD && echo ancestor
```

The tests of `app/v2/tests/template/` check the template itself and skip once
`lazurio.module.json` names the Organization; every other test holds the
module with its identity, its one language and its own content, empty lists
included. The template runs this adoption for both languages in its own CI
(`tests/template/adoption.test.ts`), so a failure here is in the module's
changes, not in the template.

Look at the website in the browser as `AGENTS.md` describes (build, preview on
a free port, 1280 and 390 px) and put screenshots into the pull request. Open
the module's pull request with what you did, what you verified, the merged
release and commit, and what is left. After both pull requests are merged and
the module is checked out on `main`, `lazurio module setup` must report it
`current`, and `lazurio module start <Organization>/<slug> --json` returns the
URL to open. A preview before the merge is not proof that the module runs in
the Organization.

## 9. Access for Teams, last

Who may open the module follows the Organization's manifest and live GitHub
grants, set the same way as for every other module of the Organization. The
Marketplace grants nothing and keeps no list of its own. Change access only
as the last step and only on the person's instruction.

## What you never do

- merge, tag, publish, put the website on the internet, connect a domain,
  change a repository's visibility or start anything for others without the
  person's explicit instruction;
- force-push, delete a branch, repository or data, or reset a protected
  branch; a failed or partial adoption keeps its worktree and tells the person
  exactly where to resume;
- read files of this template repository at run time, or import the design
  system by a path or copy its files: the module takes template updates by
  merge and the design system as a package on a released tag.
