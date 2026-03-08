import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/utils/api';
import type { CallLog } from '@/types';

export const useCallsStore = defineStore('calls', () => {
  const callLogs = ref<CallLog[]>([]);
  const todayCalls = ref<CallLog[]>([]);
  const loading = ref(false);

  async function fetchCallLogs(companyId: string): Promise<void> {
    loading.value = true;
    try {
      const response = await api.get(`/api/calls/${companyId}`);
      callLogs.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  async function logCall(data: {
    companyId: string;
    status: string;
    calledAt?: string;
    shipmentCount?: number;
    shipmentDestinations?: string[];
    shippingCompany?: string;
    notes?: string;
  }): Promise<CallLog> {
    const response = await api.post('/api/calls/log', data);
    // Optimistic: prepend to list
    callLogs.value.unshift(response.data);
    return response.data;
  }

  async function updateCall(callId: string, data: {
    notes?: string;
    shipmentCount?: number;
    shipmentDestinations?: string[];
    shippingCompany?: string;
  }): Promise<void> {
    await api.put(`/api/calls/${callId}`, data);
    const log = callLogs.value.find(l => l.id === callId);
    if (log) {
      if (data.notes !== undefined) log.notes = data.notes;
      if (data.shipmentCount !== undefined) log.shipmentCount = data.shipmentCount;
      if (data.shipmentDestinations !== undefined) log.shipmentDestinations = data.shipmentDestinations;
      if (data.shippingCompany !== undefined) log.shippingCompany = data.shippingCompany;
    }
  }

  async function fetchTodayCalls(userId: string): Promise<void> {
    loading.value = true;
    try {
      const response = await api.get(`/api/calls/today/${userId}`);
      todayCalls.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  return {
    callLogs,
    todayCalls,
    loading,
    fetchCallLogs,
    logCall,
    updateCall,
    fetchTodayCalls,
  };
});
