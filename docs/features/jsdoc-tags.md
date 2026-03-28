# JSDoc Tags

compmark recognizes the following JSDoc tags inside `/** */` comment blocks.

## Tag reference

| Tag | Scope | Effect |
| --- | --- | --- |
| `@deprecated [reason]` | Props, refs, computed, component | Adds **Deprecated** badge in description |
| `@since <version>` | Props, refs, computed | Appends *(since version)* to description |
| `@example <text>` | Props, refs, computed | Renders a code block after the table |
| `@see <reference>` | Props, refs, computed | Appends `See: reference` to description |
| `@default <value>` | Props | Overrides the displayed default value |
| `@internal` | Component | Excludes component from documentation entirely |
| `@component` | Component | Marks JSDoc as component-level (use when first statement is a variable) |
| `@category <name>` | Component | Groups components under a heading in joined output |
| `@version <version>` | Component | Displays version badge below heading |

## @deprecated

```vue
<script setup lang="ts">
defineProps<{
  /** @deprecated Use `icon` prop instead */
  iconName?: string
  icon?: string
}>()
</script>
```

Output in the Description column:

```
**Deprecated**: Use `icon` prop instead
```

Component-level `@deprecated` adds a banner and modifies the heading:

```markdown
# OldButton Deprecated

> **Deprecated**: Use NewButton instead
```

## @since and @see

```vue
<script setup lang="ts">
defineProps<{
  /**
   * Animation duration in ms
   * @since 1.3.0
   * @see https://docs.example.com/animations
   */
  duration?: number
}>()
</script>
```

Description renders as:

```
Animation duration in ms *(since 1.3.0)* See: https://docs.example.com/animations
```

## @example

```vue
<script setup lang="ts">
defineProps<{
  /**
   * CSS color value
   * @example #ff0000
   */
  color?: string
}>()
</script>
```

After the Props table, compmark adds:

````
**`color` example:**

```
#ff0000
```
````

## @internal

```vue
<script setup lang="ts">
/**
 * @internal
 */
import { ref } from 'vue'
</script>
```

The component is skipped entirely. The CLI prints a message and increments the skipped count.

## @component

Use `@component` when the first statement in `<script setup>` is a variable declaration rather than an import or define call:

```vue
<script setup lang="ts">
/**
 * A reusable modal dialog.
 * @component
 * @category Overlays
 */
const isOpen = ref(false)
</script>
```

Without `@component`, the JSDoc would be attached to the `isOpen` ref instead of the component.

## @category

Used with `--join` to group components under category headings:

```vue
<script setup lang="ts">
/**
 * @category Forms
 */
defineProps<{ value: string }>()
</script>
```

In joined output, components are grouped by category with a heading and TOC entries.

## @version

```vue
<script setup lang="ts">
/**
 * Accessible date picker.
 * @version 2.0.0
 */
defineProps<{ modelValue: Date }>()
</script>
```

Output:

```markdown
# DatePicker

Accessible date picker.

**Version:** 2.0.0
```
