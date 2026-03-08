<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import DashboardShell from '@/components/layout/DashboardShell.vue';
import Leaderboard from '@/components/stats/Leaderboard.vue';
import PerformanceChart from '@/components/stats/PerformanceChart.vue';
import GoalProgressBar from '@/components/stats/GoalProgressBar.vue';
import StatCard from '@/components/stats/StatCard.vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Badge from '@/components/ui/Badge.vue';
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue';
import { useAuthStore } from '@/stores/auth';
import { useStatsStore } from '@/stores/stats';
import { useGoalsStore } from '@/stores/goals';
import { useToast } from '@/composables/useToast';
import { formatDate } from '@/utils/formatDate';
import api from '@/utils/api';
import type { User, UserRole } from '@/types';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const authStore = useAuthStore();
const statsStore = useStatsStore();
const goalsStore = useGoalsStore();
const toast = useToast();

const activeTab = ref<'overview' | 'users'>('overview');
const showGoalModal = ref(false);
const selectedUserId = ref('');
const teamUsers = ref<User[]>([]);
const allUsers = ref<User[]>([]);
const goalForm = ref({
  periodStart: '',
  periodEnd: '',
  targetCalls: 0,
  targetNewClients: 0,
  targetShipments: 0,
});

// User management
const showUserModal = ref(false);
const editingUser = ref<User | null>(null);
const userForm = ref({
  name: '',
  email: '',
  password: '',
  role: 'salesman' as UserRole,
  supervisorId: null as string | null,
});

const supervisors = computed(() =>
  allUsers.value.filter(u => u.role === 'supervisor' || u.role === 'admin')
);

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  supervisor: 'bg-blue-100 text-blue-800',
  salesman: 'bg-green-100 text-green-800',
};

const roleLabels: Record<string, string> = {
  admin: 'Administrátor',
  supervisor: 'Supervízor',
  salesman: 'Predajca',
};

async function fetchUsers(): Promise<void> {
  const res = await api.get('/api/users');
  allUsers.value = res.data;
  teamUsers.value = res.data.filter((u: User) =>
    u.supervisorId === authStore.userId || u.id === authStore.userId
  );
}

onMounted(async () => {
  if (authStore.userId) {
    await statsStore.fetchTeamStats(authStore.userId);
    await fetchUsers();
  }
});

function openCreateUser(): void {
  editingUser.value = null;
  userForm.value = {
    name: '',
    email: '',
    password: '',
    role: 'salesman',
    supervisorId: authStore.userId,
  };
  showUserModal.value = true;
}

function openEditUser(user: User): void {
  editingUser.value = user;
  userForm.value = {
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    supervisorId: user.supervisorId,
  };
  showUserModal.value = true;
}

async function saveUser(): Promise<void> {
  try {
    if (editingUser.value) {
      const data: Record<string, unknown> = {
        name: userForm.value.name,
        email: userForm.value.email,
        role: userForm.value.role,
        supervisorId: userForm.value.supervisorId,
      };
      if (userForm.value.password) data.password = userForm.value.password;
      await api.put(`/api/users/${editingUser.value.id}`, data);
      toast.success('Používateľ aktualizovaný');
    } else {
      await api.post('/api/users', userForm.value);
      toast.success('Používateľ vytvorený');
    }
    showUserModal.value = false;
    await fetchUsers();
    if (authStore.userId) {
      await statsStore.fetchTeamStats(authStore.userId);
    }
  } catch (err: unknown) {
    const error = err as { response?: { data?: { error?: string } } };
    toast.error(error.response?.data?.error || 'Nepodarilo sa uložiť používateľa');
  }
}

async function deleteUser(user: User): Promise<void> {
  if (!confirm(`Vymazať používateľa ${user.name}?`)) return;
  try {
    await api.delete(`/api/users/${user.id}`);
    toast.success('Používateľ vymazaný');
    await fetchUsers();
  } catch (err: unknown) {
    const error = err as { response?: { data?: { error?: string } } };
    toast.error(error.response?.data?.error || 'Nepodarilo sa vymazať používateľa');
  }
}

const teamStats = computed(() => statsStore.teamStats);

const funnelData = computed(() => {
  if (!teamStats.value) return null;
  return {
    labels: ['Nový', 'Kontaktovaný', 'Záujem', 'Uzavretý'],
    datasets: [{
      label: 'Firmy',
      data: [
        teamStats.value.funnel.new,
        teamStats.value.funnel.contacted,
        teamStats.value.funnel.interested,
        teamStats.value.funnel.closed,
      ],
      backgroundColor: ['#6366f1', '#eab308', '#22c55e', '#6b7280'],
    }],
  };
});

function openGoalModal(userId: string): void {
  selectedUserId.value = userId;
  const now = new Date();
  goalForm.value = {
    periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    targetCalls: 100,
    targetNewClients: 10,
    targetShipments: 20,
  };
  showGoalModal.value = true;
}

async function saveGoal(): Promise<void> {
  try {
    await goalsStore.createGoal({
      userId: selectedUserId.value,
      ...goalForm.value,
    });
    showGoalModal.value = false;
    toast.success('Cieľ vytvorený');
    if (authStore.userId) {
      await statsStore.fetchTeamStats(authStore.userId);
    }
  } catch {
    toast.error('Nepodarilo sa vytvoriť cieľ');
  }
}

