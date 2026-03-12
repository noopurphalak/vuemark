<template><div /></template>
<script setup lang="ts">
import { useTestData } from "./composables/useTestData";

const {
  count,
  name,
  isActive,
  items,
  config,
  empty,
  total,
  state,
  fetchData,
  reset,
  label,
  limit,
} = useTestData();
</script>
