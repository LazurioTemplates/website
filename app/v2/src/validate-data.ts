// `bun run validate:data`: checks the website's content in data/v2/ against
// its schemas and rules (src/content/read.ts), without building the website.
// Part of `bun run check`; run it after every change of the content.
import { resolve } from "node:path";
import { checkContent } from "./content/read";

const data = resolve(import.meta.dir, "../../../data/v2");
const problems = checkContent(data);
if (problems.length > 0) {
  console.error(`data/v2: ${problems.length} problem(s)`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log("data/v2: the content follows its schemas and rules.");
