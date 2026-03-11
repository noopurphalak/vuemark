<script setup lang="ts">
/**
 * @emit click Emitted on click
 * @emit change Emitted on change
 */
const emit = defineEmits(['click', 'change']);

const props = withDefaults(defineProps<{
  /** The visual theme */
  theme?: 'filled' | 'outline';
  /** HTML button type */
  type?: string;
  /** Whether it is disabled */
  disabled?: boolean;
  /** Item list */
  items?: object;
}>(), {
  theme: 'filled',
  type: 'button',
  disabled: false,
  items: () => ({}),
});
</script>

<template>
  <button>slot</button>
</template>
