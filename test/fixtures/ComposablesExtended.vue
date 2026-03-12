<template><div /></template>
<script setup lang="ts">
import { useRouter } from "vue-router";
import { useMouse } from "@vueuse/core";
import { useDataLoader } from "./composables/useDataLoader";

const router: Router = useRouter();
const { x, y } = useMouse();
const [count, setCount] = useCounter();
useHead({ title: "Home" });
const { fetchAll, ...rest } = useDataLoader();
</script>
