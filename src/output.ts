import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { ComponentDoc } from "./types.ts";
import { generateMarkdown, adjustHeadingLevel } from "./markdown.ts";

export function writeIndividualMarkdown(
  results: Array<{ path: string; doc: ComponentDoc }>,
  outDir: string,
  silent: boolean,
  options?: { preserveStructure?: boolean; basePath?: string },
): Map<string, string> {
  mkdirSync(outDir, { recursive: true });
  const outputMap = new Map<string, string>();
  const usedNames = new Map<string, number>();

  for (const { path: sourcePath, doc } of results) {
    let targetDir = outDir;

    if (options?.preserveStructure && options.basePath) {
      const relDir = relative(options.basePath, dirname(sourcePath));
      targetDir = join(outDir, relDir);
      mkdirSync(targetDir, { recursive: true });
    }

    const baseName = doc.name;
    const dedupKey = options?.preserveStructure ? `${targetDir}/${baseName}` : baseName;
    const count = usedNames.get(dedupKey) ?? 0;
    usedNames.set(dedupKey, count + 1);
    const fileName = count === 0 ? baseName : `${baseName}-${count + 1}`;

    const md = generateMarkdown(doc);
    const outPath = join(targetDir, `${fileName}.md`);
    writeFileSync(outPath, md, "utf-8");
    outputMap.set(sourcePath, outPath);
    if (!silent) console.log(`  Created ${fileName}.md`);
  }

  return outputMap;
}

export function writeJoinedMarkdown(
  results: Array<{ path: string; doc: ComponentDoc }>,
  outDir: string,
  silent: boolean,
): void {
  mkdirSync(outDir, { recursive: true });
  const sections: string[] = [];

  sections.push("# Component Documentation");
  sections.push("");
  sections.push(`*Generated: ${new Date().toISOString()}*`);

  // Table of contents
  sections.push("");
  sections.push("## Table of Contents");
  sections.push("");
  for (const { doc } of results) {
    const anchor = doc.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    sections.push(`- [${doc.name}](#${anchor})`);
  }

  // Component sections
  for (const { doc } of results) {
    const md = generateMarkdown(doc);
    const adjusted = adjustHeadingLevel(md, 1);
    sections.push("");
    sections.push("---");
    sections.push("");
    sections.push(adjusted.trimEnd());
  }

  const outPath = join(outDir, "components.md");
  writeFileSync(outPath, sections.join("\n") + "\n", "utf-8");
  if (!silent) console.log(`  Created components.md`);
}

export function writeJSON(
  results: Array<{ path: string; doc: ComponentDoc }>,
  outDir: string,
  joined: boolean,
  silent: boolean,
  options?: { preserveStructure?: boolean; basePath?: string },
): Map<string, string> {
  mkdirSync(outDir, { recursive: true });
  const outputMap = new Map<string, string>();

  if (joined) {
    const data = {
      generated: new Date().toISOString(),
      components: results.map((r) => r.doc),
    };
    const outPath = join(outDir, "components.json");
    writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    if (!silent) console.log(`  Created components.json`);
  } else {
    const usedNames = new Map<string, number>();

    for (const { path: sourcePath, doc } of results) {
      let targetDir = outDir;

      if (options?.preserveStructure && options.basePath) {
        const relDir = relative(options.basePath, dirname(sourcePath));
        targetDir = join(outDir, relDir);
        mkdirSync(targetDir, { recursive: true });
      }

      const baseName = doc.name;
      const dedupKey = options?.preserveStructure ? `${targetDir}/${baseName}` : baseName;
      const count = usedNames.get(dedupKey) ?? 0;
      usedNames.set(dedupKey, count + 1);
      const fileName = count === 0 ? baseName : `${baseName}-${count + 1}`;

      const outPath = join(targetDir, `${fileName}.json`);
      writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n", "utf-8");
      outputMap.set(sourcePath, outPath);
      if (!silent) console.log(`  Created ${fileName}.json`);
    }
  }

  return outputMap;
}
