import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { glob } from "tinyglobby";

export async function discoverFiles(inputs: string[], ignore?: string[]): Promise<string[]> {
  const baseIgnore = ["**/node_modules/**"];
  const userIgnore = (ignore ?? []).map(normalizeIgnorePattern);
  const allIgnore = [...baseIgnore, ...userIgnore];

  const found = new Set<string>();

  for (const input of inputs) {
    const resolved = resolve(input);

    if (input.endsWith(".vue") && existsSync(resolved)) {
      found.add(resolved);
    } else if (isDirectory(resolved)) {
      const files = await glob("**/*.vue", {
        cwd: resolved,
        absolute: true,
        ignore: allIgnore,
      });
      for (const f of files) found.add(f);
    } else {
      const files = await glob(input, {
        absolute: true,
        ignore: allIgnore,
      });
      for (const f of files) found.add(f);
    }
  }

  return [...found].sort();
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function normalizeIgnorePattern(pattern: string): string {
  if (pattern.includes("*") || pattern.includes("/")) return pattern;
  return `**/${pattern}/**`;
}
