<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import Button from '@/components/ui/Button.vue';

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

const email = ref('');
const password = ref('');
const loading = ref(false);
const errors = ref<{ email?: string; password?: string }>({});

function validate(): boolean {
  errors.value = {};
  if (!email.value) errors.value.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) errors.value.email = 'Invalid email';
  if (!password.value) errors.value.password = 'Password is required';
  return Object.keys(errors.value).length === 0;
}

async function handleLogin(): Promise<void> {
  if (!validate()) return;
  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    toast.success('Welcome back!');
    const role = authStore.userRole;
    if (role === 'admin') await router.push('/admin');
    else if (role === 'supervisor') await router.push('/supervisor');
    else await router.push('/dashboard');
  } catch {
    toast.error('Invalid email or password');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Sales CRM</h1>
        <p class="text-gray-400 mt-2">Sign in to your account</p>
      </div>

      <form class="bg-white rounded-xl shadow-xl p-8" @submit.prevent="handleLogin">
        <div class="space-y-5">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              class="input-field"
              :class="{ 'border-red-500': errors.email }"
              placeholder="you@company.com"
            />
            <p v-if="errors.email" class="mt-1 text-sm text-red-500">{{ errors.email }}</p>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="input-field"
              :class="{ 'border-red-500': errors.password }"
              placeholder="Enter your password"
            />
            <p v-if="errors.password" class="mt-1 text-sm text-red-500">{{ errors.password }}</p>
          </div>

          <Button type="submit" :loading="loading" class="w-full">
            Sign In
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>
