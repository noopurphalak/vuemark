import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeJoinedMarkdown } from "../src/output.ts";
import type { ComponentDoc } from "../src/types.ts";

const tempDirs: string[] = [];

function makeTmpDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "compmark-output-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

function makeDoc(name: string, category?: string): ComponentDoc {
  return {
    name,
    category,
    props: [{ name: "x", type: "string", required: false, default: undefined, description: "" }],
    emits: [],
  };
}

describe("writeJoinedMarkdown", () => {
  it("groups components by category", () => {
    const tmpDir = makeTmpDir();
    const results = [
      { path: "/a/TextInput.vue", doc: makeDoc("TextInput", "Forms") },
      { path: "/a/SelectBox.vue", doc: makeDoc("SelectBox", "Forms") },
      { path: "/a/Sidebar.vue", doc: makeDoc("Sidebar", "Layout") },
    ];

    writeJoinedMarkdown(results, tmpDir, true);

    const content = readFileSync(join(tmpDir, "components.md"), "utf-8");
    expect(content).toContain("## Forms");
    expect(content).toContain("## Layout");
    // Components should be under their category heading
    const formsIdx = content.indexOf("## Forms");
    const layoutIdx = content.indexOf("## Layout");
    expect(formsIdx).toBeLessThan(layoutIdx);
  });

  it("renders flat TOC when no categories", () => {
    const tmpDir = makeTmpDir();
    const results = [
      { path: "/a/Button.vue", doc: makeDoc("Button") },
      { path: "/a/Card.vue", doc: makeDoc("Card") },
    ];

    writeJoinedMarkdown(results, tmpDir, true);

    const content = readFileSync(join(tmpDir, "components.md"), "utf-8");
    expect(content).toContain("## Table of Contents");
    expect(content).toContain("- [Button]");
    expect(content).toContain("- [Card]");
    // Should NOT have category grouping headings
    expect(content).not.toMatch(/^## Forms/m);
    expect(content).not.toMatch(/^## Layout/m);
  });

  it("uncategorized components appear first", () => {
    const tmpDir = makeTmpDir();
    const results = [
      { path: "/a/Button.vue", doc: makeDoc("Button", "Forms") },
      { path: "/a/AppLoader.vue", doc: makeDoc("AppLoader") },
    ];

    writeJoinedMarkdown(results, tmpDir, true);

    const content = readFileSync(join(tmpDir, "components.md"), "utf-8");
    // AppLoader (uncategorized) should appear before the Forms category section
    const appLoaderIdx = content.indexOf("AppLoader");
    const formsIdx = content.indexOf("## Forms");
    expect(appLoaderIdx).toBeLessThan(formsIdx);
  });

  it("TOC reflects category grouping", () => {
    const tmpDir = makeTmpDir();
    const results = [
      { path: "/a/TextInput.vue", doc: makeDoc("TextInput", "Forms") },
      { path: "/a/Sidebar.vue", doc: makeDoc("Sidebar", "Layout") },
    ];

    writeJoinedMarkdown(results, tmpDir, true);

    const content = readFileSync(join(tmpDir, "components.md"), "utf-8");
    // TOC should have category sub-headings
    expect(content).toContain("### Forms");
    expect(content).toContain("### Layout");
  });

  it("uncategorized components are grouped under '## Uncategorized' when categories exist", () => {
    const tmpDir = makeTmpDir();
    const results = [
      { path: "/a/AppLoader.vue", doc: makeDoc("AppLoader") },
      { path: "/a/TextInput.vue", doc: makeDoc("TextInput", "Forms") },
    ];

    writeJoinedMarkdown(results, tmpDir, true);

    const content = readFileSync(join(tmpDir, "components.md"), "utf-8");
    // Uncategorized section heading at ## level
    expect(content).toMatch(/^## Uncategorized$/m);
    // Uncategorized component heading nested under it at ### level
    expect(content).toMatch(/^### AppLoader/m);
    // Category heading at same ## level
    expect(content).toMatch(/^## Forms$/m);
    // Categorized component nested at ### level
    expect(content).toMatch(/^### TextInput/m);
    // Uncategorized comes before Forms in the document
    expect(content.indexOf("## Uncategorized")).toBeLessThan(content.indexOf("## Forms"));
  });

  it("TOC anchor for deprecated component resolves to document anchor", () => {
    const tmpDir = makeTmpDir();
    const doc: ComponentDoc = {
      name: "OldButton",
      deprecated: "Use NewButton instead",
      props: [{ name: "x", type: "string", required: false, default: undefined, description: "" }],
      emits: [],
    };

    writeJoinedMarkdown([{ path: "/a/OldButton.vue", doc }], tmpDir, true);

    const content = readFileSync(join(tmpDir, "components.md"), "utf-8");
    // TOC link uses anchor derived from component name only
    expect(content).toContain("[OldButton](#oldbutton)");
    // Document must have an explicit matching anchor so the link resolves
    expect(content).toContain('<a id="oldbutton">');
  });

  it("sorts components alphabetically within categories", () => {
    const tmpDir = makeTmpDir();
    const results = [
      { path: "/a/Zebra.vue", doc: makeDoc("Zebra", "Animals") },
      { path: "/a/Alpha.vue", doc: makeDoc("Alpha", "Animals") },
    ];

    writeJoinedMarkdown(results, tmpDir, true);

    const content = readFileSync(join(tmpDir, "components.md"), "utf-8");
    const alphaIdx = content.indexOf("Alpha");
    const zebraIdx = content.indexOf("Zebra");
    expect(alphaIdx).toBeLessThan(zebraIdx);
  });
});
