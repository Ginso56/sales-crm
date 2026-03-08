<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useCalendarStore } from '@/stores/calendar';
import { useRouter } from 'vue-router';
import type { EventInput, CalendarOptions } from '@fullcalendar/core';

const calendarStore = useCalendarStore();
const router = useRouter();

const calendarOptions = ref<CalendarOptions>({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },
  events: [],
  eventClick: (info) => {
    const companyId = info.event.extendedProps.companyId as string;
    if (companyId) {
      router.push(`/companies/${companyId}`);
    }
  },
  datesSet: (dateInfo) => {
    loadEvents(dateInfo.startStr, dateInfo.endStr);
  },
  height: 'auto',
  eventDisplay: 'block',
});

async function loadEvents(start: string, end: string): Promise<void> {
  await calendarStore.fetchScheduledCalls(start, end);
  const colors = [
    '#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed',
    '#0891b2', '#be185d', '#65a30d',
  ];
  const userColorMap = new Map<string, string>();
  let colorIdx = 0;

  calendarOptions.value.events = calendarStore.scheduledCalls.map((call): EventInput => {
    if (!userColorMap.has(call.assignedTo)) {
      userColorMap.set(call.assignedTo, colors[colorIdx % colors.length]);
      colorIdx++;
    }
    const color = userColorMap.get(call.assignedTo) || '#4f46e5';
    return {
      id: call.id,
      title: `${call.title} - ${call.companyName}`,
      start: call.scheduledFor,
      backgroundColor: call.status === 'done' ? '#9ca3af' : color,
      borderColor: call.status === 'done' ? '#6b7280' : color,
      extendedProps: {
        companyId: call.companyId,
        assignedToName: call.assignedToName,
        status: call.status,
      },
    };
  });
}

onMounted(() => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  loadEvents(start, end);
});
</script>

<template>
  <div class="card">
    <FullCalendar :options="calendarOptions" />
  </div>
</template>
