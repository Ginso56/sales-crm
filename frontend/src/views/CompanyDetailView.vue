<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import DashboardShell from '@/components/layout/DashboardShell.vue';
import CompanyCard from '@/components/companies/CompanyCard.vue';
import CompanyNotes from '@/components/companies/CompanyNotes.vue';
import AuditLog from '@/components/companies/AuditLog.vue';
import CallLogModal from '@/components/calls/CallLogModal.vue';
import CallStatusBadge from '@/components/calls/CallStatusBadge.vue';
import NoAnswerButton from '@/components/calls/NoAnswerButton.vue';
import ScheduleCallModal from '@/components/calls/ScheduleCallModal.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue';
import { useCompaniesStore } from '@/stores/companies';
import { useCallsStore } from '@/stores/calls';
import { useCalendarStore } from '@/stores/calendar';
import { useCompany } from '@/composables/useCompany';
import { useCallLog } from '@/composables/useCallLog';
import { useToast } from '@/composables/useToast';
import { formatDateTime } from '@/utils/formatDate';
import type { Company, CallStatus, CompanyStatus } from '@/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';

const route = useRoute();
const companyId = route.params.id as string;
const companiesStore = useCompaniesStore();
const callsStore = useCallsStore();
const calendarStore = useCalendarStore();
const { saveCompany } = useCompany();
const { logAnswered, logNoAnswer } = useCallLog();
const toast = useToast();

const activeTab = ref<'info' | 'calls' | 'notes' | 'audit'>('info');
const showCallModal = ref(false);
const showScheduleModal = ref(false);
const showStatusDropdown = ref(false);

const allStatuses: CompanyStatus[] = ['new', 'contacted', 'interested', 'not_interested', 'closed'];

async function changeStatus(status: CompanyStatus): Promise<void> {
  showStatusDropdown.value = false;
  if (company.value?.status === status) return;
  await saveCompany(companyId, { status });
  await companiesStore.fetchCompany(companyId);
}

