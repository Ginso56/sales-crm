<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { LeaderboardEntry } from '@/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  data: LeaderboardEntry[];
}

const props = defineProps<Props>();

const chartData = computed(() => ({
  labels: props.data.map(d => d.name),
  datasets: [
    {
      label: 'Answered',
      data: props.data.map(d => d.answered),
      backgroundColor: '#22c55e',
    },
    {
      label: 'No Answer',
      data: props.data.map(d => d.noAnswer),
      backgroundColor: '#ef4444',
    },
  ],
}));

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { position: 'top' as const },
  },
  scales: {
    x: { stacked: true },
    y: { stacked: true, beginAtZero: true },
  },
};
</script>

<template>
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">Per-Salesman Performance</h3>
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
