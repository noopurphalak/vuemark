#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { discoverFiles } from "./discovery.ts";
import { processFiles } from "./runner.ts";
import { writeIndividualMarkdown, writeJoinedMarkdown, writeJSON } from "./output.ts";
import { startWatcher, removeOutputFile } from "./watcher.ts";
import { parseComponent } from "./index.ts";
import { loadCompmarkConfig, mergeWithCLIFlags } from "./config.ts";
import type { OutputFormat } from "./types.ts";

const main = defineCommand({
  meta: {
    name: "compmark",
    version: "0.5.0",
    description: "Auto-generate Markdown documentation from Vue 3 SFCs",
  },
  args: {
    paths: {
      type: "positional",
      description: "Files, directories, or glob patterns",
      required: false,
    },
    out: {
      type: "string",
      description: "Output directory",
      valueHint: "DIR",
    },
    ignore: {
      type: "string",
      description: "Comma-separated ignore patterns",
      valueHint: "PATTERNS",
    },
    join: {
      type: "boolean",
      description: "Combine output into a single file",
    },
    format: {
      type: "string",
      description: "Output format: md | json",
      valueHint: "md|json",
    },
    watch: {
      type: "boolean",
      description: "Watch for changes and rebuild",
    },
    silent: {
      type: "boolean",
      description: "Suppress non-error output",
    },
    "preserve-structure": {
      type: "boolean",
      description: "Preserve input folder structure in output",
    },
    config: {
      type: "string",
      description: "Path to config file",
      valueHint: "PATH",
    },
  },
  async run({ args }) {
    // Load and merge config
    const fileConfig = await loadCompmarkConfig(
      (args as Record<string, unknown>).config as string | undefined,
    );
    const resolved = mergeWithCLIFlags(fileConfig, args as Record<string, unknown>);

    // Determine input paths: CLI positional args, falling back to config.include
    const cliPaths = collectInputPaths();
    const inputPaths = cliPaths.length > 0 ? cliPaths : (resolved.include ?? []);

    if (inputPaths.length === 0) {
      console.error("Error: No input files or directories specified");
      console.error("Usage: compmark <files/dirs/globs> [options]");
      console.error('Tip: Add "include" to compmark.config.ts or pass paths as arguments');
      process.exit(1);
    }

    const format = (resolved.format ?? "md") as OutputFormat;
    if (format !== "md" && format !== "json") {
      console.error(`Error: Unknown format "${format}". Use "md" or "json".`);
      process.exit(1);
    }

    const ignorePatterns = resolved.exclude ?? [];
    const silent = resolved.silent ?? false;
    const joined = resolved.join ?? false;
    const outDir = resolved.outDir ?? ".";
    const preserveStructure = resolved.preserveStructure ?? false;
    const sectionOrder = resolved.sectionOrder;

    let outputMap = new Map<string, string>();
    let lastBasePath = "";

    const rebuild = async () => {
      const {
        files: filePaths,
        ignoredCount,
        basePath,
      } = await discoverFiles(inputPaths, ignorePatterns);
      lastBasePath = basePath;

      if (filePaths.length === 0) {
        if (!resolved.watch) {
          console.error("Error: No .vue files found");
          process.exit(1);
        }
        console.warn("Warning: No .vue files found");
        return null;
      }

      const summary = processFiles(filePaths, { silent });

      const outputOptions = { preserveStructure, basePath, sectionOrder };

      if (format === "json") {
        outputMap = writeJSON(summary.files, outDir, joined, silent, outputOptions);
      } else if (joined) {
        writeJoinedMarkdown(summary.files, outDir, silent, { sectionOrder });
      } else {
        outputMap = writeIndividualMarkdown(summary.files, outDir, silent, outputOptions);
      }

      const totalSkipped = summary.skipped + ignoredCount;

      if (!silent) {
        console.log(
          `✓ ${summary.documented} components documented, ${totalSkipped} skipped, ${summary.errors} errors`,
        );
      }

      return summary;
    };

    const summary = await rebuild();

    if (resolved.watch) {
      const outputOptions = { preserveStructure, basePath: lastBasePath, sectionOrder };

      startWatcher(inputPaths, ignorePatterns, {
        rebuild: async () => {
          await rebuild();
        },
        incrementalUpdate: (changedFile: string) => {
          try {
            const doc = parseComponent(changedFile);
            if (doc.internal) {
              // Component became @internal — remove output
              removeOutputFile(outputMap, changedFile);
              if (!silent)
                console.log(`  Skipped ${changedFile.split("/").pop()} (marked @internal)`);
              return;
            }
            const result = [{ path: changedFile, doc }];
            let newMap: Map<string, string>;
            if (format === "json") {
              newMap = writeJSON(result, outDir, false, silent, outputOptions);
            } else {
              newMap = writeIndividualMarkdown(result, outDir, silent, outputOptions);
            }
            // Update the output map
            for (const [k, v] of newMap) {
              outputMap.set(k, v);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!silent)
              console.warn(`  Warning: Could not parse ${changedFile.split("/").pop()}: ${msg}`);
          }
        },
        removeOutput: (changedFile: string) => {
          removeOutputFile(outputMap, changedFile);
        },
        isJoined: joined,
      });
    } else if (summary && summary.errors > 0) {
      process.exit(1);
    }
  },
});

function collectInputPaths(): string[] {
  const argv = process.argv.slice(2);
  const paths: string[] = [];
  const flagsWithValue = new Set(["--out", "--ignore", "--format", "--config"]);

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i]!;
    if (arg === "--") {
      paths.push(...argv.slice(i + 1));
      break;
    }
    if (flagsWithValue.has(arg)) {
      i += 2;
    } else if (arg.startsWith("--") && arg.includes("=")) {
      i++;
    } else if (arg.startsWith("--")) {
      i++;
    } else {
      paths.push(arg);
      i++;
    }
  }

  return paths;
}

runMain(main);
