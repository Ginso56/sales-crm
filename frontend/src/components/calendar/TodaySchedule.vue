<script setup lang="ts">
import { onMounted } from 'vue';
import { useCalendarStore } from '@/stores/calendar';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import Button from '@/components/ui/Button.vue';
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue';

const calendarStore = useCalendarStore();
const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

onMounted(() => {
  calendarStore.fetchTodaySchedule();
});

function copyPhone(phone: string | null): void {
  if (!phone) return;
  navigator.clipboard.writeText(phone);
  toast.info('Telefón skopírovaný');
}

async function markDone(id: string): Promise<void> {
  await calendarStore.updateCallStatus(id, 'done');
  toast.success('Hovor označený ako vybavený');
}

function formatTime(dateStr: string): string {
  return new Intl.DateTimeFormat('sk-SK', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        DNESNE HOVORY
      </h3>
      <span class="text-sm text-gray-500">{{ calendarStore.todaySchedule.length }} čakajúcich</span>
    </div>

    <div v-if="calendarStore.loading">
      <SkeletonLoader type="text" :lines="3" />
    </div>

    <div v-else-if="calendarStore.todaySchedule.length === 0" class="text-center py-6">
      <svg class="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-gray-500 text-sm">Na dnes nie sú naplánované žiadne hovory</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="call in calendarStore.todaySchedule"
        :key="call.id"
        class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div class="flex-1 min-w-0">
          <p
            class="text-sm font-medium text-gray-900 cursor-pointer hover:text-primary-600"
            @click="router.push(`/companies/${call.companyId}`)"
          >
            {{ call.companyName }}
          </p>
          <div class="flex items-center gap-3 mt-1">
            <span class="text-xs text-gray-500">{{ formatTime(call.scheduledFor) }}</span>
            <button
              v-if="call.companyPhone"
              class="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1"
              @click.stop="copyPhone(call.companyPhone)"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {{ call.companyPhone }}
            </button>
          </div>
        </div>
        <Button size="sm" variant="success" @click="markDone(call.id)">Hotovo</Button>
      </div>
    </div>
  </div>
</template>
