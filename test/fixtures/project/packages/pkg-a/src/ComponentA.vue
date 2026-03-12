<template>
  <div>{{ message }}</div>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>
