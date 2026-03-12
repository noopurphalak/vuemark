import { watch, type FSWatcher } from "node:fs";
import { resolve, dirname } from "node:path";

export function startWatcher(inputs: string[], ignore: string[], rebuild: () => void): void {
  const roots = new Set<string>();
  for (const input of inputs) {
    if (input.endsWith(".vue")) {
      roots.add(dirname(resolve(input)));
    } else {
      roots.add(resolve(input));
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounce = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      console.log("[watch] Rebuilding...");
      try {
        rebuild();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[watch] Error: ${msg}`);
      }
      console.log("[watch] Done.");
    }, 300);
  };

  const watchers: FSWatcher[] = [];

  for (const root of roots) {
    try {
      const watcher = watch(root, { recursive: true }, (_event, filename) => {
        if (!filename || !filename.endsWith(".vue")) return;
        const shouldIgnore = ignore.some((pattern) => filename.includes(pattern));
        if (shouldIgnore) return;
        debounce();
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
