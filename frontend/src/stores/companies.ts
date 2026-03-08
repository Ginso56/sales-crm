import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/utils/api';
import type { Company, Pagination, CompanyHistory } from '@/types';

export const useCompaniesStore = defineStore('companies', () => {
  const companies = ref<Company[]>([]);
  const currentCompany = ref<Company | null>(null);
  const history = ref<CompanyHistory[]>([]);
  const pagination = ref<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const loading = ref(false);

  const filterOptions = ref<{ industries: string[]; countries: string[] }>({ industries: [], countries: [] });

  async function fetchFilterOptions(): Promise<void> {
    try {
      const response = await api.get('/api/companies/filters');
      filterOptions.value = response.data;
    } catch {
      // silently fail
    }
  }

  async function fetchCompanies(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    country?: string;
    industry?: string;
    assignedTo?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Promise<void> {
    loading.value = true;
    try {
      const response = await api.get('/api/companies', { params });
      companies.value = response.data.data;
      pagination.value = response.data.pagination;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCompany(id: string): Promise<void> {
    loading.value = true;
    try {
      const response = await api.get(`/api/companies/${id}`);
      currentCompany.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  async function createCompany(data: Partial<Company>): Promise<Company> {
    const response = await api.post('/api/companies', data);
    return response.data;
  }

  async function updateCompany(id: string, data: Partial<Company>): Promise<Company> {
    const response = await api.put(`/api/companies/${id}`, data);
    currentCompany.value = response.data;
    return response.data;
  }

  async function fetchHistory(companyId: string): Promise<void> {
    const response = await api.get(`/api/companies/${companyId}/history`);
    history.value = response.data;
  }

  return {
    companies,
    currentCompany,
    history,
    pagination,
    loading,
    filterOptions,
    fetchCompanies,
    fetchCompany,
    createCompany,
    updateCompany,
    fetchHistory,
    fetchFilterOptions,
  };
});
