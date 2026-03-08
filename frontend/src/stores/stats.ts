import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/utils/api';
import type { UserStats, TeamStats } from '@/types';

export const useStatsStore = defineStore('stats', () => {
  const userStats = ref<UserStats | null>(null);
  const teamStats = ref<TeamStats | null>(null);
  const overview = ref<{ totalCompanies: number; totalCallsMonth: number; totalAnsweredMonth: number; totalUsers: number } | null>(null);
  const loading = ref(false);

  async function fetchUserStats(userId: string): Promise<void> {
    loading.value = true;
    try {
      const response = await api.get(`/api/stats/user/${userId}`);
      userStats.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTeamStats(supervisorId: string): Promise<void> {
    loading.value = true;
    try {
      const response = await api.get(`/api/stats/team/${supervisorId}`);
      teamStats.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchOverview(): Promise<void> {
    loading.value = true;
    try {
      const response = await api.get('/api/stats/overview');
      overview.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  async function exportCsv(): Promise<void> {
    const response = await api.get('/api/stats/export/csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'team-stats.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return {
    userStats,
    teamStats,
    overview,
    loading,
    fetchUserStats,
    fetchTeamStats,
    fetchOverview,
    exportCsv,
  };
});
