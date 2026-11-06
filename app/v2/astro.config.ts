import { fileURLToPath } from "node:url";
import { astroServerOptions, ModuleKitError, onShutdown } from "@lazurio/module-kit";
import { defineConfig } from "astro/config";
import { readLanguage } from "./src/content/language";

const LISTENER = "app";

// Host and port come only from the Launchpad listener (Lazurio Module Standard
// 4.2). Astro evaluates `server` during `astro build`, `astro check` and
// `astro sync` too, so the listener is read only when Astro serves.
const serving = process.argv.includes("dev") || process.argv.includes("preview");

function listenerServer(): ReturnType<typeof astroServerOptions> {
  try {
    return astroServerOptions(LISTENER);
  } catch (error) {
    if (!(error instanceof ModuleKitError)) throw error;
    console.error(`Start through Lazurio lifecycle: ${error.message}`);
    process.exit(2);
  }
}

// SIGTERM from the Launchpad ends the dev server with exit 0 (standard 4.4).
if (serving) onShutdown(() => undefined);

// The content lies beside the App in data/v2/<language>/ (App generation
// app/v2), and the look comes from the design system merged into
// design-system/ (docs/extending.md). The development server may read both.
const data = fileURLToPath(new URL("../../data/v2/", import.meta.url));
const designSystem = fileURLToPath(new URL("../../design-system/", import.meta.url));
const language = readLanguage(data);

export default defineConfig({
  ...(serving ? { server: listenerServer() } : {}),
  // A cache of its own for each language: a change of the language changes
  // the configuration, so Astro clears the content store instead of mixing
  // the entries of two languages.
  cacheDir: `./node_modules/.astro/website-${language}/`,
  // Every page is a directory with index.html, and every link ends with "/":
  // the address a static server answers without a redirect.
  trailingSlash: "always",
  build: { format: "directory" },
  // The development server shows the website as the build does.
  devToolbar: { enabled: false },
  markdown: { syntaxHighlight: false },
  vite: {
    // No .env* files on the start path (standard 4.3).
    envDir: false,
    // The App's own TypeScript configuration for every file it compiles, also
    // the design system's in design-system/, whose tsconfig.json extends a
    // package installed only in the design system's own App.
    tsconfig: "./tsconfig.json",
    define: { __WEBSITE_LANGUAGE__: JSON.stringify(language) },
    server: { strictPort: true, fs: { allow: [".", data, designSystem] } },
    preview: { strictPort: true },
  },
});
