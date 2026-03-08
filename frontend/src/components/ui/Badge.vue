<script setup lang="ts">
interface Props {
  color?: string;
  size?: 'sm' | 'md';
}

withDefaults(defineProps<Props>(), {
  color: 'bg-gray-100 text-gray-800',
  size: 'md',
});
</script>

<template>
  <span
    :class="[
      'inline-flex items-center font-medium rounded-full',
      color,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
    ]"
  >
    <slot />
  </span>
</template>
