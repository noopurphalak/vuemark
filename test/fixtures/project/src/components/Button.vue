<template>
  <button @click="$emit('click', $event)">{{ label }}</button>
</template>

<script setup lang="ts">
defineProps<{
  /** The button label */
  label: string;
  /** Whether the button is disabled */
  disabled?: boolean;
}>();

defineEmits<{
  click: [payload: MouseEvent];
}>();
</script>
