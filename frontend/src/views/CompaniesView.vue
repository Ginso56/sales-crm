<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import DashboardShell from '@/components/layout/DashboardShell.vue';
import CompanyTable from '@/components/companies/CompanyTable.vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import { useCompaniesStore } from '@/stores/companies';
import { useCompany } from '@/composables/useCompany';
import { useAuthStore } from '@/stores/auth';
import api from '@/utils/api';
import type { User, CompanyStatus } from '@/types';

const companiesStore = useCompaniesStore();
const { createCompany } = useCompany();
const authStore = useAuthStore();

const search = ref('');
const statusFilter = ref('');
const industryFilter = ref('');
const countryFilter = ref('');
const assignedFilter = ref('');
const priorityFilter = ref('');
const sortBy = ref('industry');
const sortOrder = ref<'asc' | 'desc'>('asc');
const currentPage = ref(1);
const pageSize = ref(100);
const showCreateModal = ref(false);
const showFilters = ref(true);
const users = ref<User[]>([]);

const newCompany = ref({
  name: '',
  phone: '',
  email: '',
  website: '',
  country: '',
  industry: '',
});

onMounted(async () => {
  await Promise.all([
    fetchData(),
    companiesStore.fetchFilterOptions(),
  ]);
  if (authStore.hasRole('admin', 'supervisor')) {
    const res = await api.get('/api/users');
    users.value = res.data;
  }
});

async function fetchData(): Promise<void> {
  await companiesStore.fetchCompanies({
    page: currentPage.value,
    limit: pageSize.value,
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    industry: industryFilter.value || undefined,
    country: countryFilter.value || undefined,
    assignedTo: assignedFilter.value || undefined,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
  });
}

function handleSort(key: string): void {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    sortOrder.value = 'asc';
  }
  fetchData();
}

function goToPage(page: number): void {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchData();
}

function clearFilters(): void {
  search.value = '';
  statusFilter.value = '';
  industryFilter.value = '';
  countryFilter.value = '';
  assignedFilter.value = '';
  priorityFilter.value = '';
  currentPage.value = 1;
  fetchData();
}

const hasActiveFilters = computed(() =>
  !!(search.value || statusFilter.value || industryFilter.value || countryFilter.value || assignedFilter.value || priorityFilter.value)
);

let searchTimeout: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchData();
  }, 300);
});

watch([statusFilter, industryFilter, countryFilter, assignedFilter, priorityFilter], () => {
  currentPage.value = 1;
  fetchData();
});

watch(pageSize, () => {
  currentPage.value = 1;
  fetchData();
});

async function handleCreate(): Promise<void> {
  const result = await createCompany(newCompany.value);
  if (result) {
    showCreateModal.value = false;
    newCompany.value = { name: '', phone: '', email: '', website: '', country: '', industry: '' };
    await fetchData();
  }
}

const total = computed(() => companiesStore.pagination.total);
const totalPages = computed(() => companiesStore.pagination.totalPages);
const startIndex = computed(() => (currentPage.value - 1) * pageSize.value);
const rangeStart = computed(() => total.value === 0 ? 0 : startIndex.value + 1);
const rangeEnd = computed(() => Math.min(startIndex.value + pageSize.value, total.value));

