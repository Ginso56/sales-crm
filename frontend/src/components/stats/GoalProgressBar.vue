<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label: string;
  current: number;
  target: number;
}

const props = defineProps<Props>();

const percentage = computed(() => {
  if (props.target <= 0) return 0;
  return Math.min(100, Math.round((props.current / props.target) * 100));
});

const colorClass = computed(() => {
  if (percentage.value >= 75) return 'bg-green-500';
  if (percentage.value >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
});
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <span class="text-sm font-medium text-gray-700">{{ label }}</span>
      <span class="text-sm text-gray-500">{{ current }} / {{ target }}</span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2.5">
      <div
        :class="['h-2.5 rounded-full transition-all duration-500', colorClass]"
        :style="{ width: `${percentage}%` }"
      />
    </div>
    <p class="text-xs text-gray-500 mt-0.5 text-right">{{ percentage }}%</p>
  </div>
</template>
