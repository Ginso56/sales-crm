<script setup lang="ts">
interface Props {
  csvHeaders: string[];
  dbField: string;
  modelValue: string;
}

defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="text-sm font-medium w-28 text-gray-700">{{ dbField }}</span>
    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
    <select
      :value="modelValue"
      class="input-field flex-1"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">-- Skip --</option>
      <option v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</option>
    </select>
  </div>
</template>
