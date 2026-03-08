<script setup lang="ts">
interface Props {
  type?: 'text' | 'card' | 'avatar' | 'chart';
  lines?: number;
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  lines: 3,
});
</script>

<template>
  <div class="animate-pulse">
    <template v-if="type === 'text'">
      <div v-for="i in lines" :key="i" class="h-4 bg-gray-200 rounded mb-3 skeleton-pulse" :class="i === lines ? 'w-2/3' : 'w-full'" />
    </template>
    <template v-if="type === 'card'">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div class="h-4 bg-gray-200 rounded w-1/3 mb-4 skeleton-pulse" />
        <div class="h-8 bg-gray-200 rounded w-1/2 mb-2 skeleton-pulse" />
        <div class="h-3 bg-gray-200 rounded w-1/4 skeleton-pulse" />
      </div>
    </template>
    <template v-if="type === 'avatar'">
      <div class="w-10 h-10 bg-gray-200 rounded-full skeleton-pulse" />
    </template>
    <template v-if="type === 'chart'">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div class="h-4 bg-gray-200 rounded w-1/4 mb-6 skeleton-pulse" />
        <div class="h-48 bg-gray-200 rounded skeleton-pulse" />
      </div>
    </template>
  </div>
</template>
