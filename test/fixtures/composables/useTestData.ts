import { ref, computed, reactive } from "vue";

export function useTestData() {
  const count = ref(0);
  const name = ref("hello");
  const isActive = ref(false);
  const items = ref([]);
  const config = ref({});
  const empty = ref(null);
  const total = computed(() => count.value * 2);
  const state = reactive({ loading: false });
  const fetchData = async (id, filter) => {
    return [];
  };
  const reset = () => {
    count.value = 0;
  };
  const label = "static";
  const limit = 100;

  return {
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
  };
}
