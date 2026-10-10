import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const source = fileURLToPath(
  new URL("../../../../assets/branding/", import.meta.url),
);
const destination = fileURLToPath(
  new URL("../public/branding/", import.meta.url),
);
const tokens = JSON.parse(
  await readFile(path.join(source, "brand/brand-tokens.json"), "utf8"),
);
const mapping = {
  bg: "near_black",
  surface: "graphite",
  accent: "electric_lime",
  "accent-highlight": "lime_highlight",
  "text-primary": "white",
  "text-muted": "muted_gray",
};
const variables = Object.entries(mapping).map(([name, key]) => {
  const value = tokens.primary_colors[key];
  if (!/^#[0-9a-f]{6}$/i.test(value))
    throw new Error(`Invalid brand color: ${key}`);
  return `  --mse-${name}: ${value};`;
});
await mkdir(destination, { recursive: true });
// Exclude Windows download metadata; official source files remain untouched.
await cp(source, destination, {
  recursive: true,
  filter: (p) => !p.endsWith(":Zone.Identifier"),
});
await writeFile(
  path.join(destination, "theme.css"),
  `/* Generated from assets/branding/brand/brand-tokens.json. Do not edit. */
:root {
${variables.join("\n")}
}
`,
);
console.log("Synchronized official branding and generated theme tokens.");
