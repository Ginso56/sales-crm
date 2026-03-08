<script setup lang="ts">
import { ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';

interface Props {
  open: boolean;
  companyId: string;
  companyName: string;
  isFirstCall: boolean;
}

const props = defineProps<Props>();
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
const carrierInput = ref('');
const carriers = ref<string[]>([]);
const notes = ref('');
const submitting = ref(false);

// Reset form when modal opens
watch(() => props.open, (val) => {
  if (val) {
    calledAt.value = new Date().toISOString().slice(0, 16);
    shipmentCount.value = 0;
    destinationInput.value = '';
    shipmentDestinations.value = [];
    carrierInput.value = '';
    carriers.value = [];
    notes.value = '';
  }
});

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

function addCarrier(): void {
  const val = carrierInput.value.trim();
  if (val && !carriers.value.includes(val)) {
    carriers.value.push(val);
    carrierInput.value = '';
  }
}

function removeCarrier(idx: number): void {
  carriers.value.splice(idx, 1);
}

function handleSubmit(): void {
  submitting.value = true;
  emit('submit', {
    calledAt: new Date(calledAt.value).toISOString(),
    shipmentCount: props.isFirstCall ? shipmentCount.value : 0,
    shipmentDestinations: props.isFirstCall ? shipmentDestinations.value : [],
    shippingCompany: props.isFirstCall ? carriers.value.join(', ') : '',
    notes: notes.value,
  });
  submitting.value = false;
}

function handleDestKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault();
    addDestination();
  }
}

function handleCarrierKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault();
    addCarrier();
  }
}
</script>

<template>
  <Modal :open="open" :title="`Zaznamenať hovor - ${companyName}`" size="lg" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Čas hovoru</label>
        <input v-model="calledAt" type="datetime-local" class="input-field" />
      </div>

      <!-- First call: full shipping form -->
      <template v-if="isFirstCall">
        <!-- Carriers (multiple) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Prepravné spoločnosti</label>
          <div class="flex gap-2 mb-2">
            <input
              v-model="carrierInput"
              type="text"
              class="input-field flex-1"
              placeholder="Pridať prepravcu"
              @keydown="handleCarrierKeydown"
            />
            <Button type="button" variant="secondary" size="sm" @click="addCarrier">Pridať</Button>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(c, idx) in carriers"
              :key="idx"
              class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
            >
              {{ c }}
              <button type="button" class="hover:text-red-500" @click="removeCarrier(idx)">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Počet zásielok</label>
          <input v-model.number="shipmentCount" type="number" min="0" class="input-field" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Destinácie zásielok</label>
          <div class="flex gap-2 mb-2">
            <input
              v-model="destinationInput"
              type="text"
              class="input-field flex-1"
              placeholder="Pridať krajinu"
              @keydown="handleDestKeydown"
            />
            <Button type="button" variant="secondary" size="sm" @click="addDestination">Pridať</Button>
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
      </template>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Poznámky</label>
        <textarea v-model="notes" rows="3" class="input-field" placeholder="Čo bolo v hovore..." />
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <Button variant="ghost" type="button" @click="emit('close')">Zrušiť</Button>
        <Button type="submit" :loading="submitting">Uložiť hovor</Button>
      </div>
    </form>
  </Modal>
</template>
