<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue';
import type { CallStatus } from '@/types';
import { CALL_STATUS_COLORS } from '@/types';

interface Props {
  status: CallStatus;
}

defineProps<Props>();

const labels: Record<CallStatus, string> = {
  answered: 'Answered',
  no_answer: 'No Answer',
  scheduled: 'Scheduled',
  callback: 'Callback',
};
</script>

<template>
  <Badge :color="CALL_STATUS_COLORS[status]" size="sm">
    {{ labels[status] }}
  </Badge>
</template>
