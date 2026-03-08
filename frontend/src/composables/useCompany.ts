import { useCompaniesStore } from '@/stores/companies';
import { useToast } from './useToast';
import type { Company } from '@/types';

export function useCompany() {
  const store = useCompaniesStore();
  const toast = useToast();

  async function saveCompany(id: string, data: Partial<Company>): Promise<boolean> {
    try {
      await store.updateCompany(id, data);
      toast.success('Firma bola aktualizovaná');
      return true;
    } catch {
      toast.error('Nepodarilo sa aktualizovať firmu');
      return false;
    }
  }

  async function createCompany(data: Partial<Company>): Promise<Company | null> {
    try {
      const company = await store.createCompany(data);
      toast.success('Firma bola vytvorená');
      return company;
    } catch {
      toast.error('Nepodarilo sa vytvoriť firmu');
      return null;
    }
  }

  return {
    saveCompany,
    createCompany,
  };
}
