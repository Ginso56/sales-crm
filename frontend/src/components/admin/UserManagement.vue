<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Badge from '@/components/ui/Badge.vue';
import { useToast } from '@/composables/useToast';
import api from '@/utils/api';
import type { User, UserRole } from '@/types';
import { formatDate } from '@/utils/formatDate';

const toast = useToast();
const users = ref<User[]>([]);
const loading = ref(true);
const showModal = ref(false);
const editingUser = ref<User | null>(null);

const form = ref({
  name: '',
  email: '',
  password: '',
  role: 'salesman' as UserRole,
  supervisorId: null as string | null,
});

const supervisors = ref<User[]>([]);

onMounted(async () => {
  await fetchUsers();
});

async function fetchUsers(): Promise<void> {
  loading.value = true;
  try {
    const response = await api.get('/api/users');
    users.value = response.data;
    supervisors.value = users.value.filter(u => u.role === 'supervisor' || u.role === 'admin');
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  editingUser.value = null;
  form.value = { name: '', email: '', password: '', role: 'salesman', supervisorId: null };
  showModal.value = true;
}

function openEdit(user: User): void {
  editingUser.value = user;
  form.value = {
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    supervisorId: user.supervisorId,
  };
  showModal.value = true;
}

async function saveUser(): Promise<void> {
  try {
    if (editingUser.value) {
      const data: Record<string, unknown> = {
        name: form.value.name,
        email: form.value.email,
        role: form.value.role,
        supervisorId: form.value.supervisorId,
      };
      if (form.value.password) data.password = form.value.password;
      await api.put(`/api/users/${editingUser.value.id}`, data);
      toast.success('User updated');
    } else {
      await api.post('/api/users', form.value);
      toast.success('User created');
    }
    showModal.value = false;
    await fetchUsers();
  } catch (err: unknown) {
    const error = err as { response?: { data?: { error?: string } } };
    toast.error(error.response?.data?.error || 'Failed to save user');
  }
}

async function deleteUser(user: User): Promise<void> {
  if (!confirm(`Delete user ${user.name}?`)) return;
  try {
    await api.delete(`/api/users/${user.id}`);
    toast.success('User deleted');
    await fetchUsers();
  } catch (err: unknown) {
    const error = err as { response?: { data?: { error?: string } } };
    toast.error(error.response?.data?.error || 'Failed to delete user');
  }
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  supervisor: 'bg-blue-100 text-blue-800',
  salesman: 'bg-green-100 text-green-800',
};
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">User Management</h3>
      <Button size="sm" @click="openCreate">Add User</Button>
    </div>

    <div class="overflow-x-auto rounded-lg border border-gray-200">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <template v-if="loading">
            <tr v-for="i in 5" :key="i" class="animate-pulse">
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 rounded w-32 skeleton-pulse" /></td>
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 rounded w-40 skeleton-pulse" /></td>
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 rounded w-20 skeleton-pulse" /></td>
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 rounded w-24 skeleton-pulse" /></td>
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 rounded w-16 ml-auto skeleton-pulse" /></td>
            </tr>
          </template>
          <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ user.name }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ user.email }}</td>
            <td class="px-4 py-3">
              <Badge :color="roleColors[user.role]" size="sm">{{ user.role }}</Badge>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">{{ formatDate(user.createdAt) }}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button class="text-primary-600 hover:text-primary-800 text-sm" @click="openEdit(user)">Edit</button>
                <button class="text-red-600 hover:text-red-800 text-sm" @click="deleteUser(user)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :open="showModal" :title="editingUser ? 'Edit User' : 'Create User'" @close="showModal = false">
      <form class="space-y-4" @submit.prevent="saveUser">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input v-model="form.name" type="text" class="input-field" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input v-model="form.email" type="email" class="input-field" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Password {{ editingUser ? '(leave blank to keep current)' : '' }}
          </label>
          <input v-model="form.password" type="password" class="input-field" :required="!editingUser" minlength="6" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select v-model="form.role" class="input-field">
            <option value="admin">Admin</option>
            <option value="supervisor">Supervisor</option>
            <option value="salesman">Salesman</option>
          </select>
        </div>
        <div v-if="form.role === 'salesman'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
          <select v-model="form.supervisorId" class="input-field">
            <option :value="null">None</option>
            <option v-for="sup in supervisors" :key="sup.id" :value="sup.id">{{ sup.name }}</option>
          </select>
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <Button variant="ghost" type="button" @click="showModal = false">Cancel</Button>
          <Button type="submit">{{ editingUser ? 'Update' : 'Create' }}</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
