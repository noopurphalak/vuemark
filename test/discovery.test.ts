import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { discoverFiles } from "../src/discovery.ts";

const fixturesDir = resolve(import.meta.dirname!, "fixtures");
const projectDir = resolve(fixturesDir, "project");

describe("discoverFiles", () => {
  it("discovers a single .vue file", async () => {
    const { files } = await discoverFiles([resolve(fixturesDir, "BasicProps.vue")]);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain("BasicProps.vue");
  });

  it("discovers all .vue files in a directory", async () => {
    const { files } = await discoverFiles([resolve(projectDir, "src/components")]);
    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(files.some((f) => f.endsWith("Button.vue"))).toBe(true);
    expect(files.some((f) => f.endsWith("Dialog.vue"))).toBe(true);
  });

  it("discovers files matching a glob pattern", async () => {
    const { files } = await discoverFiles([resolve(projectDir, "src/components/*.vue")]);
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  it("respects ignore patterns", async () => {
    const all = await discoverFiles([resolve(projectDir, "src/components")]);
    const filtered = await discoverFiles([resolve(projectDir, "src/components")], ["**/Broken*"]);
    expect(filtered.files.length).toBeLessThan(all.files.length);
    expect(filtered.files.some((f) => f.includes("Broken"))).toBe(false);
    expect(filtered.ignoredCount).toBeGreaterThan(0);
  });

  it("deduplicates results", async () => {
    const { files } = await discoverFiles([
      resolve(fixturesDir, "BasicProps.vue"),
      resolve(fixturesDir, "BasicProps.vue"),
    ]);
    expect(files).toHaveLength(1);
  });

  it("handles mixed inputs (file + directory)", async () => {
    const { files } = await discoverFiles([
      resolve(fixturesDir, "BasicProps.vue"),
      resolve(projectDir, "src/components"),
    ]);
    expect(files.some((f) => f.endsWith("BasicProps.vue"))).toBe(true);
    expect(files.some((f) => f.endsWith("Button.vue"))).toBe(true);
  });

  it("returns empty array when no files found", async () => {
    const { files } = await discoverFiles(["nonexistent-dir-xyz-123"]);
    expect(files).toHaveLength(0);
  });

  it("always ignores node_modules", async () => {
    const { files } = await discoverFiles([fixturesDir]);
    expect(files.every((f) => !f.includes("node_modules"))).toBe(true);
  });

  it("returns basePath as directory of single file", async () => {
    const result = await discoverFiles([resolve(fixturesDir, "BasicProps.vue")]);
    expect(result.basePath).toBe(fixturesDir);
  });

  it("returns basePath as common ancestor of multiple files", async () => {
    const result = await discoverFiles([resolve(projectDir, "src/components")]);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.basePath).toBeTruthy();
    // All files should start with basePath
    for (const f of result.files) {
      expect(f.startsWith(result.basePath)).toBe(true);
    }
  });

  it("returns ignoredCount 0 when no ignore patterns", async () => {
    const result = await discoverFiles([resolve(projectDir, "src/components")]);
    expect(result.ignoredCount).toBe(0);
  });

  it("returns basePath as '.' when no files found", async () => {
    const result = await discoverFiles(["nonexistent-dir-xyz-123"]);
    expect(result.basePath).toBe(".");
  });
});
