<script setup lang="ts">
import { ref } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';

interface Props {
  open: boolean;
  companyId: string;
  companyName: string;
}

defineProps<Props>();
const emit = defineEmits<{
  close: [];
  submit: [data: {
    calledAt: string;
    shipmentCount: number;
    shipmentDestinations: string[];
    shippingCompany: string;
    notes: string;
  }];
}>();

const calledAt = ref(new Date().toISOString().slice(0, 16));
const shipmentCount = ref(0);
const destinationInput = ref('');
const shipmentDestinations = ref<string[]>([]);
const shippingCompany = ref('');
const notes = ref('');
const submitting = ref(false);

function addDestination(): void {
  const val = destinationInput.value.trim();
  if (val && !shipmentDestinations.value.includes(val)) {
    shipmentDestinations.value.push(val);
    destinationInput.value = '';
  }
}

function removeDestination(idx: number): void {
  shipmentDestinations.value.splice(idx, 1);
}

function handleSubmit(): void {
  submitting.value = true;
  emit('submit', {
    calledAt: new Date(calledAt.value).toISOString(),
    shipmentCount: shipmentCount.value,
    shipmentDestinations: shipmentDestinations.value,
    shippingCompany: shippingCompany.value,
    notes: notes.value,
  });
  submitting.value = false;
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault();
    addDestination();
  }
}
</script>

<template>
  <Modal :open="open" :title="`Log Call - ${companyName}`" size="lg" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Called At</label>
        <input v-model="calledAt" type="datetime-local" class="input-field" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Shipping Company</label>
        <input v-model="shippingCompany" type="text" class="input-field" placeholder="Enter shipping company name" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Shipment Count</label>
        <input v-model.number="shipmentCount" type="number" min="0" class="input-field" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Shipment Destinations</label>
        <div class="flex gap-2 mb-2">
          <input
            v-model="destinationInput"
            type="text"
            class="input-field flex-1"
            placeholder="Add a country"
            @keydown="handleKeydown"
          />
          <Button type="button" variant="secondary" size="sm" @click="addDestination">Add</Button>
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(dest, idx) in shipmentDestinations"
            :key="idx"
            class="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full text-xs"
          >
            {{ dest }}
            <button type="button" class="hover:text-red-500" @click="removeDestination(idx)">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea v-model="notes" rows="3" class="input-field" placeholder="Additional notes..." />
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <Button variant="ghost" type="button" @click="emit('close')">Cancel</Button>
        <Button type="submit" :loading="submitting">Save Call</Button>
      </div>
    </form>
  </Modal>
</template>
