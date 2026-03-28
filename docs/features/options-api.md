# Options API

compmark supports the traditional `export default {}` syntax alongside `<script setup>`.

## Props and emits

```vue
<script>
export default {
  props: {
    /** The display title */
    title: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  emits: ["update", "close"],
};
</script>
```

**Generated output:**

### Props

| Name  | Type   | Required | Default | Description       |
| ----- | ------ | -------- | ------- | ----------------- |
| title | String | Yes      | -       | The display title |
| count | Number | No       | `0`     | -                 |

### Emits

| Name   | Description |
| ------ | ----------- |
| update | -           |
| close  | -           |

## Array props

```vue
<script>
export default {
  props: ["title", "count", "visible"],
};
</script>
```

Each prop is extracted with type `any` and `required: false`.

## Object emits

```vue
<script>
export default {
  emits: {
    click: null,
    submit: (payload) => typeof payload === "string",
  },
};
</script>
```

## data() and computed

```vue
<script>
export default {
  data() {
    return {
      /** Current counter value */
      count: 0,
      /** User display name */
      name: "Anonymous",
    };
  },
  computed: {
    /** Whether count is positive */
    isPositive() {
      return this.count > 0;
    },
    fullName: {
      get() {
        return this.name;
      },
      set(val) {
        this.name = val;
      },
    },
  },
};
</script>
```

**Generated output:**

### Refs

| Name  | Type   | Description           |
| ----- | ------ | --------------------- |
| count | number | Current counter value |
| name  | string | User display name     |

### Computed

| Name       | Type    | Description               |
| ---------- | ------- | ------------------------- |
| isPositive | unknown | Whether count is positive |
| fullName   | unknown | -                         |

::: tip
Options API `data()` properties appear under **Refs** and `computed` properties appear under **Computed**, matching the Composition API sections.
:::
