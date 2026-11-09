import { createHash } from "node:crypto";
import { join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { satteri } from "@astrojs/markdown-satteri";
import { astroServerOptions, ModuleKitError, onShutdown } from "@lazurio/module-kit";
import { defineConfig } from "astro/config";
import { readLanguage } from "./src/content/language";
import { MARKDOWN_FEATURES } from "./src/content/markdown";

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
// app/v2); the development server may read it. The look comes from the
// design system's package (`design-system` in package.json).
// WEBSITE_DATA points the build at another content directory of the same
// shape; the tests build their fixtures with it, and Lazurio never sets it.
const data = process.env.WEBSITE_DATA
  ? resolve(process.env.WEBSITE_DATA)
  : fileURLToPath(new URL("../../data/v2/", import.meta.url));
const language = readLanguage(data);
const content = pathToFileURL(join(data, language) + sep).href;

export default defineConfig({
  ...(serving ? { server: listenerServer() } : {}),
  // A cache of its own for each content directory (each language, each test
  // fixture): another directory changes the configuration, so Astro clears
  // the content store instead of mixing the entries of two.
  cacheDir: `./node_modules/.astro/website-${createHash("sha256").update(content).digest("hex").slice(0, 12)}/`,
  // Every page is a directory with index.html, and every link ends with "/":
  // the address a static server answers without a redirect.
  trailingSlash: "always",
  build: { format: "directory" },
  // The development server shows the website as the build does.
  devToolbar: { enabled: false },
  // Astro's own Markdown processor, Sätteri, with the features the content
  // checks parse with (src/content/markdown.ts), so they see what renders.
  markdown: { syntaxHighlight: false, processor: satteri({ features: MARKDOWN_FEATURES }) },
  vite: {
    // No .env* files on the start path (standard 4.3).
    envDir: false,
    define: {
      __WEBSITE_LANGUAGE__: JSON.stringify(language),
      __WEBSITE_CONTENT__: JSON.stringify(content),
    },
    server: { strictPort: true, fs: { allow: [".", data] } },
    preview: { strictPort: true },
  },
});
