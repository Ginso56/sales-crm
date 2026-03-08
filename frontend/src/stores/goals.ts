import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/utils/api';
import type { Goal } from '@/types';

export const useGoalsStore = defineStore('goals', () => {
  const goals = ref<Goal[]>([]);
  const loading = ref(false);

  async function fetchGoals(userId: string): Promise<void> {
    loading.value = true;
    try {
      const response = await api.get(`/api/goals/${userId}`);
      goals.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  async function createGoal(data: {
    userId: string;
    periodStart: string;
    periodEnd: string;
    targetCalls: number;
    targetNewClients: number;
    targetShipments: number;
  }): Promise<Goal> {
    const response = await api.post('/api/goals', data);
    goals.value.push(response.data);
    return response.data;
  }

  async function updateGoal(id: string, data: Partial<Goal>): Promise<void> {
    const response = await api.put(`/api/goals/${id}`, data);
    const idx = goals.value.findIndex(g => g.id === id);
    if (idx !== -1) {
      goals.value[idx] = response.data;
    }
  }

  return {
    goals,
    loading,
    fetchGoals,
    createGoal,
    updateGoal,
  };
});
