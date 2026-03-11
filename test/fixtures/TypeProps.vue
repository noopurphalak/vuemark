<script setup lang="ts">
defineProps<{
  /** The visual theme */
  theme?: 'filled' | 'outline';
  /** HTML button type */
  type?: string;
  /** Whether the button is disabled */
  disabled: boolean;
  /** Number of items */
  count?: number;
  /** Extra CSS classes */
  classes?: string[];
}>();
</script>

<template>
  <button>slot</button>
</template>
