# Props & Emits

compmark extracts `defineProps` and `defineEmits` in all supported syntaxes.

## defineProps

### Runtime syntax

```vue
<script setup>
defineProps({
  label: String,
  count: { type: Number, required: true, default: 0 },
  items: { type: [Array, Object] },
})
</script>
```

**Generated output:**

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| label | String | No | - | - |
| count | Number | Yes | `0` | - |
| items | Array \| Object | No | - | - |

### TypeScript generic

```vue
<script setup lang="ts">
interface Props {
  /** The button label */
  label: string
  /** Visual variant */
  variant?: 'primary' | 'secondary'
}

defineProps<Props>()
</script>
```

**Generated output:**

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| label | string | Yes | - | The button label |
| variant | 'primary' \| 'secondary' | No | - | Visual variant |

### withDefaults

```vue
<script setup lang="ts">
interface Props {
  /** Button text */
  label: string
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  disabled: false,
})
</script>
```

**Generated output:**

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| label | string | Yes | - | Button text |
| disabled | boolean | No | `false` | - |

## defineEmits

### Array syntax

```vue
<script setup>
defineEmits(['click', 'update'])
</script>
```

| Name | Description |
| --- | --- |
| click | - |
| update | - |

### TypeScript generic with payloads

```vue
<script setup lang="ts">
defineEmits<{
  click: [event: MouseEvent]
  update: [value: string, index: number]
}>()
</script>
```

When payloads are present, compmark adds a Payload column:

| Name | Payload | Description |
| --- | --- | --- |
| click | [event: MouseEvent] | - |
| update | [value: string, index: number] | - |
