import { describe, it, expect, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const cliPath = resolve(import.meta.dirname!, "../src/cli.ts");
const fixturesDir = resolve(import.meta.dirname!, "fixtures");
const projectDir = resolve(fixturesDir, "project");

function tryRun(args: string, cwd?: string) {
  try {
    const stdout = execSync(`npx tsx ${cliPath} ${args}`, {
      encoding: "utf-8",
      cwd: cwd ?? import.meta.dirname!,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 15_000,
    });
    return { stdout, stderr: "", status: 0 };
  } catch (err: unknown) {
    const e = err as { stdout: string; stderr: string; status: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", status: e.status ?? 1 };
  }
}

const tmpDir = resolve(import.meta.dirname!, ".tmp-test-output");

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe("CLI Phase 3", { timeout: 30_000 }, () => {
  it("documents all .vue files from a folder input", () => {
    mkdirSync(tmpDir, { recursive: true });
    const { stdout } = tryRun(`${resolve(projectDir, "src/components")} --out ${tmpDir}`);
    // Broken.vue causes an error -> exit 1, but other files still get documented
    expect(stdout).toContain("documented");
    expect(stdout).toContain("skipped");
    expect(existsSync(join(tmpDir, "Button.md"))).toBe(true);
    expect(existsSync(join(tmpDir, "Dialog.md"))).toBe(true);
    expect(existsSync(join(tmpDir, "InternalWidget.md"))).toBe(false);
  });

  it("writes to specified --out directory", () => {
    mkdirSync(tmpDir, { recursive: true });
    const { status } = tryRun(
      `${resolve(projectDir, "src/components/Button.vue")} --out ${tmpDir}`,
    );
    expect(status).toBe(0);
    expect(existsSync(join(tmpDir, "Button.md"))).toBe(true);
  });

  it("respects --ignore patterns", () => {
    mkdirSync(tmpDir, { recursive: true });
    tryRun(
      `${resolve(projectDir, "src/components")} --out ${tmpDir} --ignore "**/Dialog*,**/Broken*"`,
    );
    expect(existsSync(join(tmpDir, "Button.md"))).toBe(true);
    expect(existsSync(join(tmpDir, "Dialog.md"))).toBe(false);
  });

  it("creates single components.md with --join", () => {
    mkdirSync(tmpDir, { recursive: true });
    const { status } = tryRun(
      `${resolve(projectDir, "src/components")} --out ${tmpDir} --join --ignore "**/Broken*"`,
    );
    expect(status).toBe(0);
    expect(existsSync(join(tmpDir, "components.md"))).toBe(true);
    const content = readFileSync(join(tmpDir, "components.md"), "utf-8");
    expect(content).toContain("# Component Documentation");
    expect(content).toContain("Table of Contents");
    expect(content).toContain("Button");
    expect(content).toContain("Dialog");
  });

  it("creates .json files with --format json", () => {
    mkdirSync(tmpDir, { recursive: true });
    const { status } = tryRun(
      `${resolve(projectDir, "src/components/Button.vue")} --out ${tmpDir} --format json`,
    );
    expect(status).toBe(0);
    expect(existsSync(join(tmpDir, "Button.json"))).toBe(true);
    const data = JSON.parse(readFileSync(join(tmpDir, "Button.json"), "utf-8"));
    expect(data.name).toBe("Button");
    expect(data.props).toBeDefined();
  });

  it("creates wrapped components.json with --format json --join", () => {
    mkdirSync(tmpDir, { recursive: true });
    const { status } = tryRun(
      `${resolve(projectDir, "src/components")} --out ${tmpDir} --format json --join --ignore "**/Broken*"`,
    );
    expect(status).toBe(0);
    expect(existsSync(join(tmpDir, "components.json"))).toBe(true);
    const data = JSON.parse(readFileSync(join(tmpDir, "components.json"), "utf-8"));
    expect(data.generated).toBeDefined();
    expect(data.components).toBeInstanceOf(Array);
    expect(data.components.length).toBeGreaterThanOrEqual(2);
  });

  it("suppresses output with --silent", () => {
    mkdirSync(tmpDir, { recursive: true });
    const { stdout } = tryRun(
      `${resolve(projectDir, "src/components/Button.vue")} --out ${tmpDir} --silent`,
    );
    expect(stdout.trim()).toBe("");
  });

  it("shows correct summary line", () => {
    mkdirSync(tmpDir, { recursive: true });
    const { stdout } = tryRun(`${resolve(projectDir, "src/components")} --out ${tmpDir}`);
    expect(stdout).toMatch(/\d+ components documented, \d+ skipped, \d+ errors/);
  });

  it("continues processing when one file is broken", () => {
    mkdirSync(tmpDir, { recursive: true });
    const { stdout } = tryRun(`${resolve(projectDir, "src/components")} --out ${tmpDir}`);
    expect(stdout).toContain("documented");
    expect(existsSync(join(tmpDir, "Button.md"))).toBe(true);
  });

  it("traverses monorepo structure", () => {
    mkdirSync(tmpDir, { recursive: true });
    const { status } = tryRun(`${resolve(projectDir, "packages")} --out ${tmpDir}`);
    expect(status).toBe(0);
    expect(existsSync(join(tmpDir, "ComponentA.md"))).toBe(true);
    expect(existsSync(join(tmpDir, "ComponentB.md"))).toBe(true);
  });

  it("maintains backward compat with single file input", () => {
    mkdirSync(tmpDir, { recursive: true });
    const { status } = tryRun(`${resolve(fixturesDir, "BasicProps.vue")} --out ${tmpDir}`);
    expect(status).toBe(0);
    expect(existsSync(join(tmpDir, "BasicProps.md"))).toBe(true);
  });

  it("exits 1 with message when no files found", () => {
    const { stderr, status } = tryRun("nonexistent-dir-xyz-123");
    expect(status).not.toBe(0);
    expect(stderr).toContain("No .vue files found");
  });

  it("handles duplicate component names with suffix", () => {
    // Create temp structure with two components of same name in different dirs
    const dupDir = join(tmpDir, "dup");
    const dirA = join(dupDir, "a");
    const dirB = join(dupDir, "b");
    mkdirSync(dirA, { recursive: true });
    mkdirSync(dirB, { recursive: true });

    const vueContent = `<template><div /></template>
<script setup lang="ts">
defineProps<{ label: string }>();
</script>`;

    writeFileSync(join(dirA, "Widget.vue"), vueContent, "utf-8");
    writeFileSync(join(dirB, "Widget.vue"), vueContent, "utf-8");

    const outDir = join(tmpDir, "out");
    mkdirSync(outDir, { recursive: true });

    const { status } = tryRun(`${dirA} ${dirB} --out ${outDir}`);
    expect(status).toBe(0);
    expect(existsSync(join(outDir, "Widget.md"))).toBe(true);
    expect(existsSync(join(outDir, "Widget-2.md"))).toBe(true);
  });
});
