import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { ComponentDoc, SectionKey } from "./types.ts";
import { generateMarkdown, adjustHeadingLevel } from "./markdown.ts";
import type { MarkdownOptions } from "./markdown.ts";

export interface OutputOptions {
  preserveStructure?: boolean;
  basePath?: string;
  sectionOrder?: SectionKey[];
}

export function writeIndividualMarkdown(
  results: Array<{ path: string; doc: ComponentDoc }>,
  outDir: string,
  silent: boolean,
  options?: OutputOptions,
): Map<string, string> {
  mkdirSync(outDir, { recursive: true });
  const outputMap = new Map<string, string>();
  const usedNames = new Map<string, number>();
  const mdOptions: MarkdownOptions | undefined = options?.sectionOrder
    ? { sectionOrder: options.sectionOrder }
    : undefined;

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

    const md = generateMarkdown(doc, mdOptions);
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
  options?: { sectionOrder?: SectionKey[] },
): void {
  mkdirSync(outDir, { recursive: true });
  const sections: string[] = [];
  const mdOptions: MarkdownOptions | undefined = options?.sectionOrder
    ? { sectionOrder: options.sectionOrder }
    : undefined;

  const hasCategories = results.some(({ doc }) => doc.category);

  sections.push("# Component Documentation");
  sections.push("");
  sections.push(`*Generated: ${new Date().toISOString()}*`);

  if (hasCategories) {
    // Group by category
    const groups = new Map<string, Array<{ path: string; doc: ComponentDoc }>>();
    const uncategorized: Array<{ path: string; doc: ComponentDoc }> = [];

    for (const entry of results) {
      if (entry.doc.category) {
        const group = groups.get(entry.doc.category) ?? [];
        group.push(entry);
        groups.set(entry.doc.category, group);
      } else {
        uncategorized.push(entry);
      }
    }

    // Sort within each category alphabetically
    for (const group of groups.values()) {
      group.sort((a, b) => a.doc.name.localeCompare(b.doc.name));
    }
    uncategorized.sort((a, b) => a.doc.name.localeCompare(b.doc.name));

    // Table of contents with category groups
    sections.push("");
    sections.push("## Table of Contents");

    const sortedCategories = [...groups.keys()].sort();

    if (uncategorized.length > 0) {
      sections.push("");
      sections.push("### Uncategorized");
      sections.push("");
      for (const { doc } of uncategorized) {
        const anchor = doc.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
        sections.push(`- [${doc.name}](#${anchor})`);
      }
    }

    for (const category of sortedCategories) {
      sections.push("");
      sections.push(`### ${category}`);
      sections.push("");
      for (const { doc } of groups.get(category)!) {
        const anchor = doc.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
        sections.push(`- [${doc.name}](#${anchor})`);
      }
    }

    // Uncategorized components first, under ## Uncategorized heading
    if (uncategorized.length > 0) {
      sections.push("");
      sections.push("---");
      sections.push("");
      sections.push("## Uncategorized");

      for (const { doc } of uncategorized) {
        const anchor = doc.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
        const md = generateMarkdown(doc, mdOptions);
        const adjusted = adjustHeadingLevel(md, 2);
        sections.push("");
        sections.push(`<a id="${anchor}"></a>`);
        sections.push(adjusted.trimEnd());
      }
    }

    // Category sections
    for (const category of sortedCategories) {
      sections.push("");
      sections.push("---");
      sections.push("");
      sections.push(`## ${category}`);

      for (const { doc } of groups.get(category)!) {
        const anchor = doc.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
        const md = generateMarkdown(doc, mdOptions);
        const adjusted = adjustHeadingLevel(md, 2);
        sections.push("");
        sections.push(`<a id="${anchor}"></a>`);
        sections.push(adjusted.trimEnd());
      }
    }
  } else {
    // Flat TOC (no categories)
    sections.push("");
    sections.push("## Table of Contents");
    sections.push("");
    for (const { doc } of results) {
      const anchor = doc.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      sections.push(`- [${doc.name}](#${anchor})`);
    }

    // Component sections
    for (const { doc } of results) {
      const anchor = doc.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const md = generateMarkdown(doc, mdOptions);
      const adjusted = adjustHeadingLevel(md, 1);
      sections.push("");
      sections.push("---");
      sections.push("");
      sections.push(`<a id="${anchor}"></a>`);
      sections.push(adjusted.trimEnd());
    }
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
  options?: OutputOptions,
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
