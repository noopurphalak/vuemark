import { existsSync, unlinkSync, watch, type FSWatcher } from "node:fs";
import { resolve, dirname, join } from "node:path";

export interface WatcherOptions {
  rebuild: () => void | Promise<void>;
  incrementalUpdate?: (changedFile: string) => void | Promise<void>;
  removeOutput?: (changedFile: string) => void;
  isJoined: boolean;
}

export function startWatcher(
  inputs: string[],
  ignore: string[],
  rebuildOrOptions: (() => void) | WatcherOptions,
): void {
  // Backward compat: support simple callback or full options
  const options: WatcherOptions =
    typeof rebuildOrOptions === "function"
      ? { rebuild: rebuildOrOptions, isJoined: true }
      : rebuildOrOptions;

  const roots = new Set<string>();
  for (const input of inputs) {
    if (input.endsWith(".vue")) {
      roots.add(dirname(resolve(input)));
    } else {
      roots.add(resolve(input));
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const changedFiles = new Set<string>();

  const flush = async () => {
    if (options.isJoined || !options.incrementalUpdate) {
      // Joined mode or no incremental support: full rebuild
      console.log("[watch] Rebuilding...");
      try {
        await options.rebuild();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[watch] Error: ${msg}`);
      }
      console.log("[watch] Done.");
    } else {
      // Individual mode: incremental updates
      const files = [...changedFiles];
      changedFiles.clear();

      for (const file of files) {
        try {
          if (existsSync(file)) {
            const shouldIgnore = ignore.some((pattern) => file.includes(pattern));
            if (shouldIgnore) {
              // File now matches ignore → remove output
              if (options.removeOutput) options.removeOutput(file);
              console.log(`[watch] Ignored: ${file.split("/").pop()}`);
            } else {
              console.log(`[watch] Updating: ${file.split("/").pop()}`);
              await options.incrementalUpdate(file);
            }
          } else {
            // File deleted → remove output
            if (options.removeOutput) options.removeOutput(file);
            console.log(`[watch] Removed: ${file.split("/").pop()}`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[watch] Error processing ${file.split("/").pop()}: ${msg}`);
        }
      }
      console.log("[watch] Done.");
    }
  };

  const debounce = (filePath?: string) => {
    if (filePath) changedFiles.add(filePath);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      flush();
    }, 300);
  };

  const watchers: FSWatcher[] = [];

  for (const root of roots) {
    try {
      const watcher = watch(root, { recursive: true }, (_event, filename) => {
        if (!filename || !filename.endsWith(".vue")) return;
        const shouldIgnore = ignore.some((pattern) => filename.includes(pattern));
        if (shouldIgnore && options.isJoined) return;
        const fullPath = join(root, filename);
        debounce(fullPath);
      });
      watchers.push(watcher);
    } catch {
      console.warn(`[watch] Could not watch: ${root}`);
    }
  }

  console.log(`[watch] Watching ${roots.size} root(s) for changes...`);

  process.on("SIGINT", () => {
    for (const w of watchers) w.close();
    process.exit(0);
  });
}

export function removeOutputFile(outputMap: Map<string, string>, sourcePath: string): void {
  const outPath = outputMap.get(sourcePath);
  if (outPath && existsSync(outPath)) {
    unlinkSync(outPath);
    outputMap.delete(sourcePath);
  }
}