function handleClickOutside(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  if (!target.closest('.status-dropdown-wrapper')) {
    showStatusDropdown.value = false;
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside);
  await Promise.all([
    companiesStore.fetchCompany(companyId),
    callsStore.fetchCallLogs(companyId),
  ]);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const company = computed(() => companiesStore.currentCompany);

const callStats = computed(() => {
  const logs = callsStore.callLogs;
  const answered = logs.filter(l => l.status === 'answered').length;
  const noAnswer = logs.filter(l => l.status === 'no_answer').length;
  return { total: logs.length, answered, noAnswer };
});

async function handleSave(data: Partial<Company>): Promise<void> {
  await saveCompany(companyId, data);
}

async function handleCallSubmit(data: {
  calledAt: string;
  shipmentCount: number;
  shipmentDestinations: string[];
  shippingCompany: string;
  notes: string;
}): Promise<void> {
  const success = await logAnswered(companyId, data);
  if (success) {
    showCallModal.value = false;
    await Promise.all([
      companiesStore.fetchCompany(companyId),
      callsStore.fetchCallLogs(companyId),
    ]);
  }
}

async function handleNoAnswer(): Promise<void> {
  await logNoAnswer(companyId);
  await Promise.all([
    companiesStore.fetchCompany(companyId),
    callsStore.fetchCallLogs(companyId),
  ]);
}

async function handleScheduleSubmit(data: {
  assignedTo: string;
  scheduledFor: string;
  title: string;
}): Promise<void> {
  try {
    await calendarStore.scheduleCall({
      companyId,
      ...data,
    });
    showScheduleModal.value = false;
    toast.success('Hovor naplánovaný');
  } catch {
    toast.error('Nepodarilo sa naplánovať hovor');
  }
}

function copyToClipboard(text: string | null, label: string): void {
  if (!text) return;
  navigator.clipboard.writeText(text);
  toast.info(`${label} skopírovaný`);
}

const tabs = [
  { key: 'info', label: 'Info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'calls', label: 'Hovory', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
  { key: 'notes', label: 'Poznámky', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { key: 'audit', label: 'Zmeny', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
] as const;
</script>

<template>
  <DashboardShell>
    <div v-if="companiesStore.loading && !company">
      <SkeletonLoader type="card" />
    </div>

    <template v-else-if="company">
      <!-- Back link -->
      <router-link to="/companies" class="text-sm text-gray-500 hover:text-primary-600 mb-4 inline-flex items-center gap-1 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Späť na firmy
      </router-link>

      <!-- Hero Header Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <!-- Top colored bar -->
        <div class="h-1.5" :class="{
          'bg-indigo-500': company.status === 'new',
          'bg-yellow-500': company.status === 'contacted',
          'bg-green-500': company.status === 'interested',
          'bg-red-500': company.status === 'not_interested',
          'bg-gray-400': company.status === 'closed',
        }" />

        <div class="p-6">
          <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <!-- Left: Company info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-3">
                <!-- Company avatar -->
                <div class="w-12 h-12 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {{ company.name.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2 truncate">
                    {{ company.name }}
                    <svg v-if="company.priorityFollowup" class="w-5 h-5 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd" />
                    </svg>
                  </h1>
                  <div class="flex items-center gap-2 mt-0.5">
                    <div class="relative status-dropdown-wrapper">
                      <button
                        class="cursor-pointer hover:ring-2 hover:ring-primary-200 rounded-full transition-all"
                        @click.stop="showStatusDropdown = !showStatusDropdown"
                        title="Klikni pre zmenu stavu"
                      >
                        <Badge :color="STATUS_COLORS[company.status as CompanyStatus]" size="sm">
                          {{ STATUS_LABELS[company.status as CompanyStatus] }}
                          <svg class="w-3 h-3 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </Badge>
                      </button>
                      <div
                        v-if="showStatusDropdown"
                        class="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
                      >
                        <button
                          v-for="s in allStatuses"
                          :key="s"
                          class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                          :class="{ 'bg-gray-50 font-medium': company.status === s }"
                          @click="changeStatus(s)"
                        >
                          <span class="w-2 h-2 rounded-full flex-shrink-0" :class="{
                            'bg-indigo-500': s === 'new',
                            'bg-yellow-500': s === 'contacted',
                            'bg-green-500': s === 'interested',
                            'bg-red-500': s === 'not_interested',
                            'bg-gray-400': s === 'closed',
                          }" />
                          {{ STATUS_LABELS[s] }}
                          <svg v-if="company.status === s" class="w-4 h-4 ml-auto text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <span v-if="company.industry" class="text-xs text-gray-400">{{ company.industry }}</span>
                    <span v-if="company.country" class="text-xs text-gray-400">· {{ company.country }}</span>
                  </div>
                </div>
              </div>

              <!-- Quick contact row -->
              <div class="flex flex-wrap items-center gap-4 mt-4">
                <button
                  v-if="company.phone"
                  class="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  @click="copyToClipboard(company.phone, 'Telefón')"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span class="font-mono text-xs">{{ company.phone }}</span>
                </button>
                <a
                  v-if="company.email"
                  :href="`mailto:${company.email}`"
                  class="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {{ company.email }}
                </a>
                <a
                  v-if="company.website"
                  :href="company.website.startsWith('http') ? company.website : `https://${company.website}`"
                  target="_blank"
                  class="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                  </svg>
                  {{ company.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') }}
                </a>
                <span v-if="company.assignedName" class="inline-flex items-center gap-1.5 text-sm text-gray-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {{ company.assignedName }}
                </span>
              </div>
            </div>

            <!-- Right: Action buttons + mini stats -->
            <div class="flex flex-col items-end gap-4">
              <div class="flex gap-2">
                <Button variant="success" size="sm" @click="showCallModal = true">
                  <span class="flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    VOLALI SME
                  </span>
                </Button>
                <NoAnswerButton @no-answer="handleNoAnswer" />
                <Button variant="secondary" size="sm" @click="showScheduleModal = true">
                  <span class="flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    NAPLÁNOVAŤ
                  </span>
                </Button>
              </div>

              <!-- Mini stats -->
              <div class="flex gap-4">
                <div class="text-center">
                  <p class="text-lg font-bold text-gray-900">{{ callStats.total }}</p>
                  <p class="text-[10px] uppercase text-gray-400 font-medium">Hovorov</p>
                </div>
                <div class="text-center">
                  <p class="text-lg font-bold text-green-600">{{ callStats.answered }}</p>
                  <p class="text-[10px] uppercase text-gray-400 font-medium">Zdvihnuté</p>
                </div>
                <div class="text-center">
                  <p class="text-lg font-bold text-red-500">{{ callStats.noAnswer }}</p>
                  <p class="text-[10px] uppercase text-gray-400 font-medium">Nezdvihnuté</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="border-b border-gray-200 px-6">
          <nav class="flex gap-0 -mb-px">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              :class="[
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ]"
              @click="activeTab = tab.key"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
              </svg>
              {{ tab.label }}
              <span
                v-if="tab.key === 'calls' && callStats.total > 0"
                class="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-600"
              >
                {{ callStats.total }}
              </span>
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- Info Tab -->
          <div v-if="activeTab === 'info'">
            <CompanyCard :company="company" @save="handleSave" />
          </div>

          <!-- Calls Tab -->
          <div v-if="activeTab === 'calls'">
            <div v-if="callsStore.loading">
              <SkeletonLoader type="text" :lines="5" />
            </div>
            <div v-else-if="callsStore.callLogs.length === 0" class="text-center py-12">
              <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <p class="text-gray-500 text-sm">Zatiaľ žiadne hovory</p>
              <p class="text-gray-400 text-xs mt-1">Zaznamenajte prvý hovor tlačidlom vyššie</p>
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="log in callsStore.callLogs"
                :key="log.id"
                class="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <!-- Status icon -->
                <div
                  :class="[
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                    log.status === 'answered' ? 'bg-green-100' : log.status === 'no_answer' ? 'bg-red-100' : 'bg-indigo-100',
                  ]"
                >
                  <svg
                    class="w-4 h-4"
                    :class="log.status === 'answered' ? 'text-green-600' : log.status === 'no_answer' ? 'text-red-600' : 'text-indigo-600'"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path
                      v-if="log.status === 'answered'"
                      stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
                    />
                    <path
                      v-else-if="log.status === 'no_answer'"
                      stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"
                    />
                    <path
                      v-else
                      stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <CallStatusBadge :status="log.status as CallStatus" />
                    <span class="text-xs text-gray-400">{{ formatDateTime(log.calledAt) }}</span>
                  </div>
                  <p class="text-xs text-gray-500">{{ log.salesmanName }}</p>
                  <div v-if="log.status === 'answered' && log.shippingCompany" class="text-sm text-gray-600 mt-1.5">
                    <span class="font-medium">{{ log.shippingCompany }}</span>
                    <span v-if="log.shipmentCount"> · {{ log.shipmentCount }} zásielok</span>
                    <span v-if="log.shipmentDestinations?.length"> do {{ log.shipmentDestinations.join(', ') }}</span>
                  </div>
                  <p v-if="log.notes" class="text-sm text-gray-500 mt-1 italic">{{ log.notes }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes Tab -->
          <div v-if="activeTab === 'notes'">
            <CompanyNotes :company-id="companyId" />
          </div>

          <!-- Audit Tab -->
          <div v-if="activeTab === 'audit'">
            <AuditLog :company-id="companyId" />
          </div>
        </div>
      </div>
    </template>

    <!-- Modals -->
    <CallLogModal
      :open="showCallModal"
      :company-id="companyId"
      :company-name="company?.name || ''"
      @close="showCallModal = false"
      @submit="handleCallSubmit"
    />

    <ScheduleCallModal
      :open="showScheduleModal"
      :company-id="companyId"
      :company-name="company?.name || ''"
      @close="showScheduleModal = false"
      @submit="handleScheduleSubmit"
    />
  </DashboardShell>
</template>
