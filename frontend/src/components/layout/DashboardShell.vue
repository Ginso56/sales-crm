<script setup lang="ts">
import { ref } from 'vue';
import Sidebar from './Sidebar.vue';

const sidebarOpen = ref(true);
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Sidebar />
    <div class="lg:ml-64 transition-all duration-300">
      <main class="p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
