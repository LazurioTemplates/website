---
name: change-contacts
description: Use when someone asks to change the website's contacts ("změň kontakty", "máme nové číslo", "přestěhovali jsme se", "přidej kolegu na kontakty", "change the contacts", "we moved", new opening hours or billing details). Changes data/v2/<language>/contacts.yaml and every text that repeats the old value, checks it with bun run check and in the browser, and prepares a pull request; publishing stays with the person.
---

# Change the contacts

The contacts are one file, `data/v2/<language>/contacts.yaml`. The website
shows them on the page with `shows: contacts` (Kontakt, Contact), in the
footer of every page and in the data for search engines on the home page. The field reference is
`data/v2/README.md`.

The website speaks one language, named in `data/v2/language.yaml` (`cs` or
`en`); its content is in `data/v2/<language>/`, and that is the directory you
change. `<language>` below means it. Write in that language only.

Work in a task worktree of this module on a branch of its own.

## 1. Change the file

| Field | What it is | Form |
| --- | --- | --- |
| `email` | The general e-mail | `info@example.org` |
| `phone` | The general phone | digits and spaces, `+420 123 456 789` |
| `address` | `street`, `postalCode`, `city`, `country` | `110 00`, `Praha 1` |
| `hours` | Rows of `days` and `time` | `Pondělí až čtvrtek`, `9.00–17.00` |
| `company` | `id` (in Czechia IČO, in quotes), `vatId` (DIČ or another VAT number, optional), `register` (the register entry, optional) | `"12345678"`, `CZ12345678` |
| `people` | People to contact: `name`, `role`, optional `email` and `phone` | |

- Take every value from the person or from an official source (the
  commercial register for IČO, DIČ and the register entry). Never guess one.
- A person's name, e-mail or phone is personal data: add someone to `people`
  only when the person you work for says that colleague agreed, and remove
  them when asked.
- Czech law asks a business to show its name, seat, IČO and register entry on
  its website (§ 435 of the Civil Code); keep `company` and `address` filled in.

## 2. Find the old value elsewhere

An old phone, e-mail or address can also be written in a page or a news item:

```sh
grep -rn "<old value>" data/v2/<language>
```

Change it in pages that describe the present (Kontakt, O nás; Contact, About us). Leave news
items as they were written, unless the person asks otherwise; a news item
about the move may even need a new one (skill `write-news`).

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

Open the contact page (`http://127.0.0.1:$PORT/kontakt/`, in English `/contact/`) and the footer of any page in the
Environment browser (`lazurio browser window --json`), 1280 and 390 px wide.
Try the e-mail and phone links (they open `mailto:` and `tel:`). Take a
screenshot for the pull request, then `kill $PREVIEW`.

## 5. Hand it over

Open a pull request that lists the old and new values and shows the
screenshot. After the merge Lazurio shows the change to the Organization; the
public website changes after its publication from `main`
(`docs/publishing.md`). Both are the person's Publication.
