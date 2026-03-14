<template>
  <div>{{ count }} - {{ fullName }}</div>
</template>

<script setup lang="ts">
import { ref, shallowRef, reactive, shallowReactive, computed, type Ref } from "vue";

/**
 * The counter value
 * @since 1.0.0
 */
const count = ref(0);

/** The user's name */
const name = ref<string>("");

const flag = ref(true);

const items = ref([]);

const config = ref({});

const empty = ref(null);

/** @deprecated Use shallowData instead */
const data = shallowRef<string[]>([]);

const state = reactive({ count: 0, name: "" });

const typedState = reactive<{ id: number; label: string }>();

const shallowState = shallowReactive({ items: [] });

/** The annotated ref with explicit type */
const annotated: Ref<string[]> = ref([]);

/**
 * The full display name
 * @since 2.0.0
 */
const fullName = computed(() => name.value + " Smith");

/** @deprecated Use totalItems instead */
const total = computed<number>(() => items.value.length);

const doubled = computed((): number => count.value * 2);

const plain = computed(() => "hello");
</script>
