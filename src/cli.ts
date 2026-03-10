#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseComponent } from "./index.ts";
import { generateMarkdown } from "./markdown.ts";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: compmark-vue <path-to-component.vue>");
  process.exit(1);
}

if (!filePath.endsWith(".vue")) {
  console.error(`Error: Expected a .vue file, got: ${filePath}`);
  process.exit(1);
}

const abs = resolve(filePath);

if (!existsSync(abs)) {
  console.error(`Error: File not found: ${filePath}`);
  process.exit(1);
}

try {
  const doc = parseComponent(abs);
  const md = generateMarkdown(doc);
  const outFile = `${doc.name}.md`;
  const outPath = join(process.cwd(), outFile);
  writeFileSync(outPath, md, "utf-8");
  console.log(`Created ${outFile}`);
} catch (err: unknown) {
  const name = abs.split("/").pop() ?? filePath;
  const reason = err instanceof Error ? err.message : String(err);
  console.error(`Error: Could not parse ${name}: ${reason}`);
  process.exit(1);
}
