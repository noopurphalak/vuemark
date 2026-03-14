import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { glob } from "tinyglobby";
import type { DiscoveryResult } from "./types.ts";

export async function discoverFiles(inputs: string[], ignore?: string[]): Promise<DiscoveryResult> {
  const baseIgnore = ["**/node_modules/**"];
  const userIgnore = (ignore ?? []).map(normalizeIgnorePattern);
  const allIgnore = [...baseIgnore, ...userIgnore];
  const hasUserIgnore = userIgnore.length > 0;

  const found = new Set<string>();
  let ignoredCount = 0;

  for (const input of inputs) {
    const resolved = resolve(input);

    if (input.endsWith(".vue") && existsSync(resolved)) {
      found.add(resolved);
    } else if (isDirectory(resolved)) {
      if (hasUserIgnore) {
        const allFiles = await glob("**/*.vue", {
          cwd: resolved,
          absolute: true,
          ignore: baseIgnore,
        });
        const filteredFiles = await glob("**/*.vue", {
          cwd: resolved,
          absolute: true,
          ignore: allIgnore,
        });
        ignoredCount += allFiles.length - filteredFiles.length;
        for (const f of filteredFiles) found.add(f);
      } else {
        const files = await glob("**/*.vue", {
          cwd: resolved,
          absolute: true,
          ignore: allIgnore,
        });
        for (const f of files) found.add(f);
      }
    } else {
      if (hasUserIgnore) {
        const allFiles = await glob(input, {
          absolute: true,
          ignore: baseIgnore,
        });
        const filteredFiles = await glob(input, {
          absolute: true,
          ignore: allIgnore,
        });
        ignoredCount += allFiles.length - filteredFiles.length;
        for (const f of filteredFiles) found.add(f);
      } else {
        const files = await glob(input, {
          absolute: true,
          ignore: allIgnore,
        });
        for (const f of files) found.add(f);
      }
    }
  }

  const files = [...found].sort();
  const basePath = computeBasePath(files);

  return { files, ignoredCount, basePath };
}

function computeBasePath(files: string[]): string {
  if (files.length === 0) return ".";
  if (files.length === 1) return dirname(files[0]!);

  const parts = files.map((f) => dirname(f).split("/"));
  const common: string[] = [];
  for (let i = 0; i < parts[0]!.length; i++) {
    const segment = parts[0]![i];
    if (parts.every((p) => p[i] === segment)) {
      common.push(segment!);
    } else {
      break;
    }
  }
  return common.join("/") || "/";
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
