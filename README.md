# vuemark

<!-- automd:badges color=yellow -->

[![npm version](https://img.shields.io/npm/v/vuemark?color=yellow)](https://npmjs.com/package/vuemark)
[![npm downloads](https://img.shields.io/npm/dm/vuemark?color=yellow)](https://npm.chart.dev/vuemark)

<!-- /automd -->

Auto-generate Markdown documentation from Vue 3 SFCs. Zero configuration required.

## Quick Start

```sh
npx compmark-vue ./src/components/Button.vue
```

This parses the component and creates `Button.md` in your current directory.

### Example Output

Given a component like:

```vue
<script setup>
/**
 * @emit submit Emitted on form submit
 * @emit cancel Emitted on cancel
 */
const emit = defineEmits(["submit", "cancel"]);

const props = defineProps({
  /** Title of the dialog */
  title: {
    type: String,
    required: true,
  },
  /** Whether the dialog is visible */
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
```

vuemark generates:

```md
# Dialog

## Props

| Name    | Type    | Required | Default | Description                   |
| ------- | ------- | -------- | ------- | ----------------------------- |
| title   | String  | Yes      | -       | Title of the dialog           |
| visible | Boolean | No       | `false` | Whether the dialog is visible |

## Emits

| Name   | Description            |
| ------ | ---------------------- |
| submit | Emitted on form submit |
| cancel | Emitted on cancel      |
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

## Supported Syntax

- `defineProps({ ... })` — shorthand (`String`), array type (`[String, Number]`), and full object syntax
- `defineEmits([...])` — array syntax
- JSDoc comments on props and emits (`/** ... */`)
- `const props = defineProps(...)` variable assignment pattern
- Default value extraction (string, number, boolean literals, arrow functions)

## Development

<details>

<summary>local development</summary>

- Clone this repository
- Install latest LTS version of [Node.js](https://nodejs.org/en/)
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

</details>

## License

Published under the [MIT](https://github.com/noopurphalak/vuemark/blob/main/LICENSE) license.
