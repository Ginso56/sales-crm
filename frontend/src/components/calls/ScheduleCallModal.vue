<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import { useAuthStore } from '@/stores/auth';
import api from '@/utils/api';
import type { User } from '@/types';

interface Props {
  open: boolean;
  companyId: string;
  companyName: string;
}

defineProps<Props>();
const emit = defineEmits<{
  close: [];
  submit: [data: {
    assignedTo: string;
    scheduledFor: string;
    title: string;
  }];
}>();

const authStore = useAuthStore();
const scheduledFor = ref('');
const title = ref('');
const assignedTo = ref(authStore.userId || '');
const salespeople = ref<User[]>([]);
const submitting = ref(false);

onMounted(async () => {
  // Set default to tomorrow 9am
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  scheduledFor.value = tomorrow.toISOString().slice(0, 16);

  if (authStore.userRole !== 'salesman') {
    const response = await api.get('/api/users');
    salespeople.value = response.data.filter((u: User) => u.role === 'salesman' || u.role === 'supervisor');
  }
});

function handleSubmit(): void {
  if (!scheduledFor.value || !title.value) return;
  submitting.value = true;
  emit('submit', {
    assignedTo: assignedTo.value,
    scheduledFor: new Date(scheduledFor.value).toISOString(),
    title: title.value,
  });
  submitting.value = false;
}
</script>

<template>
  <Modal :open="open" :title="`Naplánovať hovor - ${companyName}`" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Názov</label>
        <input v-model="title" type="text" class="input-field" placeholder="Spätný hovor" required />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Naplánovať na</label>
        <input v-model="scheduledFor" type="datetime-local" class="input-field" required />
      </div>

      <div v-if="authStore.userRole !== 'salesman'">
        <label class="block text-sm font-medium text-gray-700 mb-1">Prideliť</label>
        <select v-model="assignedTo" class="input-field">
          <option v-for="user in salespeople" :key="user.id" :value="user.id">
            {{ user.name }} ({{ user.role }})
          </option>
        </select>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <Button variant="ghost" type="button" @click="emit('close')">Zrušiť</Button>
        <Button type="submit" :loading="submitting">Naplánovať</Button>
      </div>
    </form>
  </Modal>
</template>
