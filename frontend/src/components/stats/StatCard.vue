<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  value: number | string;
  previousValue?: number;
  icon?: string;
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  previousValue: 0,
  icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  color: 'primary',
});

const trend = computed(() => {
  if (!props.previousValue || typeof props.value !== 'number') return null;
  const diff = props.value - props.previousValue;
  const pct = props.previousValue > 0 ? Math.round((diff / props.previousValue) * 100) : 0;
  return { diff, pct, up: diff >= 0 };
});

const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-600', iconBg: 'bg-primary-100' },
  green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
  red: { bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-100' },
};
</script>

<template>
  <div class="card">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm font-medium text-gray-500">{{ title }}</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ value }}</p>
        <div v-if="trend" class="flex items-center gap-1 mt-1">
          <svg
            :class="[trend.up ? 'text-green-500' : 'text-red-500', 'w-4 h-4']"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              :d="trend.up ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'"
            />
          </svg>
          <span :class="[trend.up ? 'text-green-600' : 'text-red-600', 'text-xs font-medium']">
            {{ trend.pct }}%
          </span>
          <span class="text-xs text-gray-500">vs last period</span>
        </div>
      </div>
      <div :class="[colorMap[color]?.iconBg || 'bg-primary-100', 'p-2.5 rounded-xl']">
        <svg :class="[colorMap[color]?.text || 'text-primary-600', 'w-5 h-5']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icon" />
        </svg>
      </div>
    </div>
  </div>
</template>
