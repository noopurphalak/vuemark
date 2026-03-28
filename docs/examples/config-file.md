# Config File Examples

`compmark.config.ts` centralizes project settings. CLI flags override config values.

## Basic config

```ts
// compmark.config.ts
export default {
  include: ["src/components/**/*.vue"],
  exclude: ["**/*.test.vue"],
  outDir: "docs/api",
};
```

```bash
npx compmark
```

## With path aliases

compmark reads `tsconfig.json` paths automatically. Use `aliases` for additional or overriding mappings:

```ts
// compmark.config.ts
export default {
  include: ["src/**/*.vue"],
  outDir: "docs/api",
  aliases: {
    "@": "./src",
    "#shared": "./packages/shared/src",
  },
};
```

This allows cross-file type resolution for imports like `import type { Props } from '@/types'` and `import { useAuth } from '#shared/composables/useAuth'`.

## Custom section order

Control which sections appear and in what order:

```ts
// compmark.config.ts
export default {
  include: ["src/components/**/*.vue"],
  outDir: "docs/api",
  sectionOrder: ["props", "emits", "slots", "refs", "computed", "exposed", "composables"],
};
```

The default order is: `refs`, `computed`, `props`, `emits`, `slots`, `exposed`, `composables`.

Omit a key to hide that section entirely:

```ts
export default {
  // Only document the public API — no internal refs/computed
  sectionOrder: ["props", "emits", "slots", "exposed"],
};
```

## Category grouping with joined output

Use `@category` in components and `--join` to produce organized documentation:

```vue
<!-- src/components/Button.vue -->
<script setup lang="ts">
/**
 * Primary action button.
 * @category Forms
 */
defineProps<{ label: string }>();
</script>
```

```vue
<!-- src/components/Modal.vue -->
<script setup lang="ts">
/**
 * Dialog overlay.
 * @category Overlays
 */
defineProps<{ open: boolean }>();
</script>
```

```ts
// compmark.config.ts
export default {
  include: ["src/components/**/*.vue"],
  outDir: "docs",
  join: true,
};
```

The joined `docs/components.md` groups components by category with a table of contents.

## JSON output

```ts
// compmark.config.ts
export default {
  include: ["src/components/**/*.vue"],
  outDir: "docs/api",
  format: "json",
};
```

This produces individual `.json` files for each component. Combine with `join: true` to produce a single `components.json`.

## Watch mode in config

```ts
// compmark.config.ts
export default {
  include: ["src/components/**/*.vue"],
  outDir: "docs/api",
  watch: true,
  silent: true,
};
```

::: tip
CLI flags always override config values. Running `compmark --format json` with a config that says `format: 'md'` will produce JSON output.
:::

## Supported config file formats

compmark discovers config files in this order:

1. `--config <path>` flag (highest priority)
2. `compmark.config.{ts,js,mjs,cjs,json}`
3. `.compmarkrc` / `.compmarkrc.json`
