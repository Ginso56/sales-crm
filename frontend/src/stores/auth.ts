import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/utils/api';
import type { User, UserRole } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!user.value);
  const userRole = computed(() => user.value?.role);
  const userId = computed(() => user.value?.id);
  const userName = computed(() => user.value?.name);

  function hasRole(...roles: UserRole[]): boolean {
    return !!user.value && roles.includes(user.value.role);
  }

  async function login(email: string, password: string): Promise<void> {
    loading.value = true;
    try {
      const response = await api.post('/api/auth/login', { email, password });
      user.value = response.data.user;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } finally {
      user.value = null;
    }
  }

  async function fetchMe(): Promise<void> {
    try {
      const response = await api.get('/api/auth/me');
      user.value = response.data.user;
    } catch {
      user.value = null;
    }
  }

  function clearAuth(): void {
    user.value = null;
  }

  return {
    user,
    loading,
    isAuthenticated,
    userRole,
    userId,
    userName,
    hasRole,
    login,
    logout,
    fetchMe,
    clearAuth,
  };
});
