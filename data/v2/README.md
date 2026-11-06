# The website's content

Everything the website says lies here, beside the App (`app/v2/`), in
Markdown and YAML. People and agents change the website by changing these
files; the code only renders them. The App checks every file against its
schema (`app/v2/src/content/schemas.ts`) and the rules of the whole website
(`app/v2/src/content/model.ts`): `bun run validate:data` in `app/v2` reports
each problem with its file and field, and the build stops on the same
problems. A misspelt field name is an error, not something silently ignored.

The content of the template describes Example, an invented company. Nothing
in it is a real company, person, price or result.

## Languages

The website speaks one language. `language.yaml` names it, `cs` or `en`
(without the file the website is Czech), and the website is built from the
directory of that language. The template carries the same website in both:

| Path | Holds |
| --- | --- |
| `language.yaml` | The website's language |
| `cs/`, `en/` | The content in Czech and in English, each with the files below |
| `<language>/site.yaml` | The website's name, public address, description, link preview and the call to action |
| `<language>/contacts.yaml` | Address, e-mail, phone, hours, company details and people to contact |
| `<language>/pages/` | The pages, one Markdown file each; the file name is the address |
| `<language>/services/` | The services (or products), one file each |
| `<language>/news/` | The news, one file each, `YYYY-MM-DD-name.md` |
| `<language>/media/` | The images the content names |

The words of the interface itself (the menu button, "Všechny služby", "All
news") follow the same language; they are in `app/v2/src/lib/texts.ts`. A
page never mixes the two languages. Lazurio does not pass a language to a
module's App today, so the website's language is this file, set when the
template is adopted (`docs/adoption.md`). `bun run validate:data` checks every
language directory that is kept; one that the Organization does not use may
be deleted.

## `<language>/site.yaml`

| Field | Required | What it is |
| --- | --- | --- |
| `name` | yes | The short name, drawn as the wordmark and in page titles (`O nás \| Example`) |
| `legalName` | yes | The full name of the company, in the footer and the data for search engines |
| `url` | yes | The public address of the website without a path, `https://www.example.com`. Canonical addresses, link previews and the sitemap use it |
| `locale` | yes | The locale of the website's language for dates and link previews: `cs_CZ`, `en_GB`, `en_US` |
| `description` | yes | 50 to 160 characters about the whole website |
| `shareImage`, `shareImageAlt` | yes | The picture of a link shared elsewhere when a page has no image of its own (1200 × 630 px), relative to this file, and what it shows |
| `indexing` | yes | `false` asks search engines not to index the website (`robots.txt`, the robots meta tag); `true` once it is public at `url` |
| `callToAction` | no | `title`, optional `text` and `action` (`label`, `href`): the band at the end of the home page, the services page and every service |

## `<language>/contacts.yaml`

| Field | Required | What it is |
| --- | --- | --- |
| `email`, `phone` | yes | The general e-mail and phone (digits and spaces) |
| `address` | yes | `street`, `postalCode`, `city`, `country` |
| `hours` | no | Rows of `days` and `time` |
| `company` | yes | `id` (in Czechia IČO, in quotes), optional `vatId` (DIČ or another VAT number, `CZ12345678`) and `register` (the register entry) |
| `people` | no | `name`, `role` and optional `email`, `phone`; only people who agreed to be on the website |

## Pages: `<language>/pages/<address>.md`

The file name is the address: `index.md` is the home page `/`, `o-nas.md` is
`/o-nas/`, and `pravni/podminky.md` is `/pravni/podminky/`. Names use
lowercase letters, digits and hyphens. The text below the front matter is
Markdown.

| Field | Required | What it is |
| --- | --- | --- |
| `title` | yes | The heading and the name in menus, at most 70 characters |
| `description` | yes | 50 to 170 characters, what search engines and link previews show |
| `menu` | no | `main` (the header), `footer` or `none` (default) |
| `order` | no | Place in its menu, lower first (default 100) |
| `shows` | no | `services`, `news` or `contacts`: the list shown below the text. One page per list; the services and news get their addresses below it |
| `hero` | no | `eyebrow`, `title` (the page's visible heading instead of `title`), `lead` and up to two `actions` (`label`, `href`); the first is the primary button |
| `facts` | no | Up to four `value` and `label` pairs, shown as large numbers |
| `highlights` | no | Up to six `title` and `text` pairs |
| `image`, `imageAlt` | no | An image relative to the file and what it shows; always together |

The home page shows the services and the three newest news items by itself.

## Services: `<language>/services/<name>.md`

The address is `/<page that shows services>/<name>/`, for example
`/sluzby/audit-online-prodeje/` or `/services/sales-audit/`.

| Field | Required | What it is |
| --- | --- | --- |
| `title` | yes | The name of the service |
| `summary` | yes | 20 to 200 characters, the sentence on its card and the lead of its page |
| `description` | yes | 50 to 170 characters for search engines |
| `order` | no | Place in the lists, lower first |
| `price` | no | Free text, `od 24 000 Kč bez DPH` |
| `image`, `imageAlt` | no | As for pages |

## News: `<language>/news/YYYY-MM-DD-<name>.md`

The address is `/<page that shows news>/<name>/`, without the date.

| Field | Required | What it is |
| --- | --- | --- |
| `title` | yes | The heading |
| `date` | yes | The day of publication, the same as in the file name |
| `summary` | yes | 20 to 240 characters, shown in the lists and link previews |
| `description` | no | 50 to 170 characters for search engines instead of `summary` |
| `draft` | no | `true` keeps the item off the website until it is removed |
| `image`, `imageAlt` | no | As for pages |

## Links and images

- A link to a page of the website is its address with the trailing slash,
  `[Kontakt](/kontakt/)`. A link that leads to no page (a typo, a deleted page,
  a draft) is an error.
- An image is a file in `<language>/media/`, named relative to the content file:
  `image: ../media/photo.jpg` in front matter, `![What it shows](../media/photo.jpg)`
  in the text. Every image has its alternative text. The build makes WebP
  copies in the sizes screens need; keep the original under about 2400 px wide.
- Use only images and texts the Organization owns or may use.
