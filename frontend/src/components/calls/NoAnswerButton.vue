<script setup lang="ts">
import { ref } from 'vue';
import Button from '@/components/ui/Button.vue';

const emit = defineEmits<{
  noAnswer: [];
}>();

const confirming = ref(false);

function handleClick(): void {
  if (!confirming.value) {
    confirming.value = true;
    setTimeout(() => { confirming.value = false; }, 3000);
    return;
  }
  emit('noAnswer');
  confirming.value = false;
}
</script>

<template>
  <Button
    variant="danger"
    size="sm"
    @click="handleClick"
  >
    {{ confirming ? 'Potvrdiť?' : 'NEZDVIHOL' }}
  </Button>
</template>
