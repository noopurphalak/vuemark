import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { resolveImportedPropsType } from "../src/type-resolver.ts";

const fixturesDir = resolve(import.meta.dirname!, "fixtures");

describe("resolveImportedPropsType", () => {
  it("resolves a simple exported interface", () => {
    const importMap = new Map([["ButtonProps", "./types/ButtonProps"]]);
    const result = resolveImportedPropsType("ButtonProps", importMap, fixturesDir);
    expect(result).not.toBeNull();
    expect(result!.members.length).toBeGreaterThanOrEqual(2);
    const names = result!.members
      .filter((m: any) => m.type === "TSPropertySignature")
      .map((m: any) => m.key.name);
    expect(names).toContain("label");
    expect(names).toContain("disabled");
  });

  it("resolves an exported type alias", () => {
    const importMap = new Map([["InputProps", "./types/TypeAlias"]]);
    const result = resolveImportedPropsType("InputProps", importMap, fixturesDir);
    expect(result).not.toBeNull();
    const names = result!.members
      .filter((m: any) => m.type === "TSPropertySignature")
      .map((m: any) => m.key.name);
    expect(names).toContain("value");
    expect(names).toContain("placeholder");
  });

  it("resolves interface with extends", () => {
    const importMap = new Map([["ExtendedProps", "./types/ExtendedProps"]]);
    const result = resolveImportedPropsType("ExtendedProps", importMap, fixturesDir);
    expect(result).not.toBeNull();
    const names = result!.members
      .filter((m: any) => m.type === "TSPropertySignature")
      .map((m: any) => m.key.name);
    expect(names).toContain("id"); // from BaseProps
    expect(names).toContain("label"); // from ExtendedProps
    expect(names).toContain("count"); // from ExtendedProps
  });

  it("returns null for unresolvable import", () => {
    const importMap = new Map([["UnknownType", "some-package"]]);
    const result = resolveImportedPropsType("UnknownType", importMap, fixturesDir);
    expect(result).toBeNull();
  });

  it("returns null for missing file", () => {
    const importMap = new Map([["MissingType", "./nonexistent"]]);
    const result = resolveImportedPropsType("MissingType", importMap, fixturesDir);
    expect(result).toBeNull();
  });
});
