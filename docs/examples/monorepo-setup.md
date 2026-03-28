# Monorepo Setup

compmark supports glob patterns natively, making it straightforward to document components across a monorepo.

## Directory structure

```
my-monorepo/
  packages/
    ui/
      src/
        Button.vue
        Input.vue
    forms/
      src/
        DatePicker.vue
        Select.vue
    internal/
      src/
        DebugPanel.vue
```

## Document all packages

```bash
npx compmark "packages/*/src/**/*.vue" --out docs/api
```

This produces flat output in `docs/api/`:

```
docs/api/
  Button.md
  Input.md
  DatePicker.md
  Select.md
  DebugPanel.md
```

## Preserve folder structure

Use `--preserve-structure` to mirror the input hierarchy:

```bash
npx compmark "packages/*/src/**/*.vue" --out docs/api --preserve-structure
```

Output mirrors the source tree:

```
docs/api/
  packages/
    ui/src/
      Button.md
      Input.md
    forms/src/
      DatePicker.md
      Select.md
    internal/src/
      DebugPanel.md
```

## Exclude packages

Use `--ignore` to skip specific packages or patterns:

```bash
npx compmark "packages/*/src/**/*.vue" \
  --out docs/api \
  --preserve-structure \
  --ignore "packages/internal/**"
```

## Config file approach

For a permanent setup, create `compmark.config.ts` at the monorepo root:

```ts
export default {
  include: ['packages/*/src/**/*.vue'],
  exclude: [
    'packages/internal/**',
    '**/*.test.vue',
    '**/__fixtures__/**',
  ],
  outDir: 'docs/api',
  preserveStructure: true,
}
```

Then run with no arguments:

```bash
npx compmark
```

## Joined output

Combine all packages into a single file with a table of contents:

```bash
npx compmark "packages/*/src/**/*.vue" --out docs --join
```

This produces `docs/components.md` with a TOC and all component documentation concatenated under adjusted heading levels.

## Package.json scripts

```json
{
  "scripts": {
    "docs": "compmark",
    "docs:watch": "compmark --watch",
    "docs:json": "compmark --format json"
  }
}
```
