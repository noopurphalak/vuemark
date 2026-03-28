# Basic Component

A complete walkthrough: write a component, run compmark, see the output.

## 1. Create the component

```vue
<!-- src/components/UserCard.vue -->
<script setup lang="ts">
/**
 * Displays a user profile card with avatar and actions.
 * @category Display
 * @version 1.0.0
 */
import { computed } from 'vue'

interface Props {
  /** User's full name */
  name: string
  /** Avatar image URL */
  avatar?: string
  /** User role badge */
  role?: 'admin' | 'editor' | 'viewer'
}

const props = defineProps<Props>()

defineEmits<{
  /** Fired when the card is clicked */
  click: [user: string]
  /** Fired when the edit button is pressed */
  edit: []
}>()

defineSlots<{
  /** Custom action buttons */
  actions(props: {}): any
}>()

/** User initials for fallback avatar */
const initials = computed(() =>
  props.name.split(' ').map(n => n[0]).join('')
)
</script>

<template>
  <div class="user-card" @click="$emit('click', name)">
    <img v-if="avatar" :src="avatar" :alt="name" />
    <span v-else>{{ initials }}</span>
    <h3>{{ name }}</h3>
    <slot name="actions" />
  </div>
</template>
```

## 2. Run compmark

```bash
npx compmark src/components/UserCard.vue --out docs/api
```

## 3. Generated output

`docs/api/UserCard.md`:

```markdown
# UserCard

Displays a user profile card with avatar and actions.

**Version:** 1.0.0

**Note:** Uses `<script setup>` syntax.

## Computed

| Name | Type | Description |
| --- | --- | --- |
| initials | string | User initials for fallback avatar |

## Props

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| name | string | Yes | - | User's full name |
| avatar | string | No | - | Avatar image URL |
| role | 'admin' \| 'editor' \| 'viewer' | No | - | User role badge |

## Emits

| Name | Payload | Description |
| --- | --- | --- |
| click | [user: string] | Fired when the card is clicked |
| edit | [] | Fired when the edit button is pressed |

## Slots

| Name | Bindings | Description |
| --- | --- | --- |
| actions | - | Custom action buttons |
```

## 4. Add to your workflow

```json
{
  "scripts": {
    "docs": "compmark src/components --out docs/api",
    "docs:watch": "compmark src/components --out docs/api --watch"
  }
}
```
