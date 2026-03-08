<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import DashboardShell from '@/components/layout/DashboardShell.vue';
import Leaderboard from '@/components/stats/Leaderboard.vue';
import PerformanceChart from '@/components/stats/PerformanceChart.vue';
import GoalProgressBar from '@/components/stats/GoalProgressBar.vue';
import StatCard from '@/components/stats/StatCard.vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Badge from '@/components/ui/Badge.vue';
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue';
import { useAuthStore } from '@/stores/auth';
import { useStatsStore } from '@/stores/stats';
import { useGoalsStore } from '@/stores/goals';
import { useToast } from '@/composables/useToast';
import api from '@/utils/api';
import type { User } from '@/types';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const authStore = useAuthStore();
const statsStore = useStatsStore();
const goalsStore = useGoalsStore();
const toast = useToast();

const showGoalModal = ref(false);
const selectedUserId = ref('');
const teamUsers = ref<User[]>([]);
const goalForm = ref({
  periodStart: '',
  periodEnd: '',
  targetCalls: 0,
  targetNewClients: 0,
  targetShipments: 0,
});

onMounted(async () => {
  if (authStore.userId) {
    await statsStore.fetchTeamStats(authStore.userId);
    const res = await api.get('/api/users');
    teamUsers.value = res.data.filter((u: User) =>
      u.supervisorId === authStore.userId || u.id === authStore.userId
    );
  }
});

const teamStats = computed(() => statsStore.teamStats);

const funnelData = computed(() => {
  if (!teamStats.value) return null;
  return {
    labels: ['New', 'Contacted', 'Interested', 'Closed'],
    datasets: [{
      label: 'Companies',
      data: [
        teamStats.value.funnel.new,
        teamStats.value.funnel.contacted,
        teamStats.value.funnel.interested,
        teamStats.value.funnel.closed,
      ],
      backgroundColor: ['#6366f1', '#eab308', '#22c55e', '#6b7280'],
    }],
  };
});

function openGoalModal(userId: string): void {
  selectedUserId.value = userId;
  const now = new Date();
  goalForm.value = {
    periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    targetCalls: 100,
    targetNewClients: 10,
    targetShipments: 20,
  };
  showGoalModal.value = true;
}

async function saveGoal(): Promise<void> {
  try {
    await goalsStore.createGoal({
      userId: selectedUserId.value,
      ...goalForm.value,
    });
    showGoalModal.value = false;
    toast.success('Goal created');
    if (authStore.userId) {
      await statsStore.fetchTeamStats(authStore.userId);
    }
  } catch {
    toast.error('Failed to create goal');
  }
}

async function handleExport(): Promise<void> {
  await statsStore.exportCsv();
  toast.success('CSV exported');
}
</script>

<template>
  <DashboardShell>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Team Overview</h1>
        <p class="text-gray-500 mt-1">Manage your team's performance</p>
      </div>
      <Button variant="secondary" @click="handleExport">
        Export CSV
      </Button>
    </div>

    <div v-if="statsStore.loading">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonLoader type="chart" />
        <SkeletonLoader type="chart" />
      </div>
    </div>

    <template v-else-if="teamStats">
      <!-- Leaderboard -->
      <div class="mb-6">
        <Leaderboard :entries="teamStats.leaderboard" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Performance Chart -->
        <PerformanceChart :data="teamStats.leaderboard" />

        <!-- Conversion Funnel -->
        <div v-if="funnelData" class="card">
          <h3 class="text-lg font-semibold mb-4">Conversion Funnel</h3>
          <Bar :data="funnelData" :options="{ responsive: true, plugins: { legend: { display: false } } }" />
        </div>
      </div>

      <!-- Goal Alerts -->
      <div class="card mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Goals</h3>
        </div>
        <div class="space-y-4">
          <div
            v-for="entry in teamStats.leaderboard"
            :key="entry.userId"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-gray-900">{{ entry.name }}</span>
              <Badge
                v-if="entry.goalPct !== null && entry.goalPct < 50"
                color="bg-red-100 text-red-800"
                size="sm"
              >
                Behind
              </Badge>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="entry.goalPct !== null" class="text-sm text-gray-600">{{ entry.goalPct }}%</span>
              <Button size="sm" variant="ghost" @click="openGoalModal(entry.userId)">Set Goal</Button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Goal Modal -->
    <Modal :open="showGoalModal" title="Set Goal" @close="showGoalModal = false">
      <form class="space-y-4" @submit.prevent="saveGoal">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
            <input v-model="goalForm.periodStart" type="date" class="input-field" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Period End</label>
            <input v-model="goalForm.periodEnd" type="date" class="input-field" required />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Target Calls</label>
          <input v-model.number="goalForm.targetCalls" type="number" class="input-field" min="0" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Target New Clients</label>
          <input v-model.number="goalForm.targetNewClients" type="number" class="input-field" min="0" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Target Shipments</label>
          <input v-model.number="goalForm.targetShipments" type="number" class="input-field" min="0" required />
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <Button variant="ghost" type="button" @click="showGoalModal = false">Cancel</Button>
          <Button type="submit">Save Goal</Button>
        </div>
      </form>
    </Modal>
  </DashboardShell>
</template>
