<p align="center">
  <img src="./logo.svg" width="120" height="120" alt="compmark logo">
</p>

<h1 align="center">Compmark Vue</h1>

<!-- automd:badges color=yellow -->

[![npm version](https://img.shields.io/npm/v/compmark-vue?color=yellow)](https://npmjs.com/package/compmark-vue)
[![npm downloads](https://img.shields.io/npm/dm/compmark-vue?color=yellow)](https://npm.chart.dev/compmark-vue)

<!-- /automd -->

Auto-generate Markdown documentation from Vue 3 SFCs. Zero configuration required — or use a config file for full control.

[**Documentation**](https://noopurphalak.github.io/compmark-vue/)

## Quick Start

Document a single component:

```sh
npx compmark-vue ./src/components/Button.vue
```

Document an entire directory:

```sh
npx compmark-vue ./src/components --out ./docs/api
```

## Installation

```sh
# npm
npm install -D compmark-vue

# pnpm
pnpm add -D compmark-vue

# yarn
yarn add -D compmark-vue
```

> Requires Node.js >= 20

## Add to your `package.json` post installation

```json
{
  "scripts": {
    "docs": "compmark ./src/components --out ./docs/api"
  }
}
```

## CLI

```
compmark <files/dirs/globs> [options]
```

| Option                 | Description                        | Default |
| ---------------------- | ---------------------------------- | ------- |
| `--out <dir>`          | Output directory                   | `.`     |
| `--format <md\|json>`  | Output format                      | `md`    |
| `--join`               | Combine into a single file         |         |
| `--ignore <patterns>`  | Comma-separated ignore patterns    |         |
| `--preserve-structure` | Mirror input folder tree in output |         |
| `--watch`              | Watch for changes and rebuild      |         |
| `--silent`             | Suppress non-error output          |         |
| `--config <path>`      | Path to config file                |         |

### Examples

```sh
# Single file
compmark Button.vue

# Directory (recursive)
compmark src/components --out docs/api

# Glob pattern
compmark "src/**/components/*.vue" --out docs

# Monorepo
compmark "packages/*/src/components" --out docs/api

# Combined markdown with table of contents
compmark src/components --out docs --join

# JSON output
compmark src/components --out docs/api --format json

# JSON combined into single file
compmark src/components --format json --join --out docs

# Ignore patterns
compmark src/components --ignore "internal,*.test"

# Preserve folder structure in output
compmark src --out docs --preserve-structure
# src/components/Button.vue → docs/components/Button.md
# src/views/Home.vue       → docs/views/Home.md

# Watch mode
compmark src/components --out docs --watch

# Multiple inputs
compmark src/components src/layouts --out docs
```

The summary line shows what happened:

```
✓ 24 components documented, 2 skipped, 0 errors
```

Skipped count includes both `@internal` components and files matching `--ignore` patterns.

Exit code is `1` when errors occur (except in watch mode).

In watch mode, individual file changes are processed incrementally — only the changed file is re-parsed and re-written. If a file is deleted or becomes `@internal`, its output is automatically removed.

## Features

- [Component description](#component-description) — JSDoc on the first statement becomes a component summary
- [Refs](#refs) — `ref()`, `shallowRef()`, `reactive()`, `shallowReactive()` with type inference
- [Computed](#computed) — `computed()` with generic and return-type inference
- [Props](#props) — runtime and TypeScript generic syntax, including imported types
- [Emits](#emits) — array, TypeScript property, and call signature syntax
- [Slots](#slots) — `defineSlots` with typed bindings, template `<slot>` fallback
- [Expose](#expose) — `defineExpose` with JSDoc descriptions
- [Composables](#composables) — auto-detects `useX()` calls in `<script setup>`
- [JSDoc tags](#jsdoc-tags) — `@deprecated`, `@since`, `@example`, `@see`, `@default`, `@category`, `@version`
- [`@internal`](#internal-components) — exclude components from output
- [Options API](#options-api) — `export default { props, emits, data(), computed }` support
- [Output formats](#output-formats) — Markdown (individual or joined), JSON
- [Preserve structure](#preserve-structure) — mirror input folder tree in `--out`
- [Config file](#config-file) — `compmark.config.ts` with all options
- [Category grouping](#category-grouping) — group components in joined output
- [Section ordering](#section-ordering) — customize section order in markdown
- [Path aliases](#path-aliases) — auto-read `tsconfig.json` + config overrides
- Empty sections are skipped cleanly — no placeholder noise

## Examples

### Component Description

A JSDoc comment at the top of `<script setup>` is extracted as the component description and included in the generated `.md` file:

```vue
<!-- ConfirmDialog.vue -->
<template>
  <dialog :open="open">
    <slot />
    <button @click="$emit('confirm')">OK</button>
    <button @click="$emit('cancel')">Cancel</button>
  </dialog>
</template>

<script setup lang="ts">
/**
 * A dialog for confirming destructive user actions such as deletions.
 */
import { ref } from "vue";

const props = defineProps<{
  /** Whether the dialog is visible */
  open: boolean;
  /** Dialog title */
  title?: string;
}>();

const emit = defineEmits<{
  /** Emitted when the user confirms the action */
  confirm: [];
  /** Emitted when the user cancels */
  cancel: [];
}>();

const loading = ref(false);
</script>
```

Running `compmark ConfirmDialog.vue` produces `ConfirmDialog.md`:

```md
# ConfirmDialog

A dialog for confirming destructive user actions such as deletions.

**Note:** Uses `<script setup>` syntax.

## Refs

| Name    | Type               | Description |
| ------- | ------------------ | ----------- |
| loading | Ref&lt;boolean&gt; | -           |

## Props

| Name  | Type    | Required | Default | Description                   |
| ----- | ------- | -------- | ------- | ----------------------------- |
| open  | boolean | Yes      | -       | Whether the dialog is visible |
| title | string  | No       | -       | Dialog title                  |

## Emits

| Name    | Description                               |
| ------- | ----------------------------------------- |
| confirm | Emitted when the user confirms the action |
| cancel  | Emitted when the user cancels             |

## Slots

| Name    | Bindings | Description |
| ------- | -------- | ----------- |
| default | -        | -           |
```

The description is picked up automatically when the JSDoc comment is on:

- An `import` statement (most common — put the comment at the top of the script)
- A `defineProps` / `defineEmits` call (bare or `const props = defineProps(...)`)
- A `withDefaults(...)` call

If the first statement is a plain variable (like `const count = ref(0)`), use the `@component` tag so the comment isn't mistaken for a variable description:

```vue
<script setup lang="ts">
/**
 * @component
 * A tooltip that appears on hover.
 */
const visible = ref(false);
</script>
```

### Refs

`ref()`, `shallowRef()`, `reactive()`, and `shallowReactive()` in `<script setup>` are automatically documented with inferred types:

```vue
<script setup lang="ts">
import { ref, shallowRef, reactive, computed } from "vue";

/**
 * The counter value
 * @since 1.0.0
 */
const count = ref(0);

/** The user's name */
const name = ref<string>("");

/** @deprecated Use shallowData instead */
const data = shallowRef<string[]>([]);

const state = reactive({ count: 0, name: "" });
</script>
```

Output:

```md
## Refs

| Name  | Type                       | Description                               |
| ----- | -------------------------- | ----------------------------------------- |
| count | Ref&lt;number&gt;          | The counter value _(since 1.0.0)_         |
| name  | Ref&lt;string&gt;          | The user's name                           |
| data  | ShallowRef&lt;string[]&gt; | - **Deprecated**: Use shallowData instead |
| state | Object                     | -                                         |
```

Type inference priority:

1. Explicit TS annotation: `const x: Ref<string[]> = ref([])` → `Ref<string[]>`
2. Generic type parameter: `ref<string>("")` → `Ref<string>`
3. Literal argument: `ref(0)` → `Ref<number>`, `ref("")` → `Ref<string>`, `ref(true)` → `Ref<boolean>`
4. Fallback: `Ref` (no type parameter)

### Computed

`computed()` calls are documented with type inference from generics or getter return types:

```vue
<script setup lang="ts">
import { ref, computed } from "vue";

const count = ref(0);

/**
 * The full display name
 * @since 2.0.0
 */
const fullName = computed(() => "John Smith");

const total = computed<number>(() => count.value * 2);

const doubled = computed((): number => count.value * 2);
</script>
```

Output:

```md
## Computed

| Name     | Type                      | Description                           |
| -------- | ------------------------- | ------------------------------------- |
| fullName | ComputedRef               | The full display name _(since 2.0.0)_ |
| total    | ComputedRef&lt;number&gt; | -                                     |
| doubled  | ComputedRef&lt;number&gt; | -                                     |
```

### Props

Runtime syntax, TypeScript generics, and `withDefaults` are all supported:

```vue
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** The label text */
    label: string;
    /** Visual theme */
    theme?: "filled" | "outline";
    disabled?: boolean;
  }>(),
  {
    theme: "filled",
    disabled: false,
  },
);
</script>
```

Output:

```md
## Props

| Name     | Type                  | Required | Default    | Description    |
| -------- | --------------------- | -------- | ---------- | -------------- |
| label    | string                | Yes      | -          | The label text |
| theme    | 'filled' \| 'outline' | No       | `"filled"` | Visual theme   |
| disabled | boolean               | No       | `false`    | -              |
```

Runtime object syntax is also supported:

```vue
<script setup>
defineProps({
  /** Title of the dialog */
  title: {
    type: String,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
```

#### Imported types

`defineProps<ImportedType>()` with exported interfaces or type aliases is supported:

```ts
// types.ts
export interface ButtonProps {
  /** The label text */
  label: string;
  disabled?: boolean;
}
```

```vue
<script setup lang="ts">
import type { ButtonProps } from "./types";

defineProps<ButtonProps>();
</script>
```

Interface `extends` is resolved (up to 5 levels deep). `withDefaults` works with imported types too.

### Emits

TypeScript generic syntax with payloads:

```vue
<script setup lang="ts">
const emit = defineEmits<{
  /** Emitted on save */
  save: [data: Record<string, unknown>];
  /** Emitted on cancel */
  cancel: [];
}>();
</script>
```

Output:

```md
## Emits

| Name   | Payload                       | Description       |
| ------ | ----------------------------- | ----------------- |
| save   | data: Record<string, unknown> | Emitted on save   |
| cancel | -                             | Emitted on cancel |
```

Call signature syntax is also supported:

```vue
<script setup lang="ts">
defineEmits<{
  (e: "click", payload: MouseEvent): void;
  (e: "submit"): void;
}>();
</script>
```

Array syntax works too: `defineEmits(["click", "submit"])`.

### Slots

`defineSlots` provides typed bindings:

```vue
<script setup lang="ts">
defineSlots<{
  /** Main content */
  default(props: { msg: string }): any;
  /** Header area */
  header(props: { title: string; count: number }): any;
}>();
</script>
```

Output:

```md
## Slots

| Name    | Bindings                     | Description  |
| ------- | ---------------------------- | ------------ |
| default | msg: string                  | Main content |
| header  | title: string, count: number | Header area  |
```

If `defineSlots` is not used, slots are extracted from template `<slot>` elements as a fallback:

```vue
<template>
  <div>
    <slot />
    <slot name="header" :title="title" />
    <slot name="footer" />
  </div>
</template>
```

### Expose

```vue
<script setup lang="ts">
defineExpose({
  /** Focus the component */
  focus,
  /** Reset the component state */
  reset,
});
</script>
```

Output:

```md
## Exposed

| Name  | Type    | Description               |
| ----- | ------- | ------------------------- |
| focus | unknown | Focus the component       |
| reset | unknown | Reset the component state |
```

### Composables

Any `useX()` calls in `<script setup>` are automatically detected. Variable bindings (simple assignment, object/array destructuring, rest elements) are extracted:

```vue
<script setup lang="ts">
import { useRouter } from "vue-router";
import { useMouse } from "@vueuse/core";
import { useAuth } from "./composables/useAuth";

const router = useRouter();
const { x, y } = useMouse();
const { user, login, logout } = useAuth();
useHead({ title: "My App" });
</script>
```

Output:

```md
## Composables Used

### `useRouter`

**Returns:** `router`

### `useMouse`

**Returns:** `x`, `y`

### `useAuth`

_Source: `./composables/useAuth`_

| Variable | Type                                        |
| -------- | ------------------------------------------- |
| user     | Ref<User>                                   |
| login    | (credentials: Credentials) => Promise<void> |
| logout   | () => void                                  |

### `useHead`

Called for side effects.
```

For local imports (`./` or `@/` paths), types are automatically resolved from the composable source file — `ref()`, `computed()`, `reactive()`, function signatures, and literals are all inferred. Source attribution is shown for local imports only.

### JSDoc Tags

Props support `@deprecated`, `@since`, `@example`, and `@see`:

```vue
<script setup lang="ts">
defineProps<{
  /**
   * The label text
   * @deprecated Use `text` instead
   * @since 1.0.0
   * @example "Hello World"
   * @see https://example.com/docs
   */
  label: string;
}>();
</script>
```

Output:

````md
## Props

| Name  | Type   | Required | Default | Description                                                                                     |
| ----- | ------ | -------- | ------- | ----------------------------------------------------------------------------------------------- |
| label | string | Yes      | -       | The label text **Deprecated**: Use `text` instead _(since 1.0.0)_ See: https://example.com/docs |

**`label` example:**

```
"Hello World"
```
````

#### Component-level Tags

`@category`, `@version`, and `@deprecated` can be used on the component JSDoc:

```vue
<script setup lang="ts">
/**
 * A text input with validation.
 * @category Forms
 * @version 2.1.0
 * @deprecated Use TextFieldV2 instead
 */
import { ref } from "vue";
</script>
```

Output:

```md
# TextInput ⚠️ Deprecated

> **⚠️ Deprecated**: Use TextFieldV2 instead

A text input with validation.

**Version:** 2.1.0
```

`@category` is used for grouping in [joined output](#category-grouping). `@version` adds a version badge. `@deprecated` adds a visual warning badge to the heading.

### Internal Components

Mark a component with `@internal` to skip it during generation:

```vue
<script setup lang="ts">
/**
 * @internal
 */
defineProps<{
  value: string;
}>();
</script>
```

```sh
$ compmark InternalHelper.vue
  Skipped InternalHelper.vue (marked @internal)
✓ 0 components documented, 1 skipped, 0 errors
```

### Options API

Components using `export default {}` are supported. Props, emits, `data()`, and `computed` are all extracted:

```vue
<script>
export default {
  props: {
    /** The title text */
    title: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 10,
    },
  },
  emits: ["click", "update"],
  data() {
    return {
      /** The greeting message */
      message: "Hello",
      isActive: true,
    };
  },
  computed: {
    /**
     * The full display name
     * @since 1.0.0
     */
    fullName() {
      return this.title + " Smith";
    },
  },
};
</script>
```

Output:

```md
## Refs

| Name     | Type    | Description          |
| -------- | ------- | -------------------- |
| message  | string  | The greeting message |
| isActive | boolean | -                    |

## Computed

| Name     | Type    | Description                           |
| -------- | ------- | ------------------------------------- |
| fullName | unknown | The full display name _(since 1.0.0)_ |

## Props

| Name  | Type   | Required | Default | Description    |
| ----- | ------ | -------- | ------- | -------------- |
| title | String | Yes      | -       | The title text |
| count | Number | No       | `10`    | -              |

## Emits

| Name   | Description |
| ------ | ----------- |
| click  | -           |
| update | -           |
```

`data()` return properties are documented as refs with literal type inference. Computed properties support both simple getters and get/set object syntax.

### Output Formats

**Individual markdown** (default) — one `.md` file per component:

```sh
compmark src/components --out docs
# Creates: docs/Button.md, docs/Dialog.md, ...
```

**Joined markdown** — single file with table of contents:

```sh
compmark src/components --out docs --join
# Creates: docs/components.md
```

The joined file includes a generated timestamp, table of contents with anchor links, and all components with headings bumped one level.

**JSON** — machine-readable output:

```sh
# Individual JSON files
compmark src/components --out docs --format json
# Creates: docs/Button.json, docs/Dialog.json, ...

# Combined JSON
compmark src/components --format json --join --out docs
# Creates: docs/components.json with { generated, components: [...] }
```

### Preserve Structure

By default, all output files are placed flat in the `--out` directory. Use `--preserve-structure` to mirror the input folder hierarchy:

```sh
compmark src --out docs/api --preserve-structure
```

```
src/components/Button.vue  → docs/api/components/Button.md
src/components/Dialog.vue  → docs/api/components/Dialog.md
src/views/Home.vue         → docs/api/views/Home.md
```

Without `--preserve-structure`, components with the same name in different directories get a numeric suffix (`Button.md`, `Button-2.md`). With `--preserve-structure`, they live in separate subdirectories.

`--join` mode ignores `--preserve-structure` (single output file).

### Config File

Create `compmark.config.ts` in your project root:

```ts
export default {
  include: ["src/components/**/*.vue"],
  exclude: ["**/*.test.vue"],
  outDir: "docs/api",
  format: "md",
  aliases: { "@": "./src" },
  sectionOrder: ["props", "emits", "slots", "refs", "computed", "exposed", "composables"],
};
```

Then run `compmark` with no arguments — the config provides everything.

Config files are auto-discovered as `compmark.config.{ts,js,mjs,cjs,json}` or `.compmarkrc`. Use `--config <path>` to point to a specific file. CLI flags override config values.

### Category Grouping

Use `@category` to group components in `--join` output:

```vue
<script setup lang="ts">
/** @category Forms */
import { ref } from "vue";
defineProps<{ label: string }>();
</script>
```

When using `--join`, components are grouped under category headings with a two-level table of contents. Components without a category appear first. Within each category, components are sorted alphabetically.

### Section Ordering

The `sectionOrder` config option controls which sections appear and in what order:

```ts
export default {
  // Only show props and emits, hide everything else
  sectionOrder: ["props", "emits"],
};
```

Available keys: `refs`, `computed`, `props`, `emits`, `slots`, `exposed`, `composables`.

### Path Aliases

compmark automatically reads `tsconfig.json` (or `jsconfig.json`) `compilerOptions.paths` for import resolution. You can augment or override these with `config.aliases`:

```ts
export default {
  aliases: {
    "@": "./src", // overrides tsconfig @/* path
    "#utils": "./lib/utils", // additional alias
  },
};
```

Config aliases take precedence over tsconfig paths on conflict.

## Programmatic API

```sh
pnpm install compmark-vue
```

```ts
import { parseComponent, generateMarkdown } from "compmark-vue";

const doc = parseComponent("./src/components/Button.vue");
const md = generateMarkdown(doc);
```

Or parse from a string:

```ts
import { parseSFC, generateMarkdown } from "compmark-vue";

const doc = parseSFC(source, "Button.vue");
const md = generateMarkdown(doc);
```

Multi-file processing:

```ts
import { discoverFiles, processFiles } from "compmark-vue";

const { files, ignoredCount, basePath } = await discoverFiles(["src/components"], ["dist"]);
const summary = processFiles(files, { silent: false });
// summary.files, summary.documented, summary.skipped, summary.errors
```

## Development

<details>

<summary>local development</summary>

- Clone this repository
- Install latest LTS version of [Node.js](https://nodejs.org/en/) (>= 20)
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

</details>

## License

Published under the [MIT](https://github.com/noopurphalak/compmark-vue/blob/main/LICENSE) license.
