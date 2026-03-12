<template>
  <button>{{ label }}</button>
</template>

<script setup lang="ts">
import type { ButtonProps } from "./types/ButtonProps";

withDefaults(defineProps<ButtonProps>(), {
  disabled: false,
  size: "medium",
});
</script>
