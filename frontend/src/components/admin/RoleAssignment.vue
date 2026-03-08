<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue';
import type { UserRole } from '@/types';

interface Props {
  role: UserRole;
}

defineProps<Props>();

const roleInfo: Record<UserRole, { label: string; color: string; description: string }> = {
  admin: { label: 'Administrátor', color: 'bg-purple-100 text-purple-800', description: 'Plný prístup' },
  supervisor: { label: 'Supervízor', color: 'bg-blue-100 text-blue-800', description: 'Správa tímu' },
  salesman: { label: 'Predajca', color: 'bg-green-100 text-green-800', description: 'Predajné operácie' },
};
</script>

<template>
  <div class="flex items-center gap-2">
    <Badge :color="roleInfo[role].color">{{ roleInfo[role].label }}</Badge>
    <span class="text-xs text-gray-500">{{ roleInfo[role].description }}</span>
  </div>
</template>
