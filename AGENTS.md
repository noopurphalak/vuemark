Keep AGENTS.md updated with project status

# compmark-vue

Auto-generate Markdown documentation from Vue 3 SFCs.

## Status

- **Version:** 0.2.5
- **Tests:** 74 passing (parser: 43, markdown: 22, CLI: 9)
- **Coverage:** 70% statements, 75% lines (resolver.ts cross-file paths partially covered)

## Architecture

```
src/
  types.ts      — PropDoc, EmitDoc, SlotDoc, ExposeDoc, ComposableDoc, ComposableVariable, ComponentDoc interfaces
  parser.ts     — SFC parsing + AST extraction (core logic)
  resolver.ts   — Cross-file import resolution + composable source type inference
  markdown.ts   — Markdown table generation (props, emits, slots, exposed, composables)
  index.ts      — Public library API (re-exports + parseComponent)
  cli.ts        — CLI entry point (argv, file I/O, @internal skip)
```

## Phase 1 (v0.1.0) — Complete

- Parse `defineProps` (runtime syntax: shorthand, array type, full object)
- Parse `defineEmits` (array syntax)
- Extract JSDoc comments for props and emits
- Output `.md` file via CLI: `compmark-vue <path-to-component.vue>`
- Handles `const props = defineProps(...)` variable assignment pattern
- Default value stringification (literals, arrow functions)
- TypeScript generic `defineProps<T>()` with inline type literals
- `withDefaults(defineProps<T>(), {...})` support

## Phase 2 (v0.2.0) — Complete

- CLI renamed: `compmark-vue` → `compmark`
- TS generic `defineEmits<{...}>()` (property signature + call signature syntax)
- `defineSlots<{...}>()` with typed bindings
- Template `<slot>` extraction as fallback (`defineSlots` fully overrides when present)
- `defineExpose({...})` with JSDoc descriptions
- Composable detection (`use*` pattern) with variable extraction and cross-file type inference
- Composable variable bindings: destructured properties, simple assignments, array patterns, rest elements
- Cross-file type resolver (`src/resolver.ts`): follows imports to composable source, infers types from `ref()`, `computed()`, `reactive()`, function signatures, literals
- Import path resolution: relative paths, tsconfig/jsconfig alias paths (`@/...`)
- Markdown composable output: sub-heading per composable with Variable/Type tables, source attribution
- Enhanced JSDoc tags: `@deprecated`, `@since`, `@example`, `@see`, `@internal`
- Component-level `@internal` tag → CLI skips with message
- Options API support (`export default { props, emits }`)
- Options API array props and object emits (validation syntax)
- Markdown output: Slots, Exposed, Composables sections; Payload column for emits; @deprecated/@since/@example/@see annotations

## v0.2.1–0.2.5 — Bugfixes & docs

- Fix template slot extraction for template-only components (no script content)
- `defineSlots` now fully overrides template slots (pure fallback, no merge)
- Escape pipe (`|`) characters in Markdown table cells (fixes broken tables for union types)
- Comprehensive README rewrite with examples for all features
- CLI test timeout increase for stability

## Not yet implemented

- `defineProps<Props>()` with imported/external interfaces (requires cross-file type resolution)
- `defineModel` (Vue 3.4+)
- Glob/folder support
- Watch mode
- Config file
- Non-Markdown output formats
