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

  // --- Phase 2: TS generic emits ---

  describe("TS generic defineEmits", () => {
    it("extracts emit names and payloads from property signature syntax", () => {
      const source = loadFixture("GenericEmits.vue");
      const doc = parseSFC(source, "GenericEmits.vue");

      expect(doc.emits).toHaveLength(2);

      const click = doc.emits.find((e) => e.name === "click")!;
      expect(click.description).toBe("Emitted on click");
      expect(click.payload).toBe("payload: MouseEvent");

      const change = doc.emits.find((e) => e.name === "change")!;
      expect(change.description).toBe("Emitted when value changes");
      expect(change.payload).toBe("value: string, oldValue: string");
    });

    it("extracts emit names and payloads from call signature syntax", () => {
      const source = loadFixture("GenericEmitsCallSignature.vue");
      const doc = parseSFC(source, "GenericEmitsCallSignature.vue");

      expect(doc.emits).toHaveLength(2);

      const click = doc.emits.find((e) => e.name === "click")!;
      expect(click.description).toBe("Emitted on click");
      expect(click.payload).toBe("payload: MouseEvent");

      const submit = doc.emits.find((e) => e.name === "submit")!;
      expect(submit.description).toBe("Emitted on submit");
      expect(submit.payload).toBeUndefined();
    });
  });

  // --- Phase 2: defineSlots ---

  describe("defineSlots", () => {
    it("extracts typed slot definitions", () => {
      const source = loadFixture("DefineSlots.vue");
      const doc = parseSFC(source, "DefineSlots.vue");

      expect(doc.slots).toHaveLength(2);

      const defaultSlot = doc.slots!.find((s) => s.name === "default")!;
      expect(defaultSlot.description).toBe("The default content");
      expect(defaultSlot.bindings).toEqual(["msg: string"]);

      const header = doc.slots!.find((s) => s.name === "header")!;
      expect(header.description).toBe("Header area");
      expect(header.bindings).toEqual(["title: string", "count: number"]);
    });
  });

  // --- Phase 2: template slots ---

  describe("template slot extraction", () => {
    it("extracts slots from template", () => {
      const source = loadFixture("TemplateSlots.vue");
      const doc = parseSFC(source, "TemplateSlots.vue");

      expect(doc.slots).toHaveLength(3);

      const defaultSlot = doc.slots!.find((s) => s.name === "default")!;
      expect(defaultSlot).toBeDefined();

      const header = doc.slots!.find((s) => s.name === "header")!;
      expect(header).toBeDefined();
      expect(header.bindings).toContain("title");

      const footer = doc.slots!.find((s) => s.name === "footer")!;
      expect(footer).toBeDefined();
    });

    it("defineSlots overrides template slots (pure fallback)", () => {
      const source = loadFixture("DefineSlots.vue");
      const doc = parseSFC(source, "DefineSlots.vue");

      // DefineSlots.vue has defineSlots with "default" and "header"
      // Template has just <slot /> (default)
      // defineSlots completely overrides template slots — pure fallback behavior
      expect(doc.slots).toHaveLength(2);
      const names = doc.slots!.map((s) => s.name);
      expect(names).toContain("default");
      expect(names).toContain("header");
      // The defineSlots version has typed bindings
      const defaultSlot = doc.slots!.find((s) => s.name === "default")!;
      expect(defaultSlot.bindings).toEqual(["msg: string"]);
    });

    it("extracts slots from template-only component (no script content)", () => {
      const source = `<template>
  <div>
    <slot name="nav-panel" />
    <slot name="content-panel" />
    <slot name="survey-footer" />
  </div>
</template>

<script setup></script>`;
      const doc = parseSFC(source, "TemplateOnly.vue");

      expect(doc.slots).toHaveLength(3);
      const names = doc.slots!.map((s) => s.name);
      expect(names).toContain("nav-panel");
      expect(names).toContain("content-panel");
      expect(names).toContain("survey-footer");
    });
  });

  // --- Phase 2: defineExpose ---

  describe("defineExpose", () => {
    it("extracts exposed methods with JSDoc", () => {
      const source = loadFixture("DefineExpose.vue");
      const doc = parseSFC(source, "DefineExpose.vue");

      expect(doc.exposes).toHaveLength(2);

      const focus = doc.exposes!.find((e) => e.name === "focus")!;
      expect(focus.type).toBe("unknown");
      expect(focus.description).toBe("Focus the component");

      const reset = doc.exposes!.find((e) => e.name === "reset")!;
      expect(reset.description).toBe("Reset the component state");
    });
  });

  // --- Phase 2: composable detection ---

  describe("composable detection", () => {
    it("detects composable calls with variable bindings", () => {
      const source = loadFixture("Composables.vue");
      const doc = parseSFC(source, "Composables.vue");

      expect(doc.composables).toHaveLength(2);

      const router = doc.composables!.find((c) => c.name === "useRouter")!;
      expect(router.variables).toHaveLength(1);
      expect(router.variables[0]!.name).toBe("router");
      expect(router.source).toBe("vue-router");

      const mouse = doc.composables!.find((c) => c.name === "useMouse")!;
      expect(mouse.variables).toHaveLength(2);
      expect(mouse.variables[0]!.name).toBe("x");
      expect(mouse.variables[1]!.name).toBe("y");
      expect(mouse.source).toBe("@vueuse/core");
    });

    it("does not include non-composable calls", () => {
      const source = loadFixture("Composables.vue");
      const doc = parseSFC(source, "Composables.vue");

      const names = doc.composables!.map((c) => c.name);
      expect(names).not.toContain("defineProps");
    });

    it("extracts variable bindings from extended patterns", () => {
      const source = loadFixture("ComposablesExtended.vue");
      const doc = parseSFC(source, "ComposablesExtended.vue");

      // useRouter with type annotation
      const router = doc.composables!.find((c) => c.name === "useRouter")!;
      expect(router.variables).toHaveLength(1);
      expect(router.variables[0]!.name).toBe("router");
      expect(router.variables[0]!.type).toBe("Router");

      // useMouse with object destructuring
      const mouse = doc.composables!.find((c) => c.name === "useMouse")!;
      expect(mouse.variables).toHaveLength(2);
      expect(mouse.variables[0]!.name).toBe("x");
      expect(mouse.variables[1]!.name).toBe("y");

      // useCounter with array destructuring
      const counter = doc.composables!.find((c) => c.name === "useCounter")!;
      expect(counter.variables).toHaveLength(2);
      expect(counter.variables[0]!.name).toBe("count");
      expect(counter.variables[1]!.name).toBe("setCount");

      // useHead bare call
      const head = doc.composables!.find((c) => c.name === "useHead")!;
      expect(head.variables).toHaveLength(0);

      // useDataLoader with rest pattern
      const loader = doc.composables!.find((c) => c.name === "useDataLoader")!;
      expect(loader.variables).toHaveLength(2);
      expect(loader.variables[0]!.name).toBe("fetchAll");
      expect(loader.variables[1]!.name).toBe("rest");
      expect(loader.source).toBe("./composables/useDataLoader");
    });

    it("populates source from import map", () => {
      const source = loadFixture("Composables.vue");
      const doc = parseSFC(source, "Composables.vue");

      const router = doc.composables!.find((c) => c.name === "useRouter")!;
      expect(router.source).toBe("vue-router");

      const mouse = doc.composables!.find((c) => c.name === "useMouse")!;
      expect(mouse.source).toBe("@vueuse/core");
    });
  });

  // --- Phase 2: JSDoc tags ---

  describe("JSDoc tags", () => {
    it("extracts @deprecated, @since, @example, @see from TS props", () => {
      const source = loadFixture("JsDocTags.vue");
      const doc = parseSFC(source, "JsDocTags.vue");

      const label = doc.props.find((p) => p.name === "label")!;
      expect(label.description).toBe("The label text");
      expect(label.deprecated).toBe("Use `text` instead");
      expect(label.since).toBe("1.0.0");
      expect(label.example).toBe('"Hello World"');
      expect(label.see).toBe("https://example.com");
    });

    it("handles @deprecated without reason", () => {
      const source = loadFixture("JsDocTags.vue");
      const doc = parseSFC(source, "JsDocTags.vue");

      const color = doc.props.find((p) => p.name === "color")!;
      expect(color.deprecated).toBe(true);
    });

    it("extracts @since independently", () => {
      const source = loadFixture("JsDocTags.vue");
      const doc = parseSFC(source, "JsDocTags.vue");

      const size = doc.props.find((p) => p.name === "size")!;
      expect(size.since).toBe("2.0.0");
      expect(size.deprecated).toBeUndefined();
    });

    it("extracts @deprecated from runtime props", () => {
      const source = loadFixture("DeprecatedRuntime.vue");
      const doc = parseSFC(source, "DeprecatedRuntime.vue");

      const label = doc.props.find((p) => p.name === "label")!;
      expect(label.deprecated).toBe("Use `text` instead");

      const color = doc.props.find((p) => p.name === "color")!;
      expect(color.deprecated).toBe(true);
    });
  });

  // --- Phase 2: @internal ---

  describe("@internal component", () => {
    it("detects @internal tag on component", () => {
      const source = loadFixture("InternalComponent.vue");
      const doc = parseSFC(source, "InternalComponent.vue");

      expect(doc.internal).toBe(true);
    });

    it("non-internal components have internal=false or undefined", () => {
      const source = loadFixture("BasicProps.vue");
      const doc = parseSFC(source, "BasicProps.vue");

      expect(doc.internal).toBeFalsy();
    });
  });

  // --- Phase 2: Options API ---

  describe("Options API", () => {
    it("extracts props from Options API object syntax", () => {
      const source = loadFixture("OptionsApi.vue");
      const doc = parseSFC(source, "OptionsApi.vue");

      expect(doc.props).toHaveLength(2);

      const title = doc.props.find((p) => p.name === "title")!;
      expect(title.type).toBe("String");
      expect(title.required).toBe(true);
      expect(title.description).toBe("The title text");

      const count = doc.props.find((p) => p.name === "count")!;
      expect(count.type).toBe("Number");
      expect(count.default).toBe("10");
      expect(count.description).toBe("Maximum count");
    });

    it("extracts emits from Options API array syntax", () => {
      const source = loadFixture("OptionsApi.vue");
      const doc = parseSFC(source, "OptionsApi.vue");

      expect(doc.emits).toHaveLength(2);
      expect(doc.emits[0]!.name).toBe("click");
      expect(doc.emits[1]!.name).toBe("update");
    });

    it("extracts props from Options API array syntax", () => {
      const source = loadFixture("OptionsApiObject.vue");
      const doc = parseSFC(source, "OptionsApiObject.vue");

      expect(doc.props).toHaveLength(2);

      const label = doc.props.find((p) => p.name === "label")!;
      expect(label.type).toBe("unknown");

      const value = doc.props.find((p) => p.name === "value")!;
      expect(value.type).toBe("unknown");
    });

    it("extracts emits from Options API object (validation) syntax", () => {
      const source = loadFixture("OptionsApiObject.vue");
      const doc = parseSFC(source, "OptionsApiObject.vue");

      expect(doc.emits).toHaveLength(2);

      const click = doc.emits.find((e) => e.name === "click")!;
      expect(click).toBeDefined();
      expect(click.description).toBe("Emitted on click");

      const submit = doc.emits.find((e) => e.name === "submit")!;
      expect(submit).toBeDefined();
      expect(submit.description).toBe("Emitted on submit with payload");
    });

    it("returns empty for script without export default", () => {
      const source = loadFixture("NoExportDefault.vue");
      const doc = parseSFC(source, "NoExportDefault.vue");

      expect(doc.props).toHaveLength(0);
      expect(doc.emits).toHaveLength(0);
    });
  });

  // --- Phase 2: Complete / kitchen-sink ---

  describe("complete component", () => {
    it("extracts all features from a kitchen-sink component", () => {
      const source = loadFixture("CompleteComponent.vue");
      const doc = parseSFC(source, "CompleteComponent.vue");

      // Props
      expect(doc.props).toHaveLength(2);
      const title = doc.props.find((p) => p.name === "title")!;
      expect(title.required).toBe(true);

      const maxItems = doc.props.find((p) => p.name === "maxItems")!;
      expect(maxItems.since).toBe("1.2.0");
      expect(maxItems.default).toBe("10");

      // Emits
      expect(doc.emits).toHaveLength(2);
      const save = doc.emits.find((e) => e.name === "save")!;
      expect(save.payload).toBeDefined();

      // Slots (from defineSlots, not duplicated by template)
      expect(doc.slots!.length).toBeGreaterThanOrEqual(2);
      const actionsSlot = doc.slots!.find((s) => s.name === "actions")!;
      expect(actionsSlot).toBeDefined();

      // Exposes
      expect(doc.exposes).toHaveLength(1);
      expect(doc.exposes![0]!.name).toBe("reset");

      // Composables
      expect(doc.composables).toHaveLength(1);
      expect(doc.composables![0]!.name).toBe("useMouse");
      expect(doc.composables![0]!.variables).toBeDefined();
    });
  });

  // --- Cross-file type resolution ---

  describe("cross-file type resolution", () => {
    it("infers types from composable source file", () => {
      const fixtureDir = resolve(import.meta.dirname!, "fixtures");
      const source = loadFixture("ComposablesCrossFile.vue");
      const doc = parseSFC(source, "ComposablesCrossFile.vue", fixtureDir);

      const td = doc.composables!.find((c) => c.name === "useTestData")!;
      expect(td).toBeDefined();
      expect(td.variables.length).toBe(12);

      const count = td.variables.find((v) => v.name === "count")!;
      expect(count.type).toBe("Ref<number>");

      const name = td.variables.find((v) => v.name === "name")!;
      expect(name.type).toBe("Ref<string>");

      const isActive = td.variables.find((v) => v.name === "isActive")!;
      expect(isActive.type).toBe("Ref<boolean>");

      const items = td.variables.find((v) => v.name === "items")!;
      expect(items.type).toBe("Ref<Array>");

      const config = td.variables.find((v) => v.name === "config")!;
      expect(config.type).toBe("Ref<Object>");

      const empty = td.variables.find((v) => v.name === "empty")!;
      expect(empty.type).toBe("Ref<null>");

      const total = td.variables.find((v) => v.name === "total")!;
      expect(total.type).toBe("ComputedRef");

      const state = td.variables.find((v) => v.name === "state")!;
      expect(state.type).toBe("Object");

      const fetchData = td.variables.find((v) => v.name === "fetchData")!;
      expect(fetchData.type).toBe("(id, filter) => Promise<void>");

      const reset = td.variables.find((v) => v.name === "reset")!;
      expect(reset.type).toBe("() => void");

      const label = td.variables.find((v) => v.name === "label")!;
      expect(label.type).toBe("string");

      const limit = td.variables.find((v) => v.name === "limit")!;
      expect(limit.type).toBe("number");
    });

    it("skips resolution for node_modules imports", () => {
      const fixtureDir = resolve(import.meta.dirname!, "fixtures");
      const source = loadFixture("Composables.vue");
      const doc = parseSFC(source, "Composables.vue", fixtureDir);

      // node_modules imports should not have types resolved
      const router = doc.composables!.find((c) => c.name === "useRouter")!;
      expect(router.variables[0]!.type).toBeUndefined();
    });

    it("gracefully handles missing composable file", () => {
      const fixtureDir = resolve(import.meta.dirname!, "fixtures");
      const source = `<template><div /></template>
<script setup lang="ts">
import { useNonExistent } from "./composables/useNonExistent";
const { foo } = useNonExistent();
</script>`;
      const doc = parseSFC(source, "Missing.vue", fixtureDir);

      const ne = doc.composables!.find((c) => c.name === "useNonExistent")!;
      expect(ne.variables[0]!.name).toBe("foo");
      expect(ne.variables[0]!.type).toBeUndefined();
    });
  });

  // --- Phase 3: imported type resolution ---

  describe("imported type props", () => {
    it("resolves defineProps<ImportedType>() from external file", () => {
      const fixtureDir = resolve(import.meta.dirname!, "fixtures");
      const source = loadFixture("ImportedProps.vue");
      const doc = parseSFC(source, "ImportedProps.vue", fixtureDir);

      expect(doc.props.length).toBeGreaterThanOrEqual(2);

      const label = doc.props.find((p) => p.name === "label")!;
      expect(label).toBeDefined();
      expect(label.type).toBe("string");
      expect(label.required).toBe(true);

      const disabled = doc.props.find((p) => p.name === "disabled")!;
      expect(disabled).toBeDefined();
      expect(disabled.type).toBe("boolean");
      expect(disabled.required).toBe(false);
    });

    it("resolves withDefaults(defineProps<ImportedType>(), {...})", () => {
      const fixtureDir = resolve(import.meta.dirname!, "fixtures");
      const source = loadFixture("ImportedPropsDefaults.vue");
      const doc = parseSFC(source, "ImportedPropsDefaults.vue", fixtureDir);

      expect(doc.props.length).toBeGreaterThanOrEqual(2);

      const disabled = doc.props.find((p) => p.name === "disabled")!;
      expect(disabled).toBeDefined();
      expect(disabled.default).toBe("false");

      const size = doc.props.find((p) => p.name === "size")!;
      expect(size).toBeDefined();
      expect(size.default).toBe('"medium"');
    });

    it("returns empty props when sfcDir is not provided", () => {
      const source = `<template><div /></template>
<script setup lang="ts">
import type { ButtonProps } from "./types/ButtonProps";
defineProps<ButtonProps>();
</script>`;
      const doc = parseSFC(source, "Test.vue");
      // Without sfcDir, can't resolve the import
      expect(doc.props).toHaveLength(0);
    });
  });
});
