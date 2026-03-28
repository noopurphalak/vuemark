# Getting Started

## Installation

```bash
npm install -D compmark-vue
```

Or with pnpm:

```bash
pnpm add -D compmark-vue
```

## Quick Start

Run compmark on your components:

```bash
npx compmark src/components --out docs/api
```

This scans all `.vue` files in `src/components` and generates markdown documentation in `docs/api/`.

## Example Output

Given a component `Button.vue`:

```vue
<script setup lang="ts">
/**
 * A primary action button.
 * @category Forms
 * @version 1.2.0
 */

interface Props {
  /** The button label */
  label: string
  /** Visual variant */
  variant?: 'primary' | 'secondary'
  /** Whether the button is disabled */
  disabled?: boolean
}

defineProps<Props>()
defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button :disabled="disabled">
    <slot>{{ label }}</slot>
  </button>
</template>
```

compmark generates:

```markdown
# Button

A primary action button.

**Version:** 1.2.0

## Props

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| label | string | Yes | - | The button label |
| variant | 'primary' \| 'secondary' | No | - | Visual variant |
| disabled | boolean | No | - | Whether the button is disabled |

## Emits

| Name | Payload | Description |
| --- | --- | --- |
| click | [event: MouseEvent] | - |

## Slots

| Name | Bindings | Description |
| --- | --- | --- |
| default | - | - |
```

## Add Config File (Optional)

Create `compmark.config.ts` in your project root:

```ts
export default {
  include: ['src/components/**/*.vue'],
  exclude: ['**/*.test.vue'],
  outDir: 'docs/api',
  format: 'md',
}
```

Now you can run `npx compmark` with no arguments.

## Add to package.json Scripts

```json
{
  "scripts": {
    "docs:generate": "compmark",
    "docs:watch": "compmark --watch"
  }
}
```
