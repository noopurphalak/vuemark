# CLI Reference

## Usage

```bash
compmark [paths...] [options]
```

If `paths` are omitted, compmark uses the `include` patterns from your config file.

## Options

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--out <DIR>` | string | `.` | Output directory |
| `--ignore <PATTERNS>` | string | - | Comma-separated ignore patterns |
| `--join` | boolean | `false` | Combine output into a single file |
| `--format <md\|json>` | string | `md` | Output format |
| `--watch` | boolean | `false` | Watch for changes and rebuild |
| `--silent` | boolean | `false` | Suppress non-error output |
| `--preserve-structure` | boolean | `false` | Preserve input folder structure in output |
| `--config <PATH>` | string | - | Path to config file |
| `--version` | - | - | Show version number |
| `--help` | - | - | Show help |

## Examples

### Document a single component

```bash
compmark src/components/Button.vue
```

### Document a directory

```bash
compmark src/components --out docs/api
```

### Use glob patterns

```bash
compmark "src/**/*.vue" --out docs
```

### Monorepo with multiple packages

```bash
compmark "packages/*/src/**/*.vue" --out docs/api --preserve-structure
```

### Combined output with JSON format

```bash
compmark src/components --out docs --join --format json
```

### Watch mode

```bash
compmark src/components --out docs/api --watch
```

### Ignore patterns

```bash
compmark src/components --ignore "*.test.vue,internal/**"
```

### Config-driven (no positional args)

```bash
# Uses include/exclude from compmark.config.ts
compmark
```

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Success (or watch mode running) |
| `1` | One or more files failed to parse |

## Aliases

Both `compmark` and `compmark-vue` are available:

```bash
npx compmark-vue src/components
```
