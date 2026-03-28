import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadCompmarkConfig, mergeWithCLIFlags, resolveAliases } from "../src/config.ts";
import type { CompmarkConfig } from "../src/types.ts";
import { DEFAULT_SECTION_ORDER } from "../src/types.ts";

const tempDirs: string[] = [];

function makeTmpDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "compmark-config-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe("mergeWithCLIFlags", () => {
  it("overrides config values with CLI flags", () => {
    const config: CompmarkConfig = {
      outDir: "./docs",
      format: "md",
      join: false,
      silent: false,
    };

    const result = mergeWithCLIFlags(config, {
      out: "./api",
      format: "json",
      join: true,
    });

    expect(result.outDir).toBe("./api");
    expect(result.format).toBe("json");
    expect(result.join).toBe(true);
    expect(result.silent).toBe(false); // not overridden
  });

  it("does not override when CLI values are undefined", () => {
    const config: CompmarkConfig = {
      outDir: "./docs",
      format: "json",
      join: true,
    };

    const result = mergeWithCLIFlags(config, {
      out: undefined,
      format: undefined,
    });

    expect(result.outDir).toBe("./docs");
    expect(result.format).toBe("json");
    expect(result.join).toBe(true);
  });

  it("converts ignore string to exclude array", () => {
    const config: CompmarkConfig = {};

    const result = mergeWithCLIFlags(config, {
      ignore: "*.test.vue, internal/**",
    });

    expect(result.exclude).toEqual(["*.test.vue", "internal/**"]);
  });

  it("handles preserve-structure flag", () => {
    const config: CompmarkConfig = {};

    const result = mergeWithCLIFlags(config, {
      "preserve-structure": true,
    });

    expect(result.preserveStructure).toBe(true);
  });

  it("returns config unchanged with empty args", () => {
    const config: CompmarkConfig = {
      outDir: "./docs",
      format: "json",
      join: true,
      sectionOrder: ["props", "emits"],
    };

    const result = mergeWithCLIFlags(config, {});

    expect(result.outDir).toBe("./docs");
    expect(result.format).toBe("json");
    expect(result.join).toBe(true);
    expect(result.sectionOrder).toEqual(["props", "emits"]);
  });

  it("preserves sectionOrder from config", () => {
    const config: CompmarkConfig = {
      sectionOrder: ["emits", "props", "slots"],
    };

    const result = mergeWithCLIFlags(config, { out: "./api" });

    expect(result.sectionOrder).toEqual(["emits", "props", "slots"]);
    expect(result.outDir).toBe("./api");
  });

  it("--ignore replaces config exclude instead of merging", () => {
    const config: CompmarkConfig = {
      exclude: ["internal/**"],
    };

    const result = mergeWithCLIFlags(config, {
      ignore: "*.test.vue",
    });

    // CLI --ignore should replace config exclude, not merge with it
    expect(result.exclude).toEqual(["*.test.vue"]);
  });

  it("CLI sectionOrder replaces config sectionOrder instead of merging", () => {
    const config: CompmarkConfig = {
      sectionOrder: ["props", "emits", "slots"],
    };

    const result = mergeWithCLIFlags(config, {
      sectionOrder: ["props"],
    });

    // CLI sectionOrder should replace, not merge
    expect(result.sectionOrder).toEqual(["props"]);
  });
});

describe("resolveAliases", () => {
  it("returns only config aliases when no tsconfig exists", () => {
    const tmpDir = makeTmpDir();
    const config: CompmarkConfig = {
      aliases: { "@": "./src", "~": "./lib" },
    };

    const result = resolveAliases(config, tmpDir);

    expect(result["@"]).toBe("./src");
    expect(result["~"]).toBe("./lib");
  });

  it("reads tsconfig paths", () => {
    const tmpDir = makeTmpDir();
    writeFileSync(
      join(tmpDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["./src/*"],
            "~/*": ["./lib/*"],
          },
        },
      }),
    );

    const config: CompmarkConfig = {};
    const result = resolveAliases(config, tmpDir);

    expect(result["@"]).toContain("src");
    expect(result["~"]).toContain("lib");
  });

  it("config aliases take precedence over tsconfig", () => {
    const tmpDir = makeTmpDir();
    writeFileSync(
      join(tmpDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["./src/*"],
          },
        },
      }),
    );

    const config: CompmarkConfig = {
      aliases: { "@": "./custom" },
    };

    const result = resolveAliases(config, tmpDir);

    expect(result["@"]).toBe("./custom");
  });

  it("returns empty when no config aliases and no tsconfig", () => {
    const tmpDir = makeTmpDir();
    const config: CompmarkConfig = {};

    const result = resolveAliases(config, tmpDir);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it("reads jsconfig.json as fallback", () => {
    const tmpDir = makeTmpDir();
    writeFileSync(
      join(tmpDir, "jsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["./src/*"],
          },
        },
      }),
    );

    const config: CompmarkConfig = {};
    const result = resolveAliases(config, tmpDir);

    expect(result["@"]).toContain("src");
  });
});

describe("loadCompmarkConfig", () => {
  it("preserves user sectionOrder from config file without appending defaults", async () => {
    const tmpDir = makeTmpDir();
    writeFileSync(
      join(tmpDir, "compmark.config.json"),
      JSON.stringify({ sectionOrder: ["props", "emits"] }),
    );

    const result = await loadCompmarkConfig(join(tmpDir, "compmark.config.json"));

    // Must be exactly what the user wrote — not concatenated with DEFAULT_SECTION_ORDER
    expect(result.sectionOrder).toEqual(["props", "emits"]);
  });

  it("falls back to DEFAULT_SECTION_ORDER when sectionOrder is not in config", async () => {
    const tmpDir = makeTmpDir();
    writeFileSync(
      join(tmpDir, "compmark.config.json"),
      JSON.stringify({ outDir: "./docs" }),
    );

    const result = await loadCompmarkConfig(join(tmpDir, "compmark.config.json"));

    expect(result.sectionOrder).toEqual(DEFAULT_SECTION_ORDER);
  });
});
