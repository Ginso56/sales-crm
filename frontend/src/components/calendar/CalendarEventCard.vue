<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue';
import { formatDateTime } from '@/utils/formatDate';
import type { ScheduledCall } from '@/types';

interface Props {
  event: ScheduledCall;
}

defineProps<Props>();

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};
</script>

<template>
  <div class="p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
    <div class="flex items-center justify-between mb-1">
      <span class="text-sm font-medium text-gray-900">{{ event.title }}</span>
      <Badge :color="statusColors[event.status]" size="sm">{{ event.status }}</Badge>
    </div>
    <p class="text-xs text-gray-600">{{ event.companyName }}</p>
    <p class="text-xs text-gray-500 mt-1">{{ formatDateTime(event.scheduledFor) }}</p>
    <p class="text-xs text-gray-400">Assigned: {{ event.assignedToName }}</p>
  </div>
</template>
