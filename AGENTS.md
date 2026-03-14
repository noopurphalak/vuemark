Keep AGENTS.md updated with project status

Always use sub agents for complex tasks.

# compmark-vue

Auto-generate Markdown documentation from Vue 3 SFCs.

## Status

- **Version:** 0.4.0
- **Tests:** 140 passing (parser: 69, markdown: 29, CLI: 9, CLI-phase3: 16, discovery: 12, type-resolver: 5)

## Architecture

```
src/
  types.ts          — PropDoc, EmitDoc, SlotDoc, ExposeDoc, ComposableDoc, ComposableVariable, RefDoc, ComputedDoc, ComponentDoc, OutputFormat, RunSummary, DiscoveryResult interfaces
  parser.ts         — SFC parsing + AST extraction (core logic); ref/computed extraction, Options API data()/computed support
  resolver.ts       — Cross-file import resolution + composable source type inference
  type-resolver.ts  — Resolve defineProps<ImportedType>() across files
  markdown.ts       — Markdown table generation (refs, computed, props, emits, slots, exposed, composables) + adjustHeadingLevel
  discovery.ts      — File discovery (single file, directory, glob → absolute paths via tinyglobby); returns DiscoveryResult with ignoredCount and basePath
  runner.ts         — Multi-file processing loop, error collection
  output.ts         — Output modes (individual md, joined md, JSON); supports preserveStructure option and returns Map<source, output> paths
  watcher.ts        — Watch mode with fs.watch + debounce; incremental updates in individual mode, stale output cleanup
  index.ts          — Public library API (re-exports + parseComponent)
  cli.ts            — CLI entry point (citty-based, orchestrates full pipeline)
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

## v0.2.1–0.2.6 — Bugfixes & docs

- Fix template slot extraction for template-only components (no script content)
- `defineSlots` now fully overrides template slots (pure fallback, no merge)
- Escape pipe (`|`) characters in Markdown table cells (fixes broken tables for union types)
- Comprehensive README rewrite with examples for all features
- CLI test timeout increase for stability
- Fix for detecting Composable returned variables

## Phase 3 (v0.3.0) — Complete

- **Folder/glob support**: `compmark src/components --out docs/api` documents entire directories
- **File discovery** (`src/discovery.ts`): single files, directories, glob patterns via tinyglobby; always ignores node_modules
- **Multi-file processing** (`src/runner.ts`): per-file error handling, @internal skip, continues on failures
- **Output modes** (`src/output.ts`): individual `.md` (default), joined `components.md` with TOC (`--join`), JSON (`--format json`)
- **Joined markdown**: heading level adjustment, generated timestamp, table of contents with anchor links
- **JSON output**: individual `{name}.json` or wrapped `components.json` with `--join`
- **Duplicate component names**: automatic numeric suffix (`Button.md`, `Button-2.md`)
- **Watch mode** (`src/watcher.ts`): `--watch` flag, `fs.watch` recursive, 300ms debounce, SIGINT cleanup
- **Imported type resolution** (`src/type-resolver.ts`): `defineProps<ImportedType>()` with exported interfaces, type aliases, `extends` (depth limit 5)
- **CLI rewrite** (`src/cli.ts`): citty-based with `--out`, `--ignore`, `--join`, `--format`, `--watch`, `--silent`
- **Summary line**: `✓ N components documented, N skipped, N errors`
- **Exit codes**: 1 on errors (non-watch), 0 otherwise
- **Backward compat**: `compmark MyButton.vue` still works (single file, output to CWD)
- **Monorepo support**: `packages/*/src/**/*.vue` works natively as glob input
- **Bin alias**: `compmark-vue` added so `npx compmark-vue` works
- **Engine requirement**: `node >= 20` (for recursive `fs.watch`)
- **Dependencies**: citty (CLI parser), tinyglobby (glob matching)

## Phase 4 (v0.4.0) — Complete

- **Ref/computed extraction** (`src/parser.ts`): `ref()`, `shallowRef()`, `reactive()`, `shallowReactive()`, `computed()` from `<script setup>` with type inference (explicit annotation, generics, literal inference)
- **Options API data/computed** (`src/parser.ts`): `data()` returns → `RefDoc[]`, `computed` object → `ComputedDoc[]`
- **Markdown Refs & Computed sections** (`src/markdown.ts`): new sections before Props with Name/Type/Description tables, HTML escaping for generics, @deprecated/@since/@example/@see annotations
- **DiscoveryResult interface** (`src/types.ts`): `discoverFiles` now returns `{ files, ignoredCount, basePath }` instead of plain `string[]`
- **Ignored file counting** (`src/discovery.ts`): when user ignore patterns exist, runs glob twice to compute `ignoredCount`; computes `basePath` as common ancestor directory
- **`--preserve-structure` flag** (`src/cli.ts`): preserves input folder hierarchy in output directory
- **Output path mapping** (`src/output.ts`): `writeIndividualMarkdown` and `writeJSON` return `Map<string, string>` (source → output); support `preserveStructure` + `basePath` options for subdirectory creation
- **Summary line update**: skipped count now includes `ignoredCount` from discovery
- **Watch mode improvements** (`src/watcher.ts`): incremental updates in individual mode (only re-parse changed files), stale output cleanup when files are deleted or become `@internal`, `WatcherOptions` interface with `incrementalUpdate`/`removeOutput` callbacks
- **Component-level descriptions** (`src/parser.ts`): JSDoc on first statement (import or define call) is extracted as `doc.description`; `@component` tag for explicit marking when first statement is a variable

## Not yet implemented

- `defineModel` (Vue 3.4+)
- Config file
