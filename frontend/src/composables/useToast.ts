import { ref } from 'vue';
import type { ToastMessage } from '@/types';

const toasts = ref<ToastMessage[]>([]);

export function useToast() {
  function addToast(type: ToastMessage['type'], message: string): void {
    const id = crypto.randomUUID();
    toasts.value.push({ id, type, message });
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }

  function removeToast(id: string): void {
    const idx = toasts.value.findIndex(t => t.id === id);
    if (idx !== -1) {
      toasts.value.splice(idx, 1);
    }
  }

  function success(message: string): void {
    addToast('success', message);
  }

  function error(message: string): void {
    addToast('error', message);
  }

  function info(message: string): void {
    addToast('info', message);
  }

  function warning(message: string): void {
    addToast('warning', message);
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
}
