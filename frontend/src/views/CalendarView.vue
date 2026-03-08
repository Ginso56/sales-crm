<script setup lang="ts">
import DashboardShell from '@/components/layout/DashboardShell.vue';
import CalendarViewComponent from '@/components/calendar/CalendarView.vue';
</script>

<template>
  <DashboardShell>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Kalendár</h1>
      <p class="text-gray-500 mt-1">Zobrazenie a správa naplánovaných hovorov</p>
    </div>
    <CalendarViewComponent />
  </DashboardShell>
</template>
