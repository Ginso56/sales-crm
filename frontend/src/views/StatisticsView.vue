<script setup lang="ts">
import { onMounted, computed } from 'vue';
import DashboardShell from '@/components/layout/DashboardShell.vue';
import StatCard from '@/components/stats/StatCard.vue';
import GoalProgressBar from '@/components/stats/GoalProgressBar.vue';
import ActivityHeatmap from '@/components/stats/ActivityHeatmap.vue';
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue';
import { useAuthStore } from '@/stores/auth';
import { useStatsStore } from '@/stores/stats';
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const authStore = useAuthStore();
const statsStore = useStatsStore();

onMounted(async () => {
  if (authStore.userId) {
    await statsStore.fetchUserStats(authStore.userId);
  }
});

const stats = computed(() => statsStore.userStats);

const donutData = computed(() => ({
  labels: ['Zdvihnuté', 'Nezdvihnuté'],
  datasets: [
    {
      data: [stats.value?.answeredMonth || 0, stats.value?.noAnswerMonth || 0],
      backgroundColor: ['#22c55e', '#ef4444'],
      borderWidth: 0,
    },
  ],
}));
</script>

<template>
  <DashboardShell>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Štatistiky</h1>
      <p class="text-gray-500 mt-1">Prehľad vášho výkonu</p>
    </div>

    <div v-if="statsStore.loading">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SkeletonLoader v-for="i in 4" :key="i" type="card" />
      </div>
    </div>

    <template v-else-if="stats">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Hovory dnes" :value="stats.callsToday" color="primary" />
        <StatCard title="Hovory tento týždeň" :value="stats.callsWeek" color="green" />
        <StatCard title="Hovory tento mesiac" :value="stats.callsMonth" :previous-value="stats.callsPrevMonth" color="amber" />
        <StatCard title="Zásielky tento mesiac" :value="stats.shipmentsMonth" color="primary" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Úspešnosť hovorov</h3>
          <div class="max-w-[250px] mx-auto">
            <Doughnut :data="donutData" :options="{ responsive: true, plugins: { legend: { position: 'bottom' } }, cutout: '65%' }" />
          </div>
        </div>

        <div v-if="stats.currentGoal" class="card">
          <h3 class="text-lg font-semibold mb-4">Plnenie cieľov</h3>
          <div class="space-y-4">
            <GoalProgressBar label="Hovory" :current="stats.callsMonth" :target="stats.currentGoal.targetCalls" />
            <GoalProgressBar label="Noví klienti" :current="stats.companiesAddedMonth" :target="stats.currentGoal.targetNewClients" />
            <GoalProgressBar label="Zásielky" :current="stats.shipmentsMonth" :target="stats.currentGoal.targetShipments" />
          </div>
        </div>
      </div>

      <ActivityHeatmap :daily-calls="stats.dailyCalls" />
    </template>
  </DashboardShell>
</template>
