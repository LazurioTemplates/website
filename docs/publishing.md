# Publishing the website

What the build of the website produces, where Lazurio shows it, and the ways
to put it on the internet. Publishing is a step of its own: Lazurio does not
host public websites, connect domains or change DNS, and the template does not
pretend that it does. Every step that makes the website public, or changes
where it is served, is a Publication and waits for the person's explicit
instruction; an agent prepares it.

## What the build produces

`bun run build` in `app/v2` writes the static website to `app/v2/dist/`, in
the language of `data/v2/language.yaml`:

| Output | What it is |
| --- | --- |
| `index.html`, `<address>/index.html` | One HTML file per page, service and news item, in a directory of its address (`/kontakt/` is `kontakt/index.html`) |
| `404.html` | The page for an unknown address, not indexed |
| `sitemap.xml` | Every page at its public address (`url` of `site.yaml`), news with their dates |
| `robots.txt` | `Disallow: /` while `indexing: false`; with `indexing: true` it allows everything and names the sitemap |
| `_astro/` | The stylesheet, the menu script and the images converted to WebP and JPEG, each with a content hash in its name |

There is no server code, database, secret or form handler in it: any service
that serves static files can serve it. The build takes nothing from its
environment, so the same commit gives the same website wherever it is built.

## What Lazurio does with it

Opened from `main`, Lazurio builds the website and serves `dist/` as the
module's App in the Organization's Environment (the Module Standard's
[built version](https://github.com/Lazurio/LazurioPlatform/blob/main/docs/module-standard.md#the-built-version-from-main),
`build_output: "dist"`, `static_fallback: "404"`), and rebuilds it after each
change of `main`. On a Remote Environment it is at the module's own address
behind the Lazurio sign-in, so only the Organization's people see it. That is
the preview of the website, not its publication: Lazurio offers no public
hosting, domain or DNS for a module.

## Before the first publication

In `data/v2/<language>/` and with the person:

- `site.yaml`: `url` is the real public address (`https://www.firma.cz`,
  without a path), `description` and the link preview (`shareImage`) are the
  Organization's, and `indexing: true` is set in the same pull request that
  is published, never earlier.
- `contacts.yaml`: real contacts and company details. Czech law asks a
  business to show its name, seat, IČO and register entry on its website
  (§ 435 of the Civil Code); the footer and the contact page show them.
- The privacy page is the Organization's own text, not the fictional one,
  and says truthfully what the website does with personal data. The template
  sets no cookies and loads nothing from another origin.
- No example content of Example is left (`grep -rn "Example" data/v2`).
- `bun run check` is green and the website was looked at in a browser.

## Ways to put it on the internet

Each way serves the same `dist/`. Choose with the person; the Organization
may already have a hosting or a domain at a registrar.

### A static hosting connected to the repository

A service that builds the website from the GitHub repository and publishes
it on every change of `main`, with a preview address for each pull request.
This is how Lazurio's own public websites are published (Cloudflare Pages);
similar services work the same way. The settings:

| Setting | Value |
| --- | --- |
| Repository and branch | the module's repository, `main` |
| Root directory | `app/v2` |
| Build command | `bun install --frozen-lockfile && bun run build` |
| Output directory | `dist` |
| Bun | 1.4.4, as `packageManager` pins it (the service's setting for the Bun version) |

The service gets read access to the repository through its own GitHub app,
which an Owner of the Organization approves. Its preview addresses show the
website before a merge; their pages name the public `url` as canonical, so
search engines do not index them as a second website, and a service that
can mark previews `noindex` should. Every merge to `main` is then also a
publication to the internet.

### Upload to an existing web hosting

When the Organization already has a web hosting (a Czech webhosting with FTP
or SFTP, for example), upload the contents of `dist/` into the website's
root directory. By hand: build, then upload. Automatically: a GitHub Actions
workflow of the module that runs `bun run build` and uploads `dist/` after a
merge to `main`, with the hosting's address and password as secrets of the
GitHub repository or environment, never in a file of the repository. One of
the websites run with Lazurio is published this way. Each upload is a
publication.

### What the hosting must do

- Serve `<address>/index.html` for `<address>/`, and redirect an address
  without the trailing slash to it (the links of the website always have it).
- Answer an unknown address with `404.html` and status 404.
- Serve HTTPS, and redirect `http://` and the other host (`www.` or without
  it) to `url`.
- Cache `/_astro/*` for a long time (the names change with the content) and
  revalidate the HTML.

## The domain

The domain is the Organization's, at its registrar. Pointing it at the hosting
is a DNS change the hosting describes (a CNAME or A record); it is made by the
person or the Organization's IT in the registrar's or hosting's account, never
with a password or token pasted into a chat or a file. An agent may prepare
the exact records and check the result afterwards (the address answers, HTTPS
is valid, `robots.txt` and `sitemap.xml` are reachable).

After the publication the module may record the public address as
`production_url` in `lazurio.runtime` of `app/v2/package.json`; Lazurio
checks its form and shows nothing else with it today.

## What the template does not do

- **A contact form.** A static website cannot receive a form. A form needs a
  service that receives it (a function of the hosting, a form service) and
  changes the privacy page: a separate decision with the person.
- **Analytics and cookies.** None are included. Adding them means a consent
  banner where the law asks for one and a change of the privacy page.
- **Several languages at once.** The website is built in one language
  ([extending.md](extending.md#languages)).
