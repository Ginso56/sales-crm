import { useStatsStore } from '@/stores/stats';

export function useStats() {
  const store = useStatsStore();

  return {
    fetchUserStats: store.fetchUserStats,
    fetchTeamStats: store.fetchTeamStats,
    fetchOverview: store.fetchOverview,
    exportCsv: store.exportCsv,
    userStats: store.userStats,
    teamStats: store.teamStats,
    overview: store.overview,
    loading: store.loading,
  };
}
