import { useCallsStore } from '@/stores/calls';
import { useToast } from './useToast';

export function useCallLog() {
  const store = useCallsStore();
  const toast = useToast();

  async function logAnswered(companyId: string, data: {
    calledAt?: string;
    shipmentCount?: number;
    shipmentDestinations?: string[];
    shippingCompany?: string;
    notes?: string;
  }): Promise<boolean> {
    try {
      await store.logCall({
        companyId,
        status: 'answered',
        ...data,
      });
      toast.success('Hovor zaznamenaný ako zdvihnutý');
      return true;
    } catch {
      toast.error('Nepodarilo sa zaznamenať hovor');
      return false;
    }
  }

  async function logNoAnswer(companyId: string): Promise<boolean> {
    try {
      await store.logCall({
        companyId,
        status: 'no_answer',
      });
      toast.warning('Hovor zaznamenaný ako nezdvihnutý');
      return true;
    } catch {
      toast.error('Nepodarilo sa zaznamenať hovor');
      return false;
    }
  }

  return {
    logAnswered,
    logNoAnswer,
  };
}
