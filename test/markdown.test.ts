import { describe, it, expect, vi } from "vitest";
import { generateMarkdown } from "../src/markdown.ts";
import type { ComponentDoc } from "../src/types.ts";

describe("generateMarkdown", () => {
  it("generates correct props table", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [
        {
          name: "label",
          type: "String",
          required: true,
          default: undefined,
          description: "The label text",
        },
        {
          name: "disabled",
          type: "Boolean",
          required: false,
          default: "false",
          description: "",
        },
      ],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("# Button");
    expect(md).toContain("## Props");
    expect(md).toContain("| label | String | Yes | - | The label text |");
    expect(md).toContain("| disabled | Boolean | No | `false` | - |");
  });

  it("generates correct emits table", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [],
      emits: [
        { name: "click", description: "Emitted when clicked" },
        { name: "update", description: "" },
      ],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("## Emits");
    expect(md).toContain("| click | Emitted when clicked |");
    expect(md).toContain("| update | - |");
  });

  it("omits props section when no props", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [],
      emits: [{ name: "click", description: "" }],
    };

    const md = generateMarkdown(doc);
    expect(md).not.toContain("## Props");
    expect(md).toContain("## Emits");
  });

  it("omits emits section when no emits", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [
        {
          name: "label",
          type: "String",
          required: true,
          default: undefined,
          description: "",
        },
      ],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("## Props");
    expect(md).not.toContain("## Emits");
  });

  it("shows no documentable message when all sections empty", () => {
    const doc: ComponentDoc = {
      name: "Empty",
      props: [],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("No documentable API found.");
    expect(md).not.toContain("## Props");
    expect(md).not.toContain("## Emits");
  });

  it("wraps defaults in backtick code spans", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [
        {
          name: "size",
          type: "String",
          required: false,
          default: '"medium"',
          description: "",
        },
      ],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain('`"medium"`');
  });

  // --- Phase 2 markdown tests ---

  it("renders component description", () => {
    const doc: ComponentDoc = {
      name: "Dialog",
      description: "A reusable dialog component",
      props: [
        { name: "open", type: "boolean", required: true, default: undefined, description: "" },
      ],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("# Dialog");
    expect(md).toContain("A reusable dialog component");
  });

  it("renders deprecated prop annotation", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [
        {
          name: "label",
          type: "String",
          required: true,
          default: undefined,
          description: "The label",
          deprecated: "Use text instead",
        },
      ],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("**⚠️ Deprecated**: Use text instead");
  });

  it("renders deprecated prop without reason", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [
        {
          name: "color",
          type: "string",
          required: false,
          default: undefined,
          description: "The color",
          deprecated: true,
        },
      ],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("**⚠️ Deprecated**");
    expect(md).not.toContain("**⚠️ Deprecated**:");
  });

  it("renders @since annotation", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [
        {
          name: "size",
          type: "number",
          required: false,
          default: undefined,
          description: "The size",
          since: "2.0.0",
        },
      ],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("*(since 2.0.0)*");
  });

  it("renders @example as fenced code block", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [
        {
          name: "label",
          type: "string",
          required: true,
          default: undefined,
          description: "The label",
          example: '"Hello World"',
        },
      ],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("**`label` example:**");
    expect(md).toContain("```");
    expect(md).toContain('"Hello World"');
  });

  it("renders emits table with payload column when payloads exist", () => {
    const doc: ComponentDoc = {
      name: "Form",
      props: [],
      emits: [
        { name: "submit", description: "On submit", payload: "data: FormData" },
        { name: "cancel", description: "On cancel" },
      ],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("| Name | Payload | Description |");
    expect(md).toContain("| submit | data: FormData | On submit |");
    expect(md).toContain("| cancel | - | On cancel |");
  });

  it("renders slots table", () => {
    const doc: ComponentDoc = {
      name: "Layout",
      props: [],
      emits: [],
      slots: [
        { name: "default", description: "Main content", bindings: [] },
        {
          name: "header",
          description: "Header area",
          bindings: ["title: string", "count: number"],
        },
      ],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("## Slots");
    expect(md).toContain("| default | - | Main content |");
    expect(md).toContain("| header | title: string, count: number | Header area |");
  });

  it("renders exposed table", () => {
    const doc: ComponentDoc = {
      name: "Input",
      props: [],
      emits: [],
      exposes: [
        { name: "focus", type: "unknown", description: "Focus the input" },
        { name: "reset", type: "unknown", description: "" },
      ],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("## Exposed");
    expect(md).toContain("| focus | unknown | Focus the input |");
    expect(md).toContain("| reset | unknown | - |");
  });

  it("renders composable with simple returns (1-3 vars, no types)", () => {
    const doc: ComponentDoc = {
      name: "Page",
      props: [],
      emits: [],
      composables: [
        { name: "useRouter", variables: [{ name: "router" }] },
        { name: "useMouse", variables: [{ name: "x" }, { name: "y" }] },
      ],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("## Composables Used");
    expect(md).toContain("### `useRouter`");
    expect(md).toContain("**Returns:** `router`");
    expect(md).toContain("### `useMouse`");
    expect(md).toContain("**Returns:** `x`, `y`");
  });

  it("renders composable bare call (no variables)", () => {
    const doc: ComponentDoc = {
      name: "Page",
      props: [],
      emits: [],
      composables: [{ name: "useHead", variables: [] }],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("### `useHead`");
    expect(md).toContain("Called for side effects.");
  });

  it("renders composable with typed variables as table", () => {
    const doc: ComponentDoc = {
      name: "Page",
      props: [],
      emits: [],
      composables: [
        {
          name: "useData",
          source: "./composables/useData",
          variables: [
            { name: "count", type: "Ref<number>" },
            { name: "total", type: "ComputedRef" },
            { name: "fetchData", type: "(id) => Promise<void>" },
          ],
        },
      ],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("### `useData`");
    expect(md).toContain("*Source: `./composables/useData`*");
    expect(md).toContain("| Variable | Type |");
    expect(md).toContain("| count | Ref&lt;number&gt; |");
    expect(md).toContain("| total | ComputedRef |");
    expect(md).toContain("| fetchData | (id) =&gt; Promise&lt;void&gt; |");
  });

  it("renders composable table for 4+ untyped variables", () => {
    const doc: ComponentDoc = {
      name: "Page",
      props: [],
      emits: [],
      composables: [
        {
          name: "useForm",
          variables: [{ name: "a" }, { name: "b" }, { name: "c" }, { name: "d" }],
        },
      ],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("| Variable | Type |");
    expect(md).toContain("| a | - |");
    expect(md).toContain("| d | - |");
  });

  it("does not show source for node_modules imports", () => {
    const doc: ComponentDoc = {
      name: "Page",
      props: [],
      emits: [],
      composables: [
        { name: "useRouter", source: "vue-router", variables: [{ name: "router" }] },
        { name: "useMouse", source: "@vueuse/core", variables: [{ name: "x" }, { name: "y" }] },
      ],
    };

    const md = generateMarkdown(doc);
    expect(md).not.toContain("*Source:");
  });

  it("shows source for @/ alias imports", () => {
    const doc: ComponentDoc = {
      name: "Page",
      props: [],
      emits: [],
      composables: [
        {
          name: "useAuth",
          source: "@/composables/useAuth",
          variables: [{ name: "user", type: "Ref<User>" }],
        },
      ],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("*Source: `@/composables/useAuth`*");
  });

  it("escapes pipe characters in union types", () => {
    const doc: ComponentDoc = {
      name: "Progress",
      props: [
        {
          name: "state",
          type: "'PENDING' | 'PROGRESS' | 'SUCCESS' | 'FAILURE'",
          required: false,
          default: '"PENDING"',
          description: "-",
        },
      ],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain(
      "| state | 'PENDING' \\| 'PROGRESS' \\| 'SUCCESS' \\| 'FAILURE' | No | `\"PENDING\"` | - |",
    );
  });

  it("renders @see annotation", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [
        {
          name: "label",
          type: "string",
          required: true,
          default: undefined,
          description: "The label",
          see: "https://example.com",
        },
      ],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("See: https://example.com");
  });

  // --- v0.4.0: Refs and Computed markdown ---

  it("renders Refs table with Name/Type/Description", () => {
    const doc: ComponentDoc = {
      name: "Counter",
      props: [],
      emits: [],
      refs: [
        { name: "count", type: "Ref<number>", description: "The counter value" },
        { name: "name", type: "Ref<string>", description: "" },
      ],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("## Refs");
    expect(md).toContain("| Name | Type | Description |");
    expect(md).toContain("| count | Ref&lt;number&gt; | The counter value |");
    expect(md).toContain("| name | Ref&lt;string&gt; | - |");
  });

  it("renders Computed table", () => {
    const doc: ComponentDoc = {
      name: "UserCard",
      props: [],
      emits: [],
      computeds: [
        { name: "fullName", type: "ComputedRef<string>", description: "The full display name" },
      ],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("## Computed");
    expect(md).toContain("| fullName | ComputedRef&lt;string&gt; | The full display name |");
  });

  it("HTML escapes type generics in refs and computed", () => {
    const doc: ComponentDoc = {
      name: "Test",
      props: [],
      emits: [],
      refs: [{ name: "items", type: "Ref<Array<string>>", description: "-" }],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("Ref&lt;Array&lt;string&gt;&gt;");
  });

  it("renders @deprecated/@since annotations on refs", () => {
    const doc: ComponentDoc = {
      name: "Test",
      props: [],
      emits: [],
      refs: [
        {
          name: "data",
          type: "Ref",
          description: "Old data",
          deprecated: "Use newData",
          since: "1.0.0",
        },
      ],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("**⚠️ Deprecated**: Use newData");
    expect(md).toContain("*(since 1.0.0)*");
  });

  it("omits Refs and Computed sections when empty", () => {
    const doc: ComponentDoc = {
      name: "Simple",
      props: [{ name: "x", type: "string", required: true, default: undefined, description: "" }],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).not.toContain("## Refs");
    expect(md).not.toContain("## Computed");
  });

  it("renders sections in order: Refs → Computed → Props", () => {
    const doc: ComponentDoc = {
      name: "Full",
      props: [{ name: "x", type: "string", required: true, default: undefined, description: "" }],
      emits: [],
      refs: [{ name: "count", type: "Ref<number>", description: "" }],
      computeds: [{ name: "total", type: "ComputedRef", description: "" }],
    };

    const md = generateMarkdown(doc);
    const refsIdx = md.indexOf("## Refs");
    const computedIdx = md.indexOf("## Computed");
    const propsIdx = md.indexOf("## Props");
    expect(refsIdx).toBeLessThan(computedIdx);
    expect(computedIdx).toBeLessThan(propsIdx);
  });

  it("shows no documentable API when only refs/computed exist is false", () => {
    const doc: ComponentDoc = {
      name: "StateOnly",
      props: [],
      emits: [],
      refs: [{ name: "count", type: "Ref<number>", description: "" }],
    };

    const md = generateMarkdown(doc);
    expect(md).not.toContain("No documentable API found.");
    expect(md).toContain("## Refs");
  });

  // --- Phase 5: Deprecation badges, version, section ordering ---

  it("renders component-level deprecation badge without reason", () => {
    const doc: ComponentDoc = {
      name: "OldButton",
      deprecated: true,
      props: [{ name: "x", type: "string", required: false, default: undefined, description: "" }],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("# OldButton ⚠️ Deprecated");
    expect(md).toContain("> **⚠️ Deprecated**");
  });

  it("renders component-level deprecation badge with reason", () => {
    const doc: ComponentDoc = {
      name: "OldButton",
      deprecated: "Use NewButton instead",
      props: [{ name: "x", type: "string", required: false, default: undefined, description: "" }],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("# OldButton ⚠️ Deprecated");
    expect(md).toContain("> **⚠️ Deprecated**: Use NewButton instead");
  });

  it("renders version badge", () => {
    const doc: ComponentDoc = {
      name: "Button",
      version: "2.1.0",
      props: [{ name: "x", type: "string", required: false, default: undefined, description: "" }],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("**Version:** 2.1.0");
  });

  it("renders only specified sections via sectionOrder", () => {
    const doc: ComponentDoc = {
      name: "Test",
      props: [{ name: "x", type: "string", required: false, default: undefined, description: "" }],
      emits: [{ name: "click", description: "" }],
      refs: [{ name: "count", type: "Ref<number>", description: "" }],
    };

    const md = generateMarkdown(doc, { sectionOrder: ["props", "emits"] });
    expect(md).toContain("## Props");
    expect(md).toContain("## Emits");
    expect(md).not.toContain("## Refs");
  });

  it("respects custom section ordering", () => {
    const doc: ComponentDoc = {
      name: "Test",
      props: [{ name: "x", type: "string", required: false, default: undefined, description: "" }],
      emits: [{ name: "click", description: "" }],
    };

    const md = generateMarkdown(doc, { sectionOrder: ["emits", "props"] });
    const emitsIdx = md.indexOf("## Emits");
    const propsIdx = md.indexOf("## Props");
    expect(emitsIdx).toBeLessThan(propsIdx);
  });

  it("default section order has Refs before Props", () => {
    const doc: ComponentDoc = {
      name: "Test",
      props: [{ name: "x", type: "string", required: false, default: undefined, description: "" }],
      emits: [],
      refs: [{ name: "count", type: "Ref<number>", description: "" }],
    };

    const md = generateMarkdown(doc);
    const refsIdx = md.indexOf("## Refs");
    const propsIdx = md.indexOf("## Props");
    expect(refsIdx).toBeLessThan(propsIdx);
  });

  it("renders component with both deprecated and version", () => {
    const doc: ComponentDoc = {
      name: "Legacy",
      deprecated: "Removed in v3",
      version: "1.5.0",
      description: "A legacy component.",
      props: [{ name: "x", type: "string", required: false, default: undefined, description: "" }],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("# Legacy ⚠️ Deprecated");
    expect(md).toContain("> **⚠️ Deprecated**: Removed in v3");
    expect(md).toContain("A legacy component.");
    expect(md).toContain("**Version:** 1.5.0");
  });

  it("shows 'No documentable API found' when sectionOrder excludes all populated sections", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [],
      emits: [{ name: "click", description: "Emitted when clicked" }],
    };

    const md = generateMarkdown(doc, { sectionOrder: ["props"] });
    expect(md).toContain("No documentable API found.");
  });

  it("warns on all-invalid sectionOrder keys and shows 'No documentable API found'", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [
        { name: "label", type: "string", required: true, default: undefined, description: "Label" },
      ],
      emits: [],
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const md = generateMarkdown(doc, { sectionOrder: ["prop" as unknown as "props"] });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"prop"'));
    warnSpy.mockRestore();

    expect(md).toContain("No documentable API found.");
  });

  it("warns on unknown sectionOrder keys and skips them", () => {
    const doc: ComponentDoc = {
      name: "Button",
      props: [
        { name: "label", type: "string", required: true, default: undefined, description: "Label" },
      ],
      emits: [],
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    generateMarkdown(doc, { sectionOrder: ["prop" as unknown as "props", "props"] });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"prop"'));
    warnSpy.mockRestore();
  });

  it("category in component doc does not affect individual markdown output", () => {
    const doc: ComponentDoc = {
      name: "TextInput",
      category: "Forms",
      props: [
        {
          name: "value",
          type: "string",
          required: true,
          default: undefined,
          description: "The input value",
        },
      ],
      emits: [],
    };

    const md = generateMarkdown(doc);
    expect(md).not.toContain("Forms");
    expect(md).toContain("# TextInput");
    expect(md).toContain("## Props");
  });
});
