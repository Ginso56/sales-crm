<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  dailyCalls: Array<{ date: string; count: number }>;
}

const props = defineProps<Props>();

interface DayCell {
  date: string;
  count: number;
  dayOfWeek: number;
  weekIndex: number;
}

const cells = computed<DayCell[]>(() => {
  const now = new Date();
  const result: DayCell[] = [];
  const callMap = new Map(props.dailyCalls.map(d => [d.date, d.count]));

  for (let i = 89; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const weekIndex = Math.floor((89 - i + ((new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89)).getDay())) / 7);
    result.push({
      date: dateStr,
      count: callMap.get(dateStr) || 0,
      dayOfWeek,
      weekIndex,
    });
  }
  return result;
});

const maxCount = computed(() => Math.max(1, ...cells.value.map(c => c.count)));

function getColor(count: number): string {
  if (count === 0) return '#ebedf0';
  const intensity = count / maxCount.value;
  if (intensity > 0.75) return '#216e39';
  if (intensity > 0.5) return '#30a14e';
  if (intensity > 0.25) return '#40c463';
  return '#9be9a8';
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('sk-SK', { month: 'short', day: 'numeric' }).format(new Date(dateStr));
}
</script>

<template>
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">Activity (Last 90 Days)</h3>
    <div class="overflow-x-auto">
      <svg :width="14 * 14" height="7 * 14 + 20" class="block">
        <g v-for="cell in cells" :key="cell.date">
          <rect
            :x="cell.weekIndex * 14"
            :y="cell.dayOfWeek * 14"
            width="11"
            height="11"
            rx="2"
            :fill="getColor(cell.count)"
            class="cursor-pointer"
          >
            <title>{{ formatDate(cell.date) }}: {{ cell.count }} calls</title>
          </rect>
        </g>
      </svg>
    </div>
    <div class="flex items-center gap-1 mt-2 text-xs text-gray-500">
      <span>Less</span>
      <svg v-for="(color, i) in ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']" :key="i" width="11" height="11">
        <rect width="11" height="11" rx="2" :fill="color" />
      </svg>
      <span>More</span>
    </div>
  </div>
</template>
