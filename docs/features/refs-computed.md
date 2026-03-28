# Refs & Computed

compmark extracts reactive state declarations from `<script setup>` and Options API.

## ref() and shallowRef()

```vue
<script setup lang="ts">
import { ref, shallowRef } from "vue";

/** Current search query */
const query = ref("");

/** Selected user ID */
const userId = ref<number | null>(null);

/** The active data set (shallow for performance) */
const dataset = shallowRef<Record<string, unknown>[]>([]);
</script>
```

**Generated output:**

## Refs

| Name    | Type                            | Description                                   |
| ------- | ------------------------------- | --------------------------------------------- |
| query   | string                          | Current search query                          |
| userId  | number \| null                  | Selected user ID                              |
| dataset | Record&lt;string, unknown&gt;[] | The active data set (shallow for performance) |

## computed()

```vue
<script setup lang="ts">
import { ref, computed } from "vue";

const items = ref<string[]>([]);

/** Total number of items */
const count = computed(() => items.value.length);

/** Whether the list is empty */
const isEmpty = computed<boolean>(() => items.value.length === 0);
</script>
```

**Generated output:**

## Computed

| Name    | Type    | Description               |
| ------- | ------- | ------------------------- |
| count   | number  | Total number of items     |
| isEmpty | boolean | Whether the list is empty |

## Type inference

compmark infers types in this order of precedence:

1. **Explicit annotation** -- `const x: Ref<string> = ref('')` uses `string`
2. **Generic parameter** -- `ref<number>(0)` uses `number`
3. **Literal inference** -- `ref('')` infers `string`, `ref(0)` infers `number`, `ref(false)` infers `boolean`

## JSDoc annotations

Refs and computed properties support the same JSDoc tags as props:

```vue
<script setup lang="ts">
/**
 * Tracks the current page number
 * @since 2.1.0
 * @deprecated Use usePagination() instead
 */
const page = ref(1);
</script>
```

| Name | Type   | Description                                                                                |
| ---- | ------ | ------------------------------------------------------------------------------------------ |
| page | number | Tracks the current page number _(since 2.1.0)_ **Deprecated**: Use usePagination() instead |
