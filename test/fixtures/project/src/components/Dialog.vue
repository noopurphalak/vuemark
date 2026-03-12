<template>
  <div class="dialog" v-if="open">
    <slot name="header" />
    <slot />
    <slot name="footer" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** Whether the dialog is open */
  open: boolean;
  /** Dialog title */
  title?: string;
}>();

defineSlots<{
  /** The main content */
  default(props: {}): any;
  /** Header area */
  header(props: { title: string }): any;
  /** Footer area */
  footer(props: {}): any;
}>();
</script>
