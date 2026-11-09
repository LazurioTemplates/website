---
name: write-news
description: Use when someone asks to write, prepare, change or remove a news item on the website ("napiš aktualitu", "přidej novinku o …", "dej na web, že …", "write a news item", "put on the website that …"). Writes data/v2/<language>/news/<date>-<name>.md from facts the person gives, as a draft when it should wait, checks it with bun run check and in the browser, and prepares a pull request; publishing stays with the person.
---

# Write a news item

A news item is one Markdown file in `data/v2/<language>/news/`. The website
lists the newest first on the page with `shows: news` (Aktuality, News) and
the three newest on the home page, and gives each its own page. The field reference is
`data/v2/README.md`.

The website speaks one language, named in `data/v2/language.yaml` (`cs` or
`en`); its content is in `data/v2/<language>/`, and that is the directory you
change. `<language>` below means it. Write in that language only.

Work in a task worktree of this module on a branch of its own.

## 1. Gather the facts

Ask the person, or find in the Organization, what happened, when, for whom it
matters and what the reader can do next. Never invent a fact, number, quote,
customer or partner; name a customer or a person only when the person says
they agreed. When something is missing, ask for that one thing.

## 2. Write the file

The file name is the day of publication and a short name in the website's
language: `data/v2/<language>/news/2026-11-20-nova-pobocka.md` (today is
`date -u +%F`). The address of the item is the short name below the news page:
`/aktuality/nova-pobocka/` in Czech, `/news/new-branch/` in English.

```markdown
---
title: Otevíráme pobočku v Brně
date: 2026-11-20
summary: Od prosince nás najdete i v Brně. Konzultace tam domluvíte stejně jako v Praze.
---

Short paragraphs. The first one says what happened; the next ones what it
means for the reader. A link to a page: [Kontakt](/kontakt/).
```

- `date` is the same day as in the file name.
- `summary` (20 to 240 characters) is shown in the list and in link previews;
  `description` (50 to 170) is optional and replaces it for search engines.
- `draft: true` keeps the item out of the website until it is removed, for an
  item prepared ahead. A link to a draft counts as a dead link.
- An image: the file in `data/v2/<language>/media/`, then `image: ../media/<file>` and
  `imageAlt`. Only images the Organization owns or may use.
- Changing a published item: edit its file and keep its name, because the
  address may be shared already. Removing one: delete the file and every link
  to it.

## 3. Check it

```sh
cd app/v2
bun run validate:data
bun run check
```

## 4. Look at it in the browser

```sh
cd app/v2
bun run build
PORT=$(bun -e 'const s = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } }); console.log(s.port); s.stop()')
LAZURIO_RUNTIME_LISTENER_APP_HOST=127.0.0.1 LAZURIO_RUNTIME_LISTENER_APP_PORT=$PORT bun run preview &
PREVIEW=$!
```

The build is in the website's language. To look at the other language's
content of the template, build it with `WEBSITE_LANGUAGE=en bun run build`
(or `cs`) before the preview; Lazurio itself never sets that variable.

Open the item (`http://127.0.0.1:$PORT/<news page>/<name>/`), the news page and the home
page in the Environment browser (`lazurio browser window --json`), 1280 and
390 px wide. Take a screenshot of the item for the pull request, then
`kill $PREVIEW`.

## 5. Hand it over

Open a pull request with the text and the screenshot. The item appears to the
Organization in Lazurio after the merge, and on the public website after its
publication from `main` (`docs/publishing.md`). Both are the person's
Publication; never merge without their instruction.
