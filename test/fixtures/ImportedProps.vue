<template>
  <button>{{ label }}</button>
</template>

<script setup lang="ts">
import type { ButtonProps } from "./types/ButtonProps";

defineProps<ButtonProps>();
</script>
