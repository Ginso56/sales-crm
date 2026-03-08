<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCompaniesStore } from '@/stores/companies';
import { formatDateTime } from '@/utils/formatDate';
import type { CompanyHistory } from '@/types';

interface Props {
  companyId: string;
}

const props = defineProps<Props>();
const store = useCompaniesStore();
const loading = ref(true);

onMounted(async () => {
  await store.fetchHistory(props.companyId);
  loading.value = false;
});
</script>

<template>
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">Audit Log</h3>

    <div v-if="loading" class="space-y-4">
      <div v-for="i in 5" :key="i" class="animate-pulse flex gap-3">
        <div class="w-2 h-2 bg-gray-200 rounded-full mt-2 skeleton-pulse" />
        <div class="flex-1">
          <div class="h-3 bg-gray-200 rounded w-1/2 mb-2 skeleton-pulse" />
          <div class="h-3 bg-gray-200 rounded w-3/4 skeleton-pulse" />
        </div>
      </div>
    </div>

    <div v-else-if="store.history.length === 0" class="text-center py-8">
      <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-gray-500 text-sm">No changes recorded</p>
    </div>

    <div v-else class="relative">
      <div class="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />
      <div class="space-y-4">
        <div
          v-for="entry in store.history"
          :key="entry.id"
          class="relative pl-6"
        >
          <div class="absolute left-0 top-1.5 w-4 h-4 bg-primary-100 border-2 border-primary-500 rounded-full" />
          <div class="bg-gray-50 rounded-lg p-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-gray-900">{{ entry.changedByName }}</span>
              <span class="text-xs text-gray-500">{{ formatDateTime(entry.changedAt) }}</span>
            </div>
            <p class="text-sm text-gray-600">
              Changed <span class="font-medium">{{ entry.fieldName }}</span>
              <template v-if="entry.oldValue">
                from <span class="text-red-600 line-through">{{ entry.oldValue }}</span>
              </template>
              to <span class="text-green-600 font-medium">{{ entry.newValue }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
