#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { discoverFiles } from "./discovery.ts";
import { processFiles } from "./runner.ts";
import { writeIndividualMarkdown, writeJoinedMarkdown, writeJSON } from "./output.ts";
import { startWatcher } from "./watcher.ts";
import type { OutputFormat } from "./types.ts";

const main = defineCommand({
  meta: {
    name: "compmark",
    version: "0.3.0",
    description: "Auto-generate Markdown documentation from Vue 3 SFCs",
  },
  args: {
    out: {
      type: "string",
      description: "Output directory",
      default: ".",
    },
    ignore: {
      type: "string",
      description: "Comma-separated ignore patterns",
    },
    join: {
      type: "boolean",
      description: "Combine output into a single file",
    },
    format: {
      type: "string",
      description: "Output format: md | json",
      default: "md",
    },
    watch: {
      type: "boolean",
      description: "Watch for changes and rebuild",
    },
    silent: {
      type: "boolean",
      description: "Suppress non-error output",
    },
  },
  async run({ args }) {
    const inputPaths = collectInputPaths();

    if (inputPaths.length === 0) {
      console.error("Error: No input files or directories specified");
      console.error("Usage: compmark <files/dirs/globs> [options]");
      process.exit(1);
    }

    const format = args.format as OutputFormat;
    if (format !== "md" && format !== "json") {
      console.error(`Error: Unknown format "${format}". Use "md" or "json".`);
      process.exit(1);
    }

    const ignorePatterns = args.ignore
      ? args.ignore
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const silent = args.silent ?? false;
    const joined = args.join ?? false;
    const outDir = args.out ?? ".";

    const rebuild = async () => {
      const filePaths = await discoverFiles(inputPaths, ignorePatterns);

      if (filePaths.length === 0) {
        if (!args.watch) {
          console.error("Error: No .vue files found");
          process.exit(1);
        }
        console.warn("Warning: No .vue files found");
        return null;
      }

      const summary = processFiles(filePaths, { silent });

      if (format === "json") {
        writeJSON(summary.files, outDir, joined, silent);
      } else if (joined) {
        writeJoinedMarkdown(summary.files, outDir, silent);
      } else {
        writeIndividualMarkdown(summary.files, outDir, silent);
      }

      if (!silent) {
        console.log(
          `✓ ${summary.documented} components documented, ${summary.skipped} skipped, ${summary.errors} errors`,
        );
      }

      return summary;
    };

    const summary = await rebuild();

    if (args.watch) {
      startWatcher(inputPaths, ignorePatterns, () => {
        rebuild();
      });
    } else if (summary && summary.errors > 0) {
      process.exit(1);
    }
  },
});

function collectInputPaths(): string[] {
  const argv = process.argv.slice(2);
  const paths: string[] = [];
  const flagsWithValue = new Set(["--out", "--ignore", "--format"]);

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
