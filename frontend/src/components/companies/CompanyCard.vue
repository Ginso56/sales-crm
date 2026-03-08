<script setup lang="ts">
import { ref, watch } from 'vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import type { Company, CompanyStatus } from '@/types';
import { STATUS_COLORS, STATUS_LABELS } from '@/types';
import { formatPhone } from '@/utils/phoneFormatter';

interface Props {
  company: Company;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  save: [data: Partial<Company>];
}>();

const editing = ref(false);
const form = ref<Partial<Company>>({});

watch(() => props.company, (val) => {
  form.value = { ...val };
}, { immediate: true });

const statuses: CompanyStatus[] = ['new', 'contacted', 'interested', 'not_interested', 'closed'];

function startEdit(): void {
  form.value = { ...props.company };
  editing.value = true;
}

function cancelEdit(): void {
  editing.value = false;
  form.value = { ...props.company };
}

function save(): void {
  if (form.value.phone) {
    form.value.phone = formatPhone(form.value.phone);
  }
  // Only send fields the backend accepts
  const { name, phone, email, website, address, country, industry, status, assignedTo } = form.value;
  emit('save', { name, phone, email, website, address, country, industry, status, assignedTo });
  editing.value = false;
}
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold">Informácie o firme</h3>
      <div class="flex gap-2">
        <Button v-if="!editing" variant="secondary" size="sm" @click="startEdit">Upraviť</Button>
        <template v-else>
          <Button variant="ghost" size="sm" @click="cancelEdit">Zrušiť</Button>
          <Button size="sm" @click="save">Uložiť</Button>
        </template>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="field in [
        { key: 'name', label: 'Názov', type: 'text' },
        { key: 'phone', label: 'Telefón', type: 'tel' },
        { key: 'email', label: 'E-mail', type: 'email' },
        { key: 'website', label: 'Web', type: 'url' },
        { key: 'country', label: 'Krajina', type: 'text' },
        { key: 'industry', label: 'Kategória', type: 'text' },
      ]" :key="field.key" class="space-y-1">
        <label class="text-xs font-medium text-gray-500 uppercase">{{ field.label }}</label>
        <input
          v-if="editing"
          v-model="(form as Record<string, string>)[field.key]"
          :type="field.type"
          class="input-field text-sm"
        />
        <p v-else class="text-sm text-gray-900">
          {{ (company as unknown as Record<string, string>)[field.key] || '—' }}
        </p>
      </div>

      <div class="space-y-1">
        <label class="text-xs font-medium text-gray-500 uppercase">Stav</label>
        <select
          v-if="editing"
          v-model="form.status"
          class="input-field text-sm"
        >
          <option v-for="s in statuses" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
        </select>
        <Badge v-else :color="STATUS_COLORS[company.status as CompanyStatus]">
          {{ STATUS_LABELS[company.status as CompanyStatus] }}
        </Badge>
      </div>

      <div class="md:col-span-2 space-y-1">
        <label class="text-xs font-medium text-gray-500 uppercase">Adresa</label>
        <textarea
          v-if="editing"
          v-model="form.address"
          rows="2"
          class="input-field text-sm"
        />
        <p v-else class="text-sm text-gray-900">{{ company.address || '—' }}</p>
      </div>
    </div>
  </div>
</template>
