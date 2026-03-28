import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { loadConfig } from "c12";
import { defu } from "defu";
import type { CompmarkConfig, SectionKey } from "./types.ts";
import { DEFAULT_SECTION_ORDER } from "./types.ts";

const DEFAULT_CONFIG: CompmarkConfig = {
  outDir: ".",
  format: "md",
  join: false,
  preserveStructure: false,
  silent: false,
  watch: false,
  // Note: sectionOrder intentionally omitted — applied after load to prevent
  // defu (used by c12 internally) from concatenating it with the user's array.
};

export async function loadCompmarkConfig(configPath?: string): Promise<CompmarkConfig> {
  try {
    const { config } = await loadConfig<CompmarkConfig>({
      name: "compmark",
      configFile: configPath,
      defaults: DEFAULT_CONFIG,
    });
    // Apply array defaults after load so user values are never concatenated with defaults
    config.sectionOrder ??= DEFAULT_SECTION_ORDER;
    return config;
  } catch {
    return { ...DEFAULT_CONFIG, sectionOrder: DEFAULT_SECTION_ORDER };
  }
}

export function mergeWithCLIFlags(
  config: CompmarkConfig,
  cliArgs: Record<string, unknown>,
): CompmarkConfig {
  const overrides: Record<string, unknown> = {};

  if (cliArgs.out !== undefined) overrides.outDir = cliArgs.out;
  if (cliArgs.format !== undefined) overrides.format = cliArgs.format;
  if (cliArgs.join !== undefined) overrides.join = cliArgs.join;
  if (cliArgs.silent !== undefined) overrides.silent = cliArgs.silent;
  if (cliArgs.watch !== undefined) overrides.watch = cliArgs.watch;
  if (cliArgs["preserve-structure"] !== undefined)
    overrides.preserveStructure = cliArgs["preserve-structure"];

  // Convert --ignore comma string to exclude array
  if (cliArgs.ignore !== undefined) {
    const raw = String(cliArgs.ignore);
    overrides.exclude = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (cliArgs.sectionOrder !== undefined) overrides.sectionOrder = cliArgs.sectionOrder;

  const merged = defu(overrides, config) as CompmarkConfig;
  // defu concatenates arrays; replace array fields explicitly when CLI provided them
  if (overrides.exclude !== undefined) merged.exclude = overrides.exclude as string[];
  if (overrides.sectionOrder !== undefined)
    merged.sectionOrder = overrides.sectionOrder as SectionKey[];
  return merged;
}

export function resolveAliases(
  config: CompmarkConfig,
  projectRoot: string,
): Record<string, string> {
  const tsconfigAliases = readTsConfigAliases(projectRoot);

  // Config aliases take precedence over tsconfig paths
  return { ...tsconfigAliases, ...config.aliases };
}

// --- Internal helpers ---

interface TsConfigCompilerOptions {
  paths?: Record<string, string[]>;
  baseUrl?: string;
}

function readTsConfigAliases(projectRoot: string): Record<string, string> {
  const configPath = findProjectConfig(projectRoot);
  if (!configPath) return {};

  try {
    const { paths, baseUrl } = readCompilerOptions(configPath);
    if (!paths) return {};

    const configDir = dirname(configPath);
    const resolvedBaseUrl = baseUrl ? resolve(configDir, baseUrl) : configDir;

    return convertPathsToAliases(paths, resolvedBaseUrl);
  } catch {
    return {};
  }
}

function findProjectConfig(projectRoot: string): string | null {
  const tsconfig = join(projectRoot, "tsconfig.json");
  if (existsSync(tsconfig)) return tsconfig;

  const jsconfig = join(projectRoot, "jsconfig.json");
  if (existsSync(jsconfig)) return jsconfig;

  return null;
}

function readCompilerOptions(configPath: string): TsConfigCompilerOptions {
  try {
    const content = JSON.parse(readFileSync(configPath, "utf-8"));
    let paths = content.compilerOptions?.paths ?? null;
    let baseUrl = content.compilerOptions?.baseUrl;

    // Handle extends (one level deep)
    if (content.extends) {
      const parentPath = resolve(dirname(configPath), content.extends);
      const parentConfigFile = parentPath.endsWith(".json") ? parentPath : parentPath + ".json";

      if (existsSync(parentConfigFile)) {
        try {
          const parentContent = JSON.parse(readFileSync(parentConfigFile, "utf-8"));
          const parentPaths = parentContent.compilerOptions?.paths;
          const parentBaseUrl = parentContent.compilerOptions?.baseUrl;

          if (!paths && parentPaths) {
            paths = parentPaths;
          }
          if (!baseUrl && parentBaseUrl) {
            baseUrl = parentBaseUrl;
          }
        } catch {
          // Ignore parent parse errors
        }
      }
    }

    return { paths, baseUrl };
  } catch {
    return {};
  }
}

function convertPathsToAliases(
  paths: Record<string, string[]>,
  resolvedBaseUrl: string,
): Record<string, string> {
  const aliases: Record<string, string> = {};

  for (const [pattern, targets] of Object.entries(paths)) {
    if (targets.length === 0) continue;

    const prefix = pattern.replace(/\/?\*$/, "");
    const target = targets[0]!.replace(/\/?\*$/, "");
    const resolvedTarget = resolve(resolvedBaseUrl, target);

    aliases[prefix] = resolvedTarget;
  }

  return aliases;
}
