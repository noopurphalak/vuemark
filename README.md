# compmark-vue

<!-- automd:badges color=yellow -->

[![npm version](https://img.shields.io/npm/v/compmark-vue?color=yellow)](https://npmjs.com/package/compmark-vue)
[![npm downloads](https://img.shields.io/npm/dm/compmark-vue?color=yellow)](https://npm.chart.dev/compmark-vue)

<!-- /automd -->

Auto-generate Markdown documentation from Vue 3 SFCs. Zero configuration required.

## Quick Start

Document a single component:

```sh
npx compmark-vue ./src/components/Button.vue
```

Document an entire directory:

```sh
npx compmark-vue ./src/components --out ./docs/api
```

Add to your `package.json`:

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

| Option                | Description                     | Default |
| --------------------- | ------------------------------- | ------- |
| `--out <dir>`         | Output directory                | `.`     |
| `--format <md\|json>` | Output format                   | `md`    |
| `--join`              | Combine into a single file      |         |
| `--ignore <patterns>` | Comma-separated ignore patterns |         |
| `--watch`             | Watch for changes and rebuild   |         |
| `--silent`            | Suppress non-error output       |         |

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

# Watch mode
compmark src/components --out docs --watch

# Multiple inputs
compmark src/components src/layouts --out docs
```

The summary line shows what happened:

```
✓ 24 components documented, 2 skipped, 0 errors
```

Exit code is `1` when errors occur (except in watch mode).

## Features

- [Props](#props) — runtime and TypeScript generic syntax, including imported types
- [Emits](#emits) — array, TypeScript property, and call signature syntax
- [Slots](#slots) — `defineSlots` with typed bindings, template `<slot>` fallback
- [Expose](#expose) — `defineExpose` with JSDoc descriptions
- [Composables](#composables) — auto-detects `useX()` calls in `<script setup>`
- [JSDoc tags](#jsdoc-tags) — `@deprecated`, `@since`, `@example`, `@see`, `@default`
- [`@internal`](#internal-components) — exclude components from output
- [Options API](#options-api) — `export default { props, emits }` support
- [Output formats](#output-formats) — Markdown (individual or joined), JSON
- Empty sections are skipped cleanly — no placeholder noise

## Examples

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

Components using `export default {}` are supported:

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
};
</script>
```

Output:

```md
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

const files = await discoverFiles(["src/components"], ["dist"]);
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
