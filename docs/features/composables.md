# Composables

compmark detects `use*()` pattern calls and documents their variable bindings with cross-file type inference.

## Basic detection

```vue
<script setup lang="ts">
import { useMouse } from '@vueuse/core'
import { useAuth } from '@/composables/useAuth'

const { x, y } = useMouse()
const { user, isLoggedIn, logout } = useAuth()
</script>
```

**Generated output:**

## Composables Used

### `useMouse`

**Returns:** `x`, `y`

### `useAuth`

*Source: `@/composables/useAuth`*

**Returns:** `user`, `isLoggedIn`, `logout`

## Cross-file type inference

When the composable source is a local import, compmark follows the import and infers types from `ref()`, `computed()`, `reactive()`, and function return types.

```ts
// src/composables/useCounter.ts
import { ref, computed } from 'vue'

export function useCounter(initial = 0) {
  const count = ref(initial)
  const doubled = computed(() => count.value * 2)
  function increment() { count.value++ }
  return { count, doubled, increment }
}
```

```vue
<script setup lang="ts">
import { useCounter } from '@/composables/useCounter'
const { count, doubled, increment } = useCounter()
</script>
```

**Generated output:**

### `useCounter`

*Source: `@/composables/useCounter`*

| Variable | Type |
| --- | --- |
| count | Ref&lt;number&gt; |
| doubled | ComputedRef&lt;number&gt; |
| increment | Function |

## Variable binding patterns

compmark supports all common destructuring patterns:

```vue
<script setup>
// Destructured object
const { data, error } = useFetch('/api')

// Simple assignment
const router = useRouter()

// Array pattern
const [value, setValue] = useState(0)

// Rest element
const { primary, ...rest } = useTheme()

// Bare call (no return captured)
useHead({ title: 'Home' })
</script>
```

Bare calls (no assigned variable) are documented as "Called for side effects."
