<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { Company, CompanyStatus } from '@/types';
import { STATUS_LABELS } from '@/types';

interface Props {
  companies: Company[];
  loading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  startIndex: number;
}

const props = withDefaults(defineProps<Props>(), {
  startIndex: 0,
});

const emit = defineEmits<{
  sort: [key: string];
}>();

const router = useRouter();

interface Col {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

const columns: Col[] = [
  { key: 'name', label: 'Firma', sortable: true, width: '200px' },
  { key: 'industry', label: 'Kategória', sortable: false, width: '140px' },
  { key: 'phone', label: 'Telefón', sortable: false, width: '130px' },
  { key: 'email', label: 'E-mail', sortable: false, width: '180px' },
  { key: 'website', label: 'Web', sortable: false, width: '160px' },
  { key: 'status', label: 'Status', sortable: true, width: '110px' },
  { key: 'country', label: 'Krajina', sortable: true, width: '70px' },
  { key: 'assignedName', label: 'Pridelený', sortable: false, width: '120px' },
];

function handleSort(col: Col): void {
  if (col.sortable) emit('sort', col.key);
}

function handleRowClick(company: Company): void {
  router.push(`/companies/${company.id}`);
}

function cleanUrl(url: string | null): string {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}
</script>

<template>
  <div class="spreadsheet-wrap">
    <div class="overflow-auto" style="max-height: calc(100vh - 200px);">
      <table>
        <thead>
          <tr>
            <th class="row-num">#</th>
            <th
              v-for="col in columns"
              :key="col.key"
              :style="{ width: col.width, minWidth: col.width }"
              :class="{ 'cursor-pointer hover:bg-gray-200': col.sortable }"
              @click="handleSort(col)"
            >
              <div class="flex items-center gap-1">
                {{ col.label }}
                <template v-if="col.sortable && sortBy === col.key">
                  <svg v-if="sortOrder === 'asc'" class="w-3 h-3 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
                  </svg>
                  <svg v-else class="w-3 h-3 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
                  </svg>
                </template>
                <svg v-else-if="col.sortable" class="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </div>
            </th>
            <th style="width:28px; min-width:28px;" title="Priority">
              <svg class="w-3 h-3 text-gray-400 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd" />
              </svg>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading skeleton -->
          <template v-if="loading">
            <tr v-for="i in 20" :key="'sk-' + i">
              <td class="row-num">
                <div class="h-3 w-5 bg-gray-200 rounded skeleton-pulse mx-auto" />
              </td>
              <td v-for="col in columns" :key="col.key">
                <div class="h-3 bg-gray-200 rounded skeleton-pulse" :style="{ width: Math.random() * 40 + 50 + '%' }" />
              </td>
              <td><div class="h-3 w-3 bg-gray-200 rounded-full skeleton-pulse mx-auto" /></td>
            </tr>
          </template>

          <!-- Data rows -->
          <template v-else>
            <tr
              v-for="(company, idx) in companies"
              :key="company.id"
              class="cursor-pointer"
              :class="{ 'row-priority': company.priorityFollowup }"
              @click="handleRowClick(company)"
            >
              <td class="row-num">{{ startIndex + idx + 1 }}</td>
              <td class="font-medium text-gray-900" :title="company.name">{{ company.name }}</td>
              <td class="text-gray-500" :title="company.industry || ''">{{ company.industry || '' }}</td>
              <td class="text-gray-600 font-mono" style="font-size:11px" :title="company.phone || ''">{{ company.phone || '' }}</td>
              <td class="text-gray-600" :title="company.email || ''">{{ company.email || '' }}</td>
              <td class="text-blue-600" :title="company.website || ''">
                <span v-if="company.website" class="hover:underline">{{ cleanUrl(company.website) }}</span>
              </td>
              <td>
                <span class="inline-flex items-center">
                  <span class="status-dot" :class="company.status" />
                  <span class="text-gray-700">{{ STATUS_LABELS[company.status as CompanyStatus] || company.status }}</span>
                </span>
              </td>
              <td class="text-gray-500">{{ company.country || '' }}</td>
              <td class="text-gray-500">{{ company.assignedName || '' }}</td>
              <td class="text-center">
                <svg v-if="company.priorityFollowup" class="w-3.5 h-3.5 text-orange-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd" />
                </svg>
              </td>
            </tr>
          </template>

          <!-- Empty state -->
          <tr v-if="!loading && companies.length === 0">
            <td :colspan="columns.length + 2" class="text-center py-10 text-gray-400 text-sm">
              Ziadne firmy sa nenasli
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
