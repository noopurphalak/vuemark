import { describe, it, expect, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, unlinkSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const cliPath = resolve(import.meta.dirname!, "../src/cli.ts");
const fixturesDir = resolve(import.meta.dirname!, "fixtures");

function run(args: string, cwd?: string) {
  return execSync(`npx tsx ${cliPath} ${args}`, {
    encoding: "utf-8",
    cwd: cwd ?? import.meta.dirname!,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function tryRun(args: string, cwd?: string) {
  try {
    const stdout = run(args, cwd);
    return { stdout, stderr: "", status: 0 };
  } catch (err: unknown) {
    const e = err as { stdout: string; stderr: string; status: number };
    return { stdout: e.stdout, stderr: e.stderr, status: e.status };
  }
}

const cleanupFiles: string[] = [];

afterEach(() => {
  for (const f of cleanupFiles) {
    if (existsSync(f)) unlinkSync(f);
  }
  cleanupFiles.length = 0;
});

describe("CLI", () => {
  it("produces correct .md file from a fixture", () => {
    const outDir = import.meta.dirname!;
    const outFile = join(outDir, "BasicProps.md");
    cleanupFiles.push(outFile);

    const { stdout } = tryRun(`${join(fixturesDir, "BasicProps.vue")}`, outDir);
    expect(stdout).toContain("Created BasicProps.md");
    expect(existsSync(outFile)).toBe(true);

    const content = readFileSync(outFile, "utf-8");
    expect(content).toContain("# BasicProps");
    expect(content).toContain("## Props");
    expect(content).toContain("| label |");
  });

  it("exits 1 with usage on missing argument", () => {
    const { stderr, status } = tryRun("");
    expect(status).not.toBe(0);
    expect(stderr).toContain("Usage: compmark-vue <path-to-component.vue>");
  });

  it("exits 1 on non-.vue file", () => {
    const { stderr, status } = tryRun("foo.txt");
    expect(status).not.toBe(0);
    expect(stderr).toContain("Expected a .vue file");
  });

  it("exits 1 on nonexistent file", () => {
    const { stderr, status } = tryRun("nonexistent.vue");
    expect(status).not.toBe(0);
    expect(stderr).toContain("File not found");
  });

  it("names output file after component", () => {
    const outDir = import.meta.dirname!;
    const outFile = join(outDir, "FullComponent.md");
    cleanupFiles.push(outFile);

    tryRun(`${join(fixturesDir, "FullComponent.vue")}`, outDir);
    expect(existsSync(outFile)).toBe(true);

    const content = readFileSync(outFile, "utf-8");
    expect(content).toContain("# FullComponent");
  });
});
