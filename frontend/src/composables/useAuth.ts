import { useAuthStore } from '@/stores/auth';
import { useToast } from './useToast';
import { useRouter } from 'vue-router';

export function useAuth() {
  const store = useAuthStore();
  const toast = useToast();
  const router = useRouter();

  async function login(email: string, password: string): Promise<boolean> {
    try {
      await store.login(email, password);
      toast.success('Login successful');
      const role = store.userRole;
      if (role === 'admin') {
        await router.push('/admin');
      } else if (role === 'supervisor') {
        await router.push('/supervisor');
      } else {
        await router.push('/dashboard');
      }
      return true;
    } catch {
      toast.error('Invalid email or password');
      return false;
    }
  }

  async function logout(): Promise<void> {
    await store.logout();
    toast.info('Logged out');
    await router.push('/login');
  }

  return {
    login,
    logout,
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    hasRole: store.hasRole,
  };
}