const visiblePages = computed(() => {
  const pages: (number | '...')[] = [];
  const tp = totalPages.value;
  if (tp <= 9) {
    for (let i = 1; i <= tp; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  const start = Math.max(2, currentPage.value - 2);
  const end = Math.min(tp - 1, currentPage.value + 2);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < tp - 1) pages.push('...');
  pages.push(tp);
  return pages;
});

const statuses: CompanyStatus[] = ['new', 'contacted', 'interested', 'not_interested', 'closed'];
const statusLabels: Record<CompanyStatus, string> = {
  new: 'Nový',
  contacted: 'Kontaktovaný',
  interested: 'Má záujem',
  not_interested: 'Nemá záujem',
  closed: 'Zatvorený',
};
</script>

<template>
  <DashboardShell>
    <!-- Top bar -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-bold text-gray-900">Firmy</h1>
        <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
          {{ total.toLocaleString() }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors"
          :class="showFilters ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="showFilters = !showFilters"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtre
          <span v-if="hasActiveFilters" class="w-1.5 h-1.5 rounded-full bg-primary-500" />
        </button>
        <Button size="sm" @click="showCreateModal = true">+ Pridať firmu</Button>
      </div>
    </div>

    <!-- Filters panel -->
    <div
      v-show="showFilters"
      class="bg-white border border-gray-200 rounded-lg p-3 mb-3 space-y-2"
    >
      <!-- Row 1: search + quick filters -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative flex-shrink-0">
          <svg class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Hľadať firmu, telefón, email..."
            class="input-field-sm pl-8 w-56"
          />
        </div>

        <!-- Category / Industry -->
        <select v-model="industryFilter" class="input-field-sm w-44">
          <option value="">Všetky kategórie</option>
          <option v-for="ind in companiesStore.filterOptions.industries" :key="ind" :value="ind">
            {{ ind }}
          </option>
        </select>

        <!-- Status -->
        <select v-model="statusFilter" class="input-field-sm w-36">
          <option value="">Všetky statusy</option>
          <option v-for="s in statuses" :key="s" :value="s">
            {{ statusLabels[s] }}
          </option>
        </select>

        <!-- Country -->
        <select v-model="countryFilter" class="input-field-sm w-28">
          <option value="">Krajina</option>
          <option v-for="c in companiesStore.filterOptions.countries" :key="c" :value="c">
            {{ c }}
          </option>
        </select>

        <!-- Assigned -->
        <select v-if="authStore.hasRole('admin', 'supervisor')" v-model="assignedFilter" class="input-field-sm w-40">
          <option value="">Všetci predajcovia</option>
          <option v-for="u in users.filter(u => u.role === 'salesman' || u.role === 'supervisor')" :key="u.id" :value="u.id">
            {{ u.name }}
          </option>
        </select>

        <!-- Clear filters -->
        <button
          v-if="hasActiveFilters"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
          @click="clearFilters"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Zrušiť filtre
        </button>

        <!-- Spacer + rows per page -->
        <div class="ml-auto flex items-center gap-2 flex-shrink-0">
          <span class="text-xs text-gray-400">Riadkov:</span>
          <select v-model="pageSize" class="input-field-sm w-16 text-center">
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="200">200</option>
            <option :value="500">500</option>
          </select>
        </div>
      </div>

      <!-- Active filter chips -->
      <div v-if="hasActiveFilters" class="flex flex-wrap gap-1.5">
        <span v-if="search" class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
          Hľadanie: "{{ search }}"
          <button class="hover:text-blue-900" @click="search = ''">&times;</button>
        </span>
        <span v-if="industryFilter" class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
          {{ industryFilter }}
          <button class="hover:text-purple-900" @click="industryFilter = ''">&times;</button>
        </span>
        <span v-if="statusFilter" class="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
          {{ statusLabels[statusFilter as CompanyStatus] }}
          <button class="hover:text-green-900" @click="statusFilter = ''">&times;</button>
        </span>
        <span v-if="countryFilter" class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
          {{ countryFilter }}
          <button class="hover:text-amber-900" @click="countryFilter = ''">&times;</button>
        </span>
        <span v-if="assignedFilter" class="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">
          {{ users.find(u => u.id === assignedFilter)?.name }}
          <button class="hover:text-indigo-900" @click="assignedFilter = ''">&times;</button>
        </span>
      </div>
    </div>

    <!-- Spreadsheet table -->
    <CompanyTable
      :companies="companiesStore.companies"
      :loading="companiesStore.loading"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :start-index="startIndex"
      @sort="handleSort"
    />

    <!-- Pagination bar -->
    <div class="flex items-center justify-between mt-2 px-1">
      <span class="text-xs text-gray-500">
        {{ rangeStart.toLocaleString() }}–{{ rangeEnd.toLocaleString() }} z {{ total.toLocaleString() }}
      </span>
      <div v-if="totalPages > 1" class="flex items-center gap-0.5">
        <button
          class="px-1.5 py-0.5 text-xs rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30"
          :disabled="currentPage === 1"
          @click="goToPage(1)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        <button
          class="px-1.5 py-0.5 text-xs rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <template v-for="(p, i) in visiblePages" :key="i">
          <span v-if="p === '...'" class="px-1 text-xs text-gray-400">...</span>
          <button
            v-else
            :class="[
              'min-w-[24px] px-1.5 py-0.5 text-xs rounded font-medium',
              p === currentPage ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-200',
            ]"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
        </template>
        <button
          class="px-1.5 py-0.5 text-xs rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          class="px-1.5 py-0.5 text-xs rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30"
          :disabled="currentPage === totalPages"
          @click="goToPage(totalPages)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
        <span class="ml-2 text-xs text-gray-400">Strana:</span>
        <input
          type="number"
          :value="currentPage"
          :min="1"
          :max="totalPages"
          class="input-field-sm w-12 text-center"
          @change="goToPage(parseInt(($event.target as HTMLInputElement).value) || 1)"
        />
      </div>
    </div>

    <!-- Create Modal -->
    <Modal :open="showCreateModal" title="Pridať firmu" @close="showCreateModal = false">
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Názov firmy *</label>
          <input v-model="newCompany.name" type="text" class="input-field" required />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefón</label>
            <input v-model="newCompany.phone" type="tel" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input v-model="newCompany.email" type="email" class="input-field" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Web</label>
          <input v-model="newCompany.website" type="text" class="input-field" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Krajina</label>
            <input v-model="newCompany.country" type="text" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kategória</label>
            <input v-model="newCompany.industry" type="text" class="input-field" />
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <Button variant="ghost" type="button" @click="showCreateModal = false">Zrušiť</Button>
          <Button type="submit">Vytvoriť</Button>
        </div>
      </form>
    </Modal>
  </DashboardShell>
</template>
