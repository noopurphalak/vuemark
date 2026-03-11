import { describe, it, expect } from "vitest";
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
    expect(md).toContain("**Deprecated**: Use text instead");
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
    expect(md).toContain("**Deprecated**");
    expect(md).not.toContain("**Deprecated**:");
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

  it("renders composables list", () => {
    const doc: ComponentDoc = {
      name: "Page",
      props: [],
      emits: [],
      composables: [{ name: "useRouter" }, { name: "useMouse" }],
    };

    const md = generateMarkdown(doc);
    expect(md).toContain("## Composables Used");
    expect(md).toContain("- `useRouter`");
    expect(md).toContain("- `useMouse`");
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
});
