// The website's language and the file URL of its content directory
// (data/v2/<language>/), which astro.config.ts reads from data/v2/language.yaml
// (src/content/language.ts) and Vite writes into the code.
declare const __WEBSITE_LANGUAGE__: import("./content/language").Language;
declare const __WEBSITE_CONTENT__: string;
