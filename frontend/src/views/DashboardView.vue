<script setup lang="ts">
import { onMounted, computed } from 'vue';
import DashboardShell from '@/components/layout/DashboardShell.vue';
import StatCard from '@/components/stats/StatCard.vue';
import GoalProgressBar from '@/components/stats/GoalProgressBar.vue';
import ActivityHeatmap from '@/components/stats/ActivityHeatmap.vue';
import TodaySchedule from '@/components/calendar/TodaySchedule.vue';
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
  labels: ['Answered', 'No Answer'],
  datasets: [
    {
      data: [stats.value?.answeredMonth || 0, stats.value?.noAnswerMonth || 0],
      backgroundColor: ['#22c55e', '#ef4444'],
      borderWidth: 0,
    },
  ],
}));

const donutOptions = {
  responsive: true,
  plugins: {
    legend: { position: 'bottom' as const },
  },
  cutout: '65%',
};

const goalBehind = computed(() => {
  if (!stats.value?.currentGoal) return false;
  const goal = stats.value.currentGoal;
  const start = new Date(goal.periodStart).getTime();
  const end = new Date(goal.periodEnd).getTime();
  const now = Date.now();
  const elapsed = (now - start) / (end - start);
  if (elapsed < 0.5) return false;
  const callPct = goal.targetCalls > 0 ? stats.value.callsMonth / goal.targetCalls : 1;
  return callPct < 0.5;
});
</script>

<template>
  <DashboardShell>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="text-gray-500 mt-1">Welcome back, {{ authStore.userName }}</p>
    </div>

    <div v-if="statsStore.loading">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SkeletonLoader v-for="i in 4" :key="i" type="card" />
      </div>
    </div>

    <template v-else-if="stats">
      <!-- Goal alert -->
      <div v-if="goalBehind" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
        <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p class="text-sm text-red-800 font-medium">You are behind on your goals! Less than 50% completed past the midpoint.</p>
      </div>

      <!-- Stat Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Calls Today"
          :value="stats.callsToday"
          icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          color="primary"
        />
        <StatCard
          title="Calls This Week"
          :value="stats.callsWeek"
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          color="green"
        />
        <StatCard
          title="Calls This Month"
          :value="stats.callsMonth"
          :previous-value="stats.callsPrevMonth"
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          color="amber"
        />
        <StatCard
          title="Companies Added"
          :value="stats.companiesAddedMonth"
          icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          color="primary"
        />
      </div>

      <!-- Charts and Schedule Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Donut Chart -->
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Answer Rate</h3>
          <div class="max-w-[250px] mx-auto">
            <Doughnut :data="donutData" :options="donutOptions" />
          </div>
          <p class="text-center text-sm text-gray-500 mt-3">
            {{ stats.answeredMonth + stats.noAnswerMonth > 0 ? Math.round(stats.answeredMonth / (stats.answeredMonth + stats.noAnswerMonth) * 100) : 0 }}% answer rate
          </p>
        </div>

        <!-- Today's Schedule -->
        <div class="lg:col-span-2">
          <TodaySchedule />
        </div>
      </div>

      <!-- Goals -->
      <div v-if="stats.currentGoal" class="card mb-6">
        <h3 class="text-lg font-semibold mb-4">Goal Progress</h3>
        <div class="space-y-4">
          <GoalProgressBar
            label="Calls"
            :current="stats.callsMonth"
            :target="stats.currentGoal.targetCalls"
          />
          <GoalProgressBar
            label="New Clients"
            :current="stats.companiesAddedMonth"
            :target="stats.currentGoal.targetNewClients"
          />
          <GoalProgressBar
            label="Shipments"
            :current="stats.shipmentsMonth"
            :target="stats.currentGoal.targetShipments"
          />
        </div>
      </div>

      <!-- Activity Heatmap -->
      <ActivityHeatmap :daily-calls="stats.dailyCalls" />
    </template>
  </DashboardShell>
</template>
