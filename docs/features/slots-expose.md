# Slots & Expose

## defineSlots

Use `defineSlots` with typed bindings for fully documented slots.

```vue
<script setup lang="ts">
defineSlots<{
  /** The main content area */
  default(props: {}): any
  /** Table row slot */
  row(props: { item: Record<string, unknown>; index: number }): any
}>()
</script>
```

**Generated output:**

| Name | Bindings | Description |
| --- | --- | --- |
| default | - | The main content area |
| row | item, index | Table row slot |

## Template slot fallback

When `defineSlots` is absent, compmark extracts slots from `<template>`:

```vue
<template>
  <header>
    <slot name="header"></slot>
  </header>
  <main>
    <slot :item="currentItem"></slot>
  </main>
  <footer>
    <slot name="footer"></slot>
  </footer>
</template>
```

**Generated output:**

| Name | Bindings | Description |
| --- | --- | --- |
| header | - | - |
| default | item | - |
| footer | - | - |

::: tip
`defineSlots` fully overrides template slot extraction when present. They are not merged.
:::

## defineExpose

Document methods and properties exposed to parent components via template refs.

```vue
<script setup lang="ts">
const count = ref(0)

/** Reset the counter to zero */
function reset() { count.value = 0 }

/** Validate current form state */
function validate(): boolean { return count.value > 0 }

defineExpose({ reset, validate, count })
</script>
```

**Generated output:**

| Name | Type | Description |
| --- | --- | --- |
| reset | Function | Reset the counter to zero |
| validate | Function | Validate current form state |
| count | - | - |
