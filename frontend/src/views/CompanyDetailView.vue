<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
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
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue';
import { useCompaniesStore } from '@/stores/companies';
import { useCallsStore } from '@/stores/calls';
import { useCalendarStore } from '@/stores/calendar';
import { useCompany } from '@/composables/useCompany';
import { useCallLog } from '@/composables/useCallLog';
import { useToast } from '@/composables/useToast';
import { formatDateTime } from '@/utils/formatDate';
import type { Company, CallStatus } from '@/types';

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

onMounted(async () => {
  await Promise.all([
    companiesStore.fetchCompany(companyId),
    callsStore.fetchCallLogs(companyId),
  ]);
});

const company = computed(() => companiesStore.currentCompany);

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
    await companiesStore.fetchCompany(companyId);
  }
}

async function handleNoAnswer(): Promise<void> {
  await logNoAnswer(companyId);
  await companiesStore.fetchCompany(companyId);
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
    toast.success('Call scheduled');
  } catch {
    toast.error('Failed to schedule call');
  }
}

const tabs = [
  { key: 'info', label: 'Info' },
  { key: 'calls', label: 'Call History' },
  { key: 'notes', label: 'Notes & Files' },
  { key: 'audit', label: 'Audit Log' },
] as const;
</script>

<template>
  <DashboardShell>
    <div v-if="companiesStore.loading && !company">
      <SkeletonLoader type="card" />
    </div>

    <template v-else-if="company">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <router-link to="/companies" class="text-sm text-primary-600 hover:text-primary-800 mb-2 inline-flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Companies
          </router-link>
          <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {{ company.name }}
            <span v-if="company.priorityFollowup" class="text-orange-500">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd" />
              </svg>
            </span>
          </h1>
        </div>
        <div class="flex gap-2">
          <Button variant="success" size="sm" @click="showCallModal = true">VOLALI SME</Button>
          <NoAnswerButton @no-answer="handleNoAnswer" />
          <Button variant="secondary" size="sm" @click="showScheduleModal = true">
            NAPLANOVAT HOVOR
          </Button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 mb-6">
        <nav class="flex gap-6">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="[
              'pb-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div v-if="activeTab === 'info'">
        <CompanyCard :company="company" @save="handleSave" />
      </div>

      <div v-if="activeTab === 'calls'">
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Call History</h3>
          <div v-if="callsStore.loading">
            <SkeletonLoader type="text" :lines="5" />
          </div>
          <div v-else-if="callsStore.callLogs.length === 0" class="text-center py-8">
            <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p class="text-gray-500 text-sm">No calls logged yet</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="log in callsStore.callLogs"
              :key="log.id"
              class="flex items-start gap-4 p-3 border border-gray-200 rounded-lg"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <CallStatusBadge :status="log.status as CallStatus" />
                  <span class="text-sm text-gray-500">{{ formatDateTime(log.calledAt) }}</span>
                  <span class="text-sm text-gray-400">by {{ log.salesmanName }}</span>
                </div>
                <div v-if="log.status === 'answered' && log.shippingCompany" class="text-sm text-gray-600 mt-1">
                  <span class="font-medium">{{ log.shippingCompany }}</span>
                  <span v-if="log.shipmentCount"> - {{ log.shipmentCount }} shipments</span>
                  <span v-if="log.shipmentDestinations?.length"> to {{ log.shipmentDestinations.join(', ') }}</span>
                </div>
                <p v-if="log.notes" class="text-sm text-gray-500 mt-1">{{ log.notes }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'notes'">
        <CompanyNotes :company-id="companyId" />
      </div>

      <div v-if="activeTab === 'audit'">
        <AuditLog :company-id="companyId" />
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
