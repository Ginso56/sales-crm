import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/utils/api';
import type { ScheduledCall } from '@/types';

export const useCalendarStore = defineStore('calendar', () => {
  const scheduledCalls = ref<ScheduledCall[]>([]);
  const todaySchedule = ref<ScheduledCall[]>([]);
  const loading = ref(false);

  async function fetchScheduledCalls(start?: string, end?: string): Promise<void> {
    loading.value = true;
    try {
      const params: Record<string, string> = {};
      if (start) params.start = start;
      if (end) params.end = end;
      const response = await api.get('/api/calendar/scheduled', { params });
      scheduledCalls.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTodaySchedule(): Promise<void> {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
    await fetchScheduledCalls(start, end);
    todaySchedule.value = scheduledCalls.value.filter(c => c.status === 'pending');
  }

  async function scheduleCall(data: {
    companyId: string;
    assignedTo: string;
    scheduledFor: string;
    title: string;
  }): Promise<ScheduledCall> {
    const response = await api.post('/api/calendar/schedule', data);
    scheduledCalls.value.unshift(response.data);
    return response.data;
  }

  async function updateCallStatus(id: string, status: 'pending' | 'done' | 'cancelled'): Promise<void> {
    await api.put(`/api/calendar/${id}/status`, { status });
    const idx = scheduledCalls.value.findIndex(c => c.id === id);
    if (idx !== -1) {
      scheduledCalls.value[idx].status = status;
    }
    const tidx = todaySchedule.value.findIndex(c => c.id === id);
    if (tidx !== -1) {
      if (status !== 'pending') {
        todaySchedule.value.splice(tidx, 1);
      }
    }
  }

  return {
    scheduledCalls,
    todaySchedule,
    loading,
    fetchScheduledCalls,
    fetchTodaySchedule,
    scheduleCall,
    updateCallStatus,
  };
});
