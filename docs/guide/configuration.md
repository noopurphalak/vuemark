# Configuration

compmark supports a config file for project-wide settings. CLI flags override config file values.

## Config File

Create `compmark.config.ts` (or `.js`, `.mjs`, `.json`) in your project root:

```ts
export default {
  // Glob patterns for input files
  include: ["src/components/**/*.vue"],

  // Glob patterns to ignore
  exclude: ["**/*.test.vue", "**/internal/**"],

  // Output directory
  outDir: "docs/api",

  // Output format: "md" or "json"
  format: "md",

  // Combine all components into a single file
  join: false,

  // Preserve input folder structure in output
  preserveStructure: false,

  // Path aliases (merged with tsconfig.json paths)
  aliases: {
    "@": "./src",
    "~": "./lib",
  },

  // Control section ordering in markdown output
  sectionOrder: ["props", "emits", "slots", "refs", "computed", "exposed", "composables"],

  // Suppress non-error output
  silent: false,

  // Watch mode
  watch: false,
};
```

## Config Discovery

compmark searches for config files in this order:

1. Explicit `--config <path>` flag (highest priority)
2. `compmark.config.{ts,js,mjs,cjs,json}` in CWD
3. `.compmarkrc` / `.compmarkrc.json` in CWD

If no config file is found, all defaults apply and CLI args are used.

## Options Reference

| Option              | Type                     | Default      | Description                   |
| ------------------- | ------------------------ | ------------ | ----------------------------- |
| `include`           | `string[]`               | -            | Glob patterns for input files |
| `exclude`           | `string[]`               | -            | Glob patterns to ignore       |
| `outDir`            | `string`                 | `"."`        | Output directory              |
| `format`            | `"md" \| "json"`         | `"md"`       | Output format                 |
| `join`              | `boolean`                | `false`      | Combine into single file      |
| `preserveStructure` | `boolean`                | `false`      | Mirror input folder tree      |
| `aliases`           | `Record<string, string>` | -            | Path aliases for imports      |
| `sectionOrder`      | `SectionKey[]`           | All sections | Section ordering              |
| `silent`            | `boolean`                | `false`      | Suppress output               |
| `watch`             | `boolean`                | `false`      | Watch mode                    |

## Section Order

The `sectionOrder` option controls which sections appear and in what order:

```ts
export default {
  // Only show props and emits, in this order
  sectionOrder: ["props", "emits"],
};
```

Available section keys: `refs`, `computed`, `props`, `emits`, `slots`, `exposed`, `composables`.

Omitting a section from the array hides it from the output.

## Path Aliases

compmark automatically reads `tsconfig.json` (or `jsconfig.json`) `compilerOptions.paths` from your project root. You can augment or override these with `config.aliases`:

```ts
export default {
  aliases: {
    "@": "./src", // overrides tsconfig @/* path
    "#utils": "./lib/utils", // additional alias
  },
};
```

Config aliases take precedence over tsconfig paths on conflict.

## CLI Override

All config options can be overridden with CLI flags:

```bash
# Config says format: "md", but use JSON for this run
compmark --format json

# Config says outDir: "docs", but output here
compmark --out ./tmp

# Use a specific config file
compmark --config ./configs/compmark.prod.ts
```
