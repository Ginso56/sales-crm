<script setup lang="ts">
import { ref, onMounted } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import skLocale from '@fullcalendar/core/locales/sk';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import { useCalendarStore } from '@/stores/calendar';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useRouter } from 'vue-router';
import api from '@/utils/api';
import type { EventInput, CalendarOptions } from '@fullcalendar/core';
import type { User, Company } from '@/types';

const calendarStore = useCalendarStore();
const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

// Modal state
const showModal = ref(false);
const modalTitle = ref('');
const modalScheduledFor = ref('');
const modalAssignedTo = ref('');
const modalCompanyId = ref('');
const companySearch = ref('');
const companyResults = ref<Company[]>([]);
const selectedCompany = ref<Company | null>(null);
const salespeople = ref<User[]>([]);
const submitting = ref(false);
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const lastStart = ref('');
const lastEnd = ref('');

const calendarOptions = ref<CalendarOptions>({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  locale: skLocale,
  initialView: 'timeGridDay',
  nowIndicator: true,
  selectable: true,
  selectMirror: true,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },
  slotMinTime: '06:00:00',
  slotMaxTime: '22:00:00',
  events: [],
  eventClick: (info) => {
    const companyId = info.event.extendedProps.companyId as string;
    if (companyId) {
      router.push(`/companies/${companyId}`);
    }
  },
  dateClick: (info) => {
    openModal(info.date);
  },
  select: (info) => {
    openModal(info.start);
  },
  datesSet: (dateInfo) => {
    lastStart.value = dateInfo.startStr;
    lastEnd.value = dateInfo.endStr;
    loadEvents(dateInfo.startStr, dateInfo.endStr);
  },
  height: 'auto',
  eventDisplay: 'block',
});

function openModal(date: Date): void {
  modalTitle.value = '';
  modalScheduledFor.value = toLocalDatetime(date);
  modalAssignedTo.value = authStore.userId || '';
  modalCompanyId.value = '';
  companySearch.value = '';
  companyResults.value = [];
  selectedCompany.value = null;
  showModal.value = true;
}

function toLocalDatetime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function searchCompanies(): Promise<void> {
  const q = companySearch.value.trim();
  if (q.length < 2) {
    companyResults.value = [];
    return;
  }
  if (searchTimeout.value) clearTimeout(searchTimeout.value);
  searchTimeout.value = setTimeout(async () => {
    try {
      const res = await api.get('/api/companies', { params: { search: q, limit: 10 } });
      companyResults.value = res.data.data;
    } catch {
      companyResults.value = [];
    }
  }, 300);
}

function selectCompany(company: Company): void {
  selectedCompany.value = company;
  modalCompanyId.value = company.id;
  companySearch.value = company.name;
  companyResults.value = [];
}

async function handleSubmit(): Promise<void> {
  if (!modalTitle.value || !modalScheduledFor.value || !modalCompanyId.value) {
    toast.error('Vyplňte všetky povinné polia');
    return;
  }
  submitting.value = true;
  try {
    await calendarStore.scheduleCall({
      companyId: modalCompanyId.value,
      assignedTo: modalAssignedTo.value,
      scheduledFor: new Date(modalScheduledFor.value).toISOString(),
      title: modalTitle.value,
    });
    showModal.value = false;
    toast.success('Hovor naplánovaný');
    if (lastStart.value && lastEnd.value) {
      await loadEvents(lastStart.value, lastEnd.value);
    }
  } catch {
    toast.error('Nepodarilo sa naplánovať hovor');
  } finally {
    submitting.value = false;
  }
}

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

onMounted(async () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  loadEvents(start, end);

  if (authStore.userRole !== 'salesman') {
    try {
      const res = await api.get('/api/users');
      salespeople.value = res.data.filter((u: User) => u.role === 'salesman' || u.role === 'supervisor');
    } catch { /* ignore */ }
  }
});
</script>

<template>
  <div class="card">
    <FullCalendar :options="calendarOptions" />
  </div>

  <!-- New event modal -->
  <Modal :open="showModal" title="Naplánovať hovor" @close="showModal = false">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <!-- Company search -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Firma *</label>
        <div class="relative">
          <input
            v-model="companySearch"
            type="text"
            class="input-field"
            placeholder="Hľadať firmu..."
            autocomplete="off"
            @input="searchCompanies"
          />
          <div
            v-if="companyResults.length > 0"
            class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            <button
              v-for="c in companyResults"
              :key="c.id"
              type="button"
              class="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 flex items-center justify-between"
              @click="selectCompany(c)"
            >
              <span class="font-medium text-gray-900">{{ c.name }}</span>
              <span class="text-xs text-gray-400">{{ c.industry || '' }}</span>
            </button>
          </div>
        </div>
        <p v-if="selectedCompany" class="mt-1 text-xs text-green-600">
          Vybraná: {{ selectedCompany.name }}
          <span v-if="selectedCompany.phone" class="text-gray-400 ml-1">{{ selectedCompany.phone }}</span>
        </p>
      </div>

      <!-- Title -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Názov hovoru *</label>
        <input v-model="modalTitle" type="text" class="input-field" placeholder="Napr. Úvodný hovor, Follow-up..." required />
      </div>

      <!-- DateTime -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Dátum a čas *</label>
        <input v-model="modalScheduledFor" type="datetime-local" class="input-field" required />
      </div>

      <!-- Assign to -->
      <div v-if="authStore.userRole !== 'salesman' && salespeople.length > 0">
        <label class="block text-sm font-medium text-gray-700 mb-1">Prideliť</label>
        <select v-model="modalAssignedTo" class="input-field">
          <option v-for="user in salespeople" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
        </select>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <Button variant="ghost" type="button" @click="showModal = false">Zrušiť</Button>
        <Button type="submit" :loading="submitting">Naplánovať</Button>
      </div>
    </form>
  </Modal>
</template>
