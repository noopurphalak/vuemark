import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseSFC } from "../src/parser.ts";

function loadFixture(name: string) {
  const path = resolve(import.meta.dirname!, "fixtures", name);
  return readFileSync(path, "utf-8");
}

describe("parseSFC", () => {
  it("derives component name from filename", () => {
    const doc = parseSFC("<template><div/></template>", "MyButton.vue");
    expect(doc.name).toBe("MyButton");
  });

  it("parses basic runtime props", () => {
    const source = loadFixture("BasicProps.vue");
    const doc = parseSFC(source, "BasicProps.vue");

    expect(doc.props).toHaveLength(4);

    const label = doc.props.find((p) => p.name === "label")!;
    expect(label.type).toBe("String");
    expect(label.required).toBe(true);
    expect(label.default).toBeUndefined();

    const disabled = doc.props.find((p) => p.name === "disabled")!;
    expect(disabled.type).toBe("Boolean");
    expect(disabled.required).toBe(false);
    expect(disabled.default).toBe("false");

    const size = doc.props.find((p) => p.name === "size")!;
    expect(size.type).toBe("String");
    expect(size.default).toBe('"medium"');

    const count = doc.props.find((p) => p.name === "count")!;
    expect(count.type).toBe("Number");
    expect(count.default).toBe("10");
  });

  it("extracts JSDoc descriptions for props", () => {
    const source = loadFixture("BasicProps.vue");
    const doc = parseSFC(source, "BasicProps.vue");

    const label = doc.props.find((p) => p.name === "label")!;
    expect(label.description).toBe("The label text");

    const disabled = doc.props.find((p) => p.name === "disabled")!;
    expect(disabled.description).toBe("Whether the button is disabled");
  });

  it("parses shorthand type syntax", () => {
    const source = loadFixture("ShorthandProps.vue");
    const doc = parseSFC(source, "ShorthandProps.vue");

    expect(doc.props).toHaveLength(3);

    const name = doc.props.find((p) => p.name === "name")!;
    expect(name.type).toBe("String");
    expect(name.required).toBe(false);
    expect(name.default).toBeUndefined();

    const age = doc.props.find((p) => p.name === "age")!;
    expect(age.type).toBe("Number");

    const active = doc.props.find((p) => p.name === "active")!;
    expect(active.type).toBe("Boolean");
  });

  it("parses shorthand props JSDoc", () => {
    const source = loadFixture("ShorthandProps.vue");
    const doc = parseSFC(source, "ShorthandProps.vue");

    const name = doc.props.find((p) => p.name === "name")!;
    expect(name.description).toBe("The name value");
  });

  it("parses array type syntax", () => {
    const source = loadFixture("ArrayTypeProps.vue");
    const doc = parseSFC(source, "ArrayTypeProps.vue");

    expect(doc.props).toHaveLength(2);

    const value = doc.props.find((p) => p.name === "value")!;
    expect(value.type).toBe("String | Number");

    const data = doc.props.find((p) => p.name === "data")!;
    expect(data.type).toBe("Object | Array");
  });

  it("parses array emits", () => {
    const source = loadFixture("BasicEmits.vue");
    const doc = parseSFC(source, "BasicEmits.vue");

    expect(doc.emits).toHaveLength(2);
    expect(doc.emits[0]!.name).toBe("click");
    expect(doc.emits[1]!.name).toBe("update");
  });

  it("extracts JSDoc descriptions for emits", () => {
    const source = loadFixture("BasicEmits.vue");
    const doc = parseSFC(source, "BasicEmits.vue");

    expect(doc.emits[0]!.description).toBe("Emitted when clicked");
    expect(doc.emits[1]!.description).toBe("Emitted when value updates");
  });

  it("returns empty for no-script component", () => {
    const source = loadFixture("NoScript.vue");
    const doc = parseSFC(source, "NoScript.vue");

    expect(doc.props).toHaveLength(0);
    expect(doc.emits).toHaveLength(0);
  });

  it("returns empty for empty setup component", () => {
    const source = loadFixture("EmptySetup.vue");
    const doc = parseSFC(source, "EmptySetup.vue");

    expect(doc.props).toHaveLength(0);
    expect(doc.emits).toHaveLength(0);
  });

  it("handles const props = defineProps(...) pattern", () => {
    const source = loadFixture("FullComponent.vue");
    const doc = parseSFC(source, "FullComponent.vue");

    expect(doc.props.length).toBeGreaterThan(0);
    const title = doc.props.find((p) => p.name === "title")!;
    expect(title.type).toBe("String");
    expect(title.required).toBe(true);
    expect(title.description).toBe("Title of the dialog");
  });

  it("handles const emit = defineEmits(...) pattern", () => {
    const source = loadFixture("FullComponent.vue");
    const doc = parseSFC(source, "FullComponent.vue");

    expect(doc.emits).toHaveLength(2);
    expect(doc.emits[0]!.name).toBe("submit");
    expect(doc.emits[1]!.name).toBe("cancel");
  });

  it("extracts function default values", () => {
    const source = loadFixture("FullComponent.vue");
    const doc = parseSFC(source, "FullComponent.vue");

    const items = doc.props.find((p) => p.name === "items")!;
    expect(items.default).toBe("() => []");
  });

  it("parses type-based defineProps", () => {
    const source = loadFixture("TypeProps.vue");
    const doc = parseSFC(source, "TypeProps.vue");

    expect(doc.props).toHaveLength(5);

    const theme = doc.props.find((p) => p.name === "theme")!;
    expect(theme.type).toBe("'filled' | 'outline'");
    expect(theme.required).toBe(false);

    const disabled = doc.props.find((p) => p.name === "disabled")!;
    expect(disabled.type).toBe("boolean");
    expect(disabled.required).toBe(true);

    const count = doc.props.find((p) => p.name === "count")!;
    expect(count.type).toBe("number");
    expect(count.required).toBe(false);

    const classes = doc.props.find((p) => p.name === "classes")!;
    expect(classes.type).toBe("string[]");
  });

  it("extracts JSDoc from type-based props", () => {
    const source = loadFixture("TypeProps.vue");
    const doc = parseSFC(source, "TypeProps.vue");

    const theme = doc.props.find((p) => p.name === "theme")!;
    expect(theme.description).toBe("The visual theme");

    const disabled = doc.props.find((p) => p.name === "disabled")!;
    expect(disabled.description).toBe("Whether the button is disabled");
  });

  it("parses withDefaults + type-based defineProps", () => {
    const source = loadFixture("WithDefaults.vue");
    const doc = parseSFC(source, "WithDefaults.vue");

    expect(doc.props).toHaveLength(4);

    const theme = doc.props.find((p) => p.name === "theme")!;
    expect(theme.type).toBe("'filled' | 'outline'");
    expect(theme.required).toBe(false);
    expect(theme.default).toBe('"filled"');

    const type = doc.props.find((p) => p.name === "type")!;
    expect(type.default).toBe('"button"');

    const disabled = doc.props.find((p) => p.name === "disabled")!;
    expect(disabled.default).toBe("false");

    const items = doc.props.find((p) => p.name === "items")!;
    expect(items.default).toBe("() => ({})");
  });

  it("withDefaults coexists with defineEmits", () => {
    const source = loadFixture("WithDefaults.vue");
    const doc = parseSFC(source, "WithDefaults.vue");

    expect(doc.props.length).toBeGreaterThan(0);
    expect(doc.emits).toHaveLength(2);
    expect(doc.emits[0]!.name).toBe("click");
    expect(doc.emits[1]!.name).toBe("change");
  });
});
