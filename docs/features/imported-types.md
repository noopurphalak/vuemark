# Imported Types

compmark resolves `defineProps<ImportedType>()` across files, following exports and interface inheritance.

## Basic imported type

```ts
// src/types/button.ts
export interface ButtonProps {
  /** The button label */
  label: string;
  /** Visual style variant */
  variant?: "primary" | "secondary" | "ghost";
  /** Whether the button is disabled */
  disabled?: boolean;
}
```

```vue
<script setup lang="ts">
import type { ButtonProps } from "@/types/button";

defineProps<ButtonProps>();
</script>
```

**Generated output:**

| Name     | Type                                | Required | Default | Description                    |
| -------- | ----------------------------------- | -------- | ------- | ------------------------------ |
| label    | string                              | Yes      | -       | The button label               |
| variant  | 'primary' \| 'secondary' \| 'ghost' | No       | -       | Visual style variant           |
| disabled | boolean                             | No       | -       | Whether the button is disabled |

## Interface extends

compmark follows `extends` chains up to 5 levels deep:

```ts
// src/types/base.ts
export interface BaseProps {
  /** Unique identifier */
  id: string;
  /** Additional CSS classes */
  class?: string;
}
```

```ts
// src/types/input.ts
import type { BaseProps } from "./base";

export interface InputProps extends BaseProps {
  /** Current input value */
  modelValue: string;
  /** Placeholder text */
  placeholder?: string;
}
```

```vue
<script setup lang="ts">
import type { InputProps } from "@/types/input";

defineProps<InputProps>();
</script>
```

All properties from `BaseProps` and `InputProps` are included in the output:

| Name        | Type   | Required | Default | Description            |
| ----------- | ------ | -------- | ------- | ---------------------- |
| id          | string | Yes      | -       | Unique identifier      |
| class       | string | No       | -       | Additional CSS classes |
| modelValue  | string | Yes      | -       | Current input value    |
| placeholder | string | No       | -       | Placeholder text       |

## Type aliases

Type aliases are also resolved:

```ts
export type Size = "sm" | "md" | "lg";

export type CardProps = {
  title: string;
  size?: Size;
};
```

## Import resolution

compmark resolves imports using:

1. **Relative paths** -- `./types`, `../shared/types`
2. **tsconfig paths** -- `@/types/button` via `compilerOptions.paths`
3. **Config aliases** -- Custom `aliases` in `compmark.config.ts`

See [Configuration](/guide/configuration) for alias setup.
