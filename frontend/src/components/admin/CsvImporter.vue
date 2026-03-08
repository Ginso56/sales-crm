<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import { useToast } from '@/composables/useToast';
import api from '@/utils/api';

const toast = useToast();

const step = ref(1);
const csvText = ref('');
const headers = ref<string[]>([]);
const rows = ref<Record<string, string>[]>([]);
const columnMapping = ref<Record<string, string>>({});
const duplicateAction = ref<'skip' | 'overwrite'>('skip');
const importing = ref(false);
const importResult = ref<{
  total: number;
  success: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ row: number; error: string }>;
} | null>(null);

const dbFields = [
  { key: 'name', label: 'Company Name', required: true },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'website', label: 'Website', required: false },
  { key: 'address', label: 'Address', required: false },
  { key: 'country', label: 'Country', required: false },
  { key: 'industry', label: 'Industry', required: false },
];

const previewRows = computed(() => rows.value.slice(0, 10));

const mappedPreview = computed(() => {
  return previewRows.value.map(row => {
    const mapped: Record<string, string> = {};
    for (const field of dbFields) {
      const csvCol = columnMapping.value[field.key];
      mapped[field.key] = csvCol ? (row[csvCol] || '') : '';
    }
    return mapped;
  });
});

function handleFileUpload(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    csvText.value = e.target?.result as string;
    parseCSV();
  };
  reader.readAsText(input.files[0]);
}

function parseCSV(): void {
  const lines = csvText.value.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    toast.error('CSV must have at least a header row and one data row');
    return;
  }

  headers.value = parseLine(lines[0]);
  rows.value = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headers.value.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.value.push(row);
  }

  // Auto-map obvious columns
  for (const field of dbFields) {
    const match = headers.value.find(h =>
      h.toLowerCase().includes(field.key.toLowerCase()) ||
      h.toLowerCase().includes(field.label.toLowerCase())
    );
    if (match) columnMapping.value[field.key] = match;
  }

  step.value = 2;
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (inQuotes) {
      if (line[i] === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += line[i];
    } else {
      if (line[i] === '"') inQuotes = true;
      else if (line[i] === ',') { result.push(current.trim()); current = ''; }
      else current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}

function goToPreview(): void {
  if (!columnMapping.value.name) {
    toast.error('Company Name mapping is required');
    return;
  }
  step.value = 3;
}

async function startImport(): Promise<void> {
  importing.value = true;
  try {
    const response = await api.post('/api/import/csv', {
      csvData: csvText.value,
      columnMapping: columnMapping.value,
      duplicateAction: duplicateAction.value,
    });
    importResult.value = response.data;
    step.value = 5;
    toast.success(`Imported ${response.data.success} companies`);
  } catch {
    toast.error('Import failed');
  } finally {
    importing.value = false;
  }
}

function downloadErrors(): void {
  if (!importResult.value?.errorDetails.length) return;
  const csv = 'Row,Error\n' + importResult.value.errorDetails.map(e => `${e.row},"${e.error}"`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'import-errors.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function reset(): void {
  step.value = 1;
  csvText.value = '';
  headers.value = [];
  rows.value = [];
  columnMapping.value = {};
  importResult.value = null;
}
</script>

<template>
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">CSV Import</h3>

    <!-- Steps indicator -->
    <div class="flex items-center gap-2 mb-6">
      <div v-for="s in 5" :key="s" :class="[
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
        s === step ? 'bg-primary-600 text-white' : s < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500',
      ]">
        {{ s }}
      </div>
    </div>

    <!-- Step 1: Upload -->
    <div v-if="step === 1">
      <p class="text-sm text-gray-600 mb-4">Upload a CSV file exported from Google Sheets</p>
      <label class="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
        <svg class="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span class="text-sm text-gray-500">Click to upload CSV</span>
        <input type="file" accept=".csv" class="hidden" @change="handleFileUpload" />
      </label>
    </div>

    <!-- Step 2: Column mapping -->
    <div v-if="step === 2">
      <p class="text-sm text-gray-600 mb-4">Map CSV columns to database fields</p>
      <p class="text-xs text-gray-500 mb-3">Detected {{ headers.length }} columns, {{ rows.length }} rows</p>
      <div class="space-y-3">
        <div v-for="field in dbFields" :key="field.key" class="flex items-center gap-3">
          <label :class="['text-sm w-32', field.required ? 'font-medium' : '']">
            {{ field.label }} {{ field.required ? '*' : '' }}
          </label>
          <select v-model="columnMapping[field.key]" class="input-field flex-1">
            <option value="">-- Skip --</option>
            <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-6">
        <Button variant="ghost" @click="step = 1">Back</Button>
        <Button @click="goToPreview">Preview</Button>
      </div>
    </div>

    <!-- Step 3: Preview -->
    <div v-if="step === 3">
      <p class="text-sm text-gray-600 mb-4">Preview first 10 rows with mapped data</p>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th v-for="field in dbFields" :key="field.key" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                {{ field.label }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(row, idx) in mappedPreview" :key="idx" class="hover:bg-gray-50">
              <td v-for="field in dbFields" :key="field.key" class="px-3 py-2 text-gray-700">
                {{ row[field.key] || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex justify-end gap-3 mt-6">
        <Button variant="ghost" @click="step = 2">Back</Button>
        <Button @click="step = 4">Continue</Button>
      </div>
    </div>

    <!-- Step 4: Duplicate handling -->
    <div v-if="step === 4">
      <p class="text-sm text-gray-600 mb-4">How should duplicates be handled? (matched by phone or company name)</p>
      <div class="space-y-3 mb-6">
        <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50" :class="duplicateAction === 'skip' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'">
          <input v-model="duplicateAction" type="radio" value="skip" class="text-primary-600" />
          <div>
            <p class="text-sm font-medium">Skip duplicates</p>
            <p class="text-xs text-gray-500">Existing companies will not be modified</p>
          </div>
        </label>
        <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50" :class="duplicateAction === 'overwrite' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'">
          <input v-model="duplicateAction" type="radio" value="overwrite" class="text-primary-600" />
          <div>
            <p class="text-sm font-medium">Overwrite duplicates</p>
            <p class="text-xs text-gray-500">Existing companies will be updated with new data</p>
          </div>
        </label>
      </div>
      <p class="text-sm text-gray-600">Ready to import <strong>{{ rows.length }}</strong> rows.</p>
      <div class="flex justify-end gap-3 mt-6">
        <Button variant="ghost" @click="step = 3">Back</Button>
        <Button :loading="importing" @click="startImport">Import</Button>
      </div>
    </div>

    <!-- Step 5: Results -->
    <div v-if="step === 5 && importResult">
      <div class="space-y-3">
        <div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-medium text-green-800">{{ importResult.success }} imported successfully</span>
        </div>
        <div v-if="importResult.skipped > 0" class="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
          <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span class="text-sm font-medium text-yellow-800">{{ importResult.skipped }} skipped (duplicates)</span>
        </div>
        <div v-if="importResult.errors > 0" class="flex items-center justify-between p-3 bg-red-50 rounded-lg">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium text-red-800">{{ importResult.errors }} errors</span>
          </div>
          <Button variant="ghost" size="sm" @click="downloadErrors">Download Error Log</Button>
        </div>
      </div>
      <div class="flex justify-end mt-6">
        <Button @click="reset">Import Another</Button>
      </div>
    </div>
  </div>
</template>
