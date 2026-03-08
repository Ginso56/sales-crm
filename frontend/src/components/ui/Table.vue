<script setup lang="ts">
interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

interface Props {
  columns: Column[];
  loading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  skeletonRows?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  sortBy: '',
  sortOrder: 'desc',
  skeletonRows: 5,
});

const emit = defineEmits<{
  sort: [key: string];
}>();

function handleSort(column: Column): void {
  if (column.sortable) {
    emit('sort', column.key);
  }
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-gray-200">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50 sticky top-0">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="col.width ? { width: col.width } : {}"
            class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            :class="{ 'cursor-pointer hover:text-gray-700': col.sortable }"
            @click="handleSort(col)"
          >
            <div class="flex items-center gap-1">
              {{ col.label }}
              <template v-if="col.sortable && sortBy === col.key">
                <svg v-if="sortOrder === 'asc'" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
                </svg>
                <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
                </svg>
              </template>
            </div>
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <template v-if="loading">
          <tr v-for="i in skeletonRows" :key="'skeleton-' + i" class="animate-pulse">
            <td v-for="col in columns" :key="col.key" class="px-4 py-3">
              <div class="h-4 bg-gray-200 rounded skeleton-pulse" />
            </td>
          </tr>
        </template>
        <template v-else>
          <slot />
        </template>
      </tbody>
    </table>
  </div>
</template>
