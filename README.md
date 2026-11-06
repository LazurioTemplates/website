# Website

Modul `website` Organizace `replace-with-org-slug`: web v Astru s TypeScript
strict. Vznikl příkazem `lazurio module create --stack astro` a splňuje
Lazurio Module Standard.

## Struktura

- `lazurio.module.json` — identita Modulu, lease `main` z poolu Organizace,
  `apps[]` a `default_app`.
- `app/v1/` — App; `package.json` nese `lazurio.runtime` (listener
  `app`, health `/`) a `lazurio.preparation`; `astro.config.ts`
  čte listener přes `@lazurio/module-kit` jen při `astro dev`/`preview`.
- `.github/workflows/check.yml` — CI: `bun install --frozen-lockfile`,
  `bun run check` (typová kontrola, Biome a testy).

## Stack

Modul vznikl podle stack profilu
[`content` 2026.11](https://github.com/Lazurio/LazurioPlatform/blob/main/docs/stack-profiles.md#content): přesné
verze Bunu, TypeScriptu, Biome a frameworku v `app/v1/package.json` jsou jeho.
Mění se jen řízeně: novým vydáním profilu, které Modul převezme vlastním PR,
nebo přechodem na další generaci `app/v<N>`.

## Vývoj

```sh
cd app/v1
bun install --frozen-lockfile
bun run prepare:app   # astro sync (typy obsahu)
bun run check         # astro check, biome, jednotkové testy a start kontrakt
```

Start patří Launchpadu: `lazurio module start replace-with-org-slug/website --json`
a otevři `result.runtime.url`. Ruční start jen s listener proměnnými (port je
lease `main` v `lazurio.module.json`):

```sh
LAZURIO_RUNTIME_LISTENER_APP_HOST=127.0.0.1 LAZURIO_RUNTIME_LISTENER_APP_PORT=<port> bun run dev
```

## Příprava

- `prepare:app` spouští `astro sync`; `check:prepared` ověří, že vygenerované
  typy existují.
- Z `main` Launchpad App otevírá jako její sestavenou verzi: `bun run build`
  zapíše `dist/` (`build_output`) a Platforma ho servíruje sama. `dev` spouští
  jeden proces `astro dev` pro vývojovou verzi.
