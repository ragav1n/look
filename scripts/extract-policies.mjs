/* Emit a policy page's copy as HTML, for pasting into Shopify's policy editor
   (Settings -> Policies -> the <> source button).

   Shopify needs its own copy of the Refund, Shipping and Terms policies: the
   theme renders them at /policies/*, checkout links to them, and until they
   exist those URLs 404. The wording has to stay identical to the site's, so
   this reads the props straight off the rendered React element rather than
   asking anyone to retype 30 paragraphs of binding legal copy.

   Usage:
     node scripts/extract-policies.mjs shipping | pbcopy
     node scripts/extract-policies.mjs returns
     node scripts/extract-policies.mjs terms

   Verify a paste landed intact by diffing the rendered Shopify page against
   this output - see docs/shopify.md. */
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PAGES = { returns: "Returns", shipping: "Shipping", terms: "Terms" };

const which = process.argv[2];
if (!PAGES[which]) {
  console.error(`usage: node scripts/extract-policies.mjs <${Object.keys(PAGES).join("|")}>`);
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const outfile = path.join(mkdtempSync(path.join(tmpdir(), "policy-")), "bundle.mjs");

await build({
  stdin: {
    contents: `export { default as page } from '@/pages/${PAGES[which]}';`,
    resolveDir: root,
    loader: "tsx",
  },
  bundle: true,
  format: "esm",
  outfile,
  jsx: "automatic",
  alias: { "@": path.join(root, "src") },
  absWorkingDir: root,
  logLevel: "error",
});

const { page } = await import(pathToFileURL(outfile).href);
const props = page().props;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* A body block is a paragraph, or { bullets } - mirrors PolicyBlock. */
const blocks = (body) =>
  body
    .map((b) =>
      typeof b === "string"
        ? `<p>${esc(b)}</p>`
        : `<ul>\n${b.bullets.map((li) => `  <li>${esc(li)}</li>`).join("\n")}\n</ul>`,
    )
    .join("\n");

const section = (s) =>
  [
    `<h3>${esc(s.heading)}</h3>`,
    blocks(s.body),
    ...(s.subsections ?? []).map((sub) => `<h4>${esc(sub.heading)}</h4>\n${blocks(sub.body)}`),
  ].join("\n");

const intro = Array.isArray(props.intro) ? props.intro : [props.intro];
const parts = [
  intro.map((t) => `<p>${esc(t)}</p>`).join("\n"),
  ...props.sections.map(section),
];
/* `closing` is the document's own sign-off; the Contact Us block is
   PolicyPage's shared footer, reproduced here so the Shopify copy reads
   as a complete document on its own. */
if (props.closing) parts.push(section(props.closing));
if (props.contactIntro) {
  parts.push(
    `<h3>Contact Us</h3>\n<p>${esc(props.contactIntro)}</p>\n` +
      `<p>Email: <a href="mailto:support@look.ind.in">support@look.ind.in</a></p>`,
  );
}

process.stdout.write(parts.join("\n\n") + "\n");
