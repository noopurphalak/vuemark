<template>
  <div>{{ message }} - {{ fullName }}</div>
</template>

<script>
export default {
  props: {
    firstName: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      /** The greeting message */
      message: "Hello",
      count: 0,
      isActive: true,
      items: [],
      config: {},
      empty: null,
    };
  },
  computed: {
    /**
     * The full display name
     * @since 1.0.0
     */
    fullName() {
      return this.firstName + " Smith";
    },
    /** @deprecated Use totalItems instead */
    itemCount() {
      return this.items.length;
    },
    selectedItem: {
      get() {
        return this.items[0];
      },
      set(value) {
        this.items[0] = value;
      },
    },
  },
};
</script>
