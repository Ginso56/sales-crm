import { useCompaniesStore } from '@/stores/companies';
import { useToast } from './useToast';
import type { Company } from '@/types';

export function useCompany() {
  const store = useCompaniesStore();
  const toast = useToast();

  async function saveCompany(id: string, data: Partial<Company>): Promise<boolean> {
    try {
      await store.updateCompany(id, data);
      toast.success('Company updated successfully');
      return true;
    } catch {
      toast.error('Failed to update company');
      return false;
    }
  }

  async function createCompany(data: Partial<Company>): Promise<Company | null> {
    try {
      const company = await store.createCompany(data);
      toast.success('Company created successfully');
      return company;
    } catch {
      toast.error('Failed to create company');
      return null;
    }
  }

  return {
    saveCompany,
    createCompany,
  };
}
