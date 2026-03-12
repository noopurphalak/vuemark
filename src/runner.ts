import { parseComponent } from "./index.ts";
import type { RunSummary } from "./types.ts";

export function processFiles(filePaths: string[], options: { silent?: boolean }): RunSummary {
  const summary: RunSummary = {
    documented: 0,
    skipped: 0,
    errors: 0,
    files: [],
    errorDetails: [],
  };

  for (const filePath of filePaths) {
    try {
      const doc = parseComponent(filePath);

      if (doc.internal) {
        summary.skipped++;
        if (!options.silent) {
          const name = filePath.split("/").pop() ?? filePath;
          console.log(`  Skipped ${name} (marked @internal)`);
        }
        continue;
      }

      summary.documented++;
      summary.files.push({ path: filePath, doc });
    } catch (err: unknown) {
      summary.errors++;
      const name = filePath.split("/").pop() ?? filePath;
      const message = err instanceof Error ? err.message : String(err);
      summary.errorDetails.push({ path: filePath, error: message });
      if (!options.silent) {
        console.warn(`  Warning: Could not parse ${name}: ${message}`);
      }
    }
  }

  return summary;
}
