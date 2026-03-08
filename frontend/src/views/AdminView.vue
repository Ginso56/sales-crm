<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import DashboardShell from '@/components/layout/DashboardShell.vue';
import UserManagement from '@/components/admin/UserManagement.vue';
import CsvImporter from '@/components/admin/CsvImporter.vue';
import Leaderboard from '@/components/stats/Leaderboard.vue';
import PerformanceChart from '@/components/stats/PerformanceChart.vue';
import StatCard from '@/components/stats/StatCard.vue';
import Button from '@/components/ui/Button.vue';
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue';
import { useAuthStore } from '@/stores/auth';
import { useStatsStore } from '@/stores/stats';

const authStore = useAuthStore();
const statsStore = useStatsStore();

const activeTab = ref<'overview' | 'users' | 'import'>('overview');

onMounted(async () => {
  await Promise.all([
    statsStore.fetchOverview(),
    authStore.userId ? statsStore.fetchTeamStats(authStore.userId) : Promise.resolve(),
  ]);
});

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Users' },
  { key: 'import', label: 'CSV Import' },
] as const;

async function handleExport(): Promise<void> {
  await statsStore.exportCsv();
}
</script>

<template>
  <DashboardShell>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p class="text-gray-500 mt-1">System administration</p>
      </div>
      <Button variant="secondary" @click="handleExport">Export Team CSV</Button>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex gap-6">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="[
            'pb-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === tab.key
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700',
          ]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview'">
      <div v-if="statsStore.loading">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SkeletonLoader v-for="i in 4" :key="i" type="card" />
        </div>
      </div>
      <template v-else-if="statsStore.overview">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Companies" :value="statsStore.overview.totalCompanies" color="primary" />
          <StatCard title="Calls This Month" :value="statsStore.overview.totalCallsMonth" color="green" />
          <StatCard title="Answered This Month" :value="statsStore.overview.totalAnsweredMonth" color="amber" />
          <StatCard title="Total Users" :value="statsStore.overview.totalUsers" color="primary" />
        </div>

        <div v-if="statsStore.teamStats" class="space-y-6">
          <Leaderboard :entries="statsStore.teamStats.leaderboard" />
          <PerformanceChart :data="statsStore.teamStats.leaderboard" />
        </div>
      </template>
    </div>

    <!-- Users Tab -->
    <div v-if="activeTab === 'users'">
      <UserManagement />
    </div>

    <!-- Import Tab -->
    <div v-if="activeTab === 'import'">
      <CsvImporter />
    </div>
  </DashboardShell>
</template>
