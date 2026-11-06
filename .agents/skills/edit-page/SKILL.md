---
name: edit-page
description: Use when someone asks to add, change, move or remove a page of the website or a text on it ("přidej stránku", "uprav stránku O nás", "oprav tuhle větu", "add a page", "fix this sentence", a screenshot with a request), the home page and the services included. Changes the content in data/v2/ without touching code, checks it with bun run check and in the browser, and prepares a pull request; publishing stays with the person.
---

# Add or change a page of the website

The website's content lies in `data/v2/`, beside the App, as Markdown and YAML.
The App in `app/v2/` only renders it. You change content, not code. The field
reference is `data/v2/README.md`.

The website speaks one language, named in `data/v2/language.yaml` (`cs` or
`en`); its content is in `data/v2/<language>/`, and that is the directory you
change. `<language>` below means it. Write in that language only.

Work in a task worktree of this module on a branch of its own, never in its
primary checkout.

## 1. Find where the text lies

| What the person sees | File |
| --- | --- |
| The home page: headline, lead, buttons, numbers, three points, text below | `data/v2/<language>/pages/index.md` |
| Another page (O nás, the text above the services, news or contacts) | `data/v2/<language>/pages/<address>.md` |
| A service: its card and its own page | `data/v2/<language>/services/<name>.md` |
| A news item | `data/v2/<language>/news/<date>-<name>.md`; use the skill `write-news` |
| Address, phone, e-mail, hours, people, IČO | `data/v2/<language>/contacts.yaml`; use the skill `change-contacts` |
| The website's name, description, link preview, the call to action band | `data/v2/<language>/site.yaml` |
| Words of the interface itself (Menu, Všechny služby, Fakturační údaje), in both languages | `app/v2/src/lib/texts.ts` |

When the person sends a screenshot or quotes a sentence, search for a few of its
words: `grep -rn "<a few words>" data/v2/<language> app/v2/src/lib/texts.ts`.

## 2. Change it

- **A new page** is a new file `data/v2/<language>/pages/<address>.md`. The
  file name is the address: `cenik.md` is `/cenik/`, `pravni/podminky.md` is
  `/pravni/podminky/`. Lowercase letters, digits and hyphens only, no
  diacritics. The front matter needs `title` (at most 70 characters) and
  `description` (50 to 170 characters, what search engines show). `menu: main`
  puts the page into the main menu, `menu: footer` into the footer, and
  `order` sets its place (lower first).

  ```markdown
  ---
  title: Ceník
  description: Ceny služeb Example na jednom místě. Audit, experimenty, měření a školení, s tím, co cena obsahuje a co ne.
  menu: main
  order: 15
  ---

  Text of the page in Markdown. A link to another page: [Kontakt](/kontakt/).
  ```

  On an English website the same page is `pricing.md` among the English
  pages, with an English title and description.

- **A new service** is a file `data/v2/<language>/services/<name>.md` with `title`,
  `summary` (the sentence on its card), `description`, `order` and optionally
  `price`. It appears on the home page and on the page with
  `shows: services`, at `/<that page>/<name>/`.
- **Links inside the website** are addresses with the trailing slash:
  `[Kontakt](/kontakt/)`, never `/kontakt` or a full `https://` address of the
  website itself.
- **Images** go to `data/v2/<language>/media/`. A page, service or news item names one
  with `image: ../media/<file>` and `imageAlt` (what the image shows, for
  people who do not see it); inside the text `![What it shows](../media/<file>)`.
  Use only images the Organization owns or may use, never one found on the
  internet. The build converts and resizes them.
- **Removing a page**: delete its file and every link to it; `bun run
  validate:data` lists the links that would lead nowhere.
- **Renaming an address** breaks links shared elsewhere. Do it only when the
  person wants it, and say so.
- **The words** are the Organization's. Never invent a fact, price, number,
  name or reference; ask the person, or find it in the Organization (its
  knowledge base, an earlier website). Follow the Organization's voice guide
  where it has one, with the typography of the language (Czech „uvozovky“
  and 9.00–17.00, English “quotes” and 9:00–17:00).

## 3. Check it

```sh
cd app/v2
bun run validate:data   # the content against its schemas and rules, in a second
bun run check           # types, Biome, the content and every test, the build included
```

A problem names its file and field, for example `pages/cenik.md: description:
Too small`. Fix the content, not the schema; a schema changes only when the
person wants a new kind of content, in the same pull request.

## 4. Look at it in the browser

Check what people will see, on a wide and a narrow screen:

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

Open `http://127.0.0.1:$PORT/<address>/` in the Environment browser
(`lazurio browser window --json` prints the `agent-browser` command for your
window and a link where the person can watch). Look at the page 1280 and
390 px wide (`set viewport 390 844`), follow its links and the menu, and take
a screenshot of the changed part for the pull request. Then stop the preview
with `kill $PREVIEW`; stop only your own process.

## 5. Hand it over

Commit, push and open a pull request that says what changed and shows the
screenshot. After the merge, Lazurio shows the website from `main` to the
Organization; the public website changes only when it is published from
`main` (`docs/publishing.md`). The merge is the person's Publication: never
merge without their instruction.
