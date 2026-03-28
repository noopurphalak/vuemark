# Supported Syntax

compmark supports all common Vue 3 SFC patterns.

## Script Setup (Composition API)

### defineProps

- Runtime syntax: `defineProps({ name: String })`
- Array type: `defineProps({ name: [String, Number] })`
- Full object: `defineProps({ name: { type: String, required: true, default: 'hi' } })`
- TypeScript generic: `defineProps<{ name: string }>()`
- withDefaults: `withDefaults(defineProps<Props>(), { ... })`
- Imported types: `defineProps<ImportedType>()` with cross-file resolution
- Variable assignment: `const props = defineProps(...)`

### defineEmits

- Array syntax: `defineEmits(['click', 'hover'])`
- TS generic (property): `defineEmits<{ click: [e: MouseEvent] }>()`
- TS generic (call): `defineEmits<{ (e: 'click', value: number): void }>()`

### defineSlots

- TS generic: `defineSlots<{ default(props: { item: T }): any }>()`
- Falls back to template `<slot>` extraction when `defineSlots` is absent

### defineExpose

- Object syntax: `defineExpose({ reset, validate })`
- JSDoc descriptions on exposed members

### Composables

- Detects `use*()` pattern calls
- Tracks destructured variables: `const { data, error } = useFetch()`
- Cross-file type inference via import resolution

### Refs & Computed

- `ref()`, `shallowRef()`, `reactive()`, `shallowReactive()`
- `computed()`
- Type inference from explicit generics, annotations, and literal values

## Options API

- `export default { props: { ... }, emits: [...] }`
- `data()` return properties
- `computed` object (function and get/set syntax)
- Array props: `props: ['title', 'count']`
- Object emits: `emits: { click: null, submit: (payload) => true }`

## JSDoc Tags

| Tag | Scope | Description |
| --- | --- | --- |
| `@deprecated [reason]` | Props, refs, computed, component | Marks as deprecated with optional reason |
| `@since <version>` | Props, refs, computed | Version when added |
| `@example <text>` | Props, refs, computed | Usage example |
| `@see <reference>` | Props, refs, computed | Cross-reference |
| `@default <value>` | Props | Override default value display |
| `@internal` | Component | Exclude from documentation |
| `@component` | Component | Explicit component-level JSDoc marker |
| `@category <name>` | Component | Group in joined output |
| `@version <version>` | Component | Component version badge |
| `@emit <name> <desc>` | Emits (array syntax) | Describe individual emit events |

## Template Slots

When `defineSlots` is not used, compmark extracts slots from `<template>`:

```vue
<template>
  <div>
    <slot name="header"></slot>
    <slot :item="current"></slot>
  </div>
</template>
```

`defineSlots` fully overrides template slot extraction when present.
