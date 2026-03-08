<script setup lang="ts">
import type { Company } from '@/types';

interface Props {
  company: Company;
}

defineProps<Props>();
</script>

<template>
  <div>
    <slot />
  </div>
</template>