async function handleExport(): Promise<void> {
  await statsStore.exportCsv();
  toast.success('CSV exportované');
}
</script>

<template>
  <DashboardShell>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Prehľad tímu</h1>
        <p class="text-gray-500 mt-1">Správa výkonnosti tímu</p>
      </div>
      <Button variant="secondary" @click="handleExport">
        Exportovať CSV
      </Button>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex gap-6">
        <button
          v-for="tab in [
            { key: 'overview', label: 'Prehľad' },
            { key: 'users', label: 'Používatelia' },
          ] as const"
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

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview'">
      <div v-if="statsStore.loading">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonLoader type="chart" />
          <SkeletonLoader type="chart" />
        </div>
      </div>

      <template v-else-if="teamStats">
        <!-- Leaderboard -->
        <div class="mb-6">
          <Leaderboard :entries="teamStats.leaderboard" />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Performance Chart -->
          <PerformanceChart :data="teamStats.leaderboard" />

          <!-- Conversion Funnel -->
          <div v-if="funnelData" class="card">
            <h3 class="text-lg font-semibold mb-4">Konverzný lievik</h3>
            <Bar :data="funnelData" :options="{ responsive: true, plugins: { legend: { display: false } } }" />
          </div>
        </div>

        <!-- Goal Alerts -->
        <div class="card mb-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">Ciele</h3>
          </div>
          <div class="space-y-4">
            <div
              v-for="entry in teamStats.leaderboard"
              :key="entry.userId"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-gray-900">{{ entry.name }}</span>
                <Badge
                  v-if="entry.goalPct !== null && entry.goalPct < 50"
                  color="bg-red-100 text-red-800"
                  size="sm"
                >
                  Zaostáva
                </Badge>
              </div>
              <div class="flex items-center gap-3">
                <span v-if="entry.goalPct !== null" class="text-sm text-gray-600">{{ entry.goalPct }}%</span>
                <Button size="sm" variant="ghost" @click="openGoalModal(entry.userId)">Nastaviť cieľ</Button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Users Tab -->
    <div v-if="activeTab === 'users'">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Správa používateľov</h3>
        <Button size="sm" @click="openCreateUser">Pridať používateľa</Button>
      </div>

      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meno</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rola</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vytvorený</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Akcie</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="user in allUsers" :key="user.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ user.name }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ user.email }}</td>
              <td class="px-4 py-3">
                <Badge :color="roleColors[user.role]" size="sm">{{ roleLabels[user.role] || user.role }}</Badge>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ formatDate(user.createdAt) }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button class="text-primary-600 hover:text-primary-800 text-sm" @click="openEditUser(user)">Upraviť</button>
                  <button
                    v-if="user.id !== authStore.userId"
                    class="text-red-600 hover:text-red-800 text-sm"
                    @click="deleteUser(user)"
                  >
                    Vymazať
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Goal Modal -->
    <Modal :open="showGoalModal" title="Nastaviť cieľ" @close="showGoalModal = false">
      <form class="space-y-4" @submit.prevent="saveGoal">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Začiatok obdobia</label>
            <input v-model="goalForm.periodStart" type="date" class="input-field" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Koniec obdobia</label>
            <input v-model="goalForm.periodEnd" type="date" class="input-field" required />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Cieľ hovorov</label>
          <input v-model.number="goalForm.targetCalls" type="number" class="input-field" min="0" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Cieľ nových klientov</label>
          <input v-model.number="goalForm.targetNewClients" type="number" class="input-field" min="0" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Cieľ zásielok</label>
          <input v-model.number="goalForm.targetShipments" type="number" class="input-field" min="0" required />
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <Button variant="ghost" type="button" @click="showGoalModal = false">Zrušiť</Button>
          <Button type="submit">Uložiť cieľ</Button>
        </div>
      </form>
    </Modal>

    <!-- User Modal -->
    <Modal :open="showUserModal" :title="editingUser ? 'Upraviť používateľa' : 'Vytvoriť používateľa'" @close="showUserModal = false">
      <form class="space-y-4" @submit.prevent="saveUser">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Meno</label>
          <input v-model="userForm.name" type="text" class="input-field" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input v-model="userForm.email" type="email" class="input-field" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Heslo {{ editingUser ? '(nechajte prázdne pre zachovanie)' : '' }}
          </label>
          <input v-model="userForm.password" type="password" class="input-field" :required="!editingUser" minlength="6" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Rola</label>
          <select v-model="userForm.role" class="input-field">
            <option value="admin">Administrátor</option>
            <option value="supervisor">Supervízor</option>
            <option value="salesman">Predajca</option>
          </select>
        </div>
        <div v-if="userForm.role === 'salesman'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Supervízor</label>
          <select v-model="userForm.supervisorId" class="input-field">
            <option :value="null">Žiadny</option>
            <option v-for="sup in supervisors" :key="sup.id" :value="sup.id">{{ sup.name }}</option>
          </select>
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <Button variant="ghost" type="button" @click="showUserModal = false">Zrušiť</Button>
          <Button type="submit">{{ editingUser ? 'Aktualizovať' : 'Vytvoriť' }}</Button>
        </div>
      </form>
    </Modal>
  </DashboardShell>
</template>
