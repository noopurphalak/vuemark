Keep AGENTS.md updated with project status

# compmark-vue

Auto-generate Markdown documentation from Vue 3 SFCs.

## Status

- **Version:** 0.1.0 (Phase 1 complete)
- **Tests:** 28 passing (parser: 17, markdown: 6, CLI: 5)
- **Coverage:** 88% statements, 92% lines

## Architecture

```
src/
  types.ts      — PropDoc, EmitDoc, ComponentDoc interfaces
  parser.ts     — SFC parsing + AST extraction (core logic)
  markdown.ts   — Markdown table generation
  index.ts      — Public library API (re-exports + parseComponent)
  cli.ts        — CLI entry point (argv, file I/O, error messages)
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

## Not yet implemented

- `defineProps<Props>()` with imported/external interfaces (requires cross-file type resolution)
- Glob/folder support
- Watch mode
- Config file
- Non-Markdown output formats
