<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import Toast from '@/components/ui/Toast.vue';

const authStore = useAuthStore();
</script>

<template>
  <router-view />
  <Toast />
</template>
