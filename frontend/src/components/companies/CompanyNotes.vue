<script setup lang="ts">
import { ref } from 'vue';
import Button from '@/components/ui/Button.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { formatTimeAgo } from '@/utils/formatDate';
import api from '@/utils/api';
import type { Note } from '@/types';

interface Props {
  companyId: string;
}

const props = defineProps<Props>();
const authStore = useAuthStore();
const toast = useToast();

const notes = ref<Note[]>([]);
const newNote = ref('');
const loading = ref(false);
const submitting = ref(false);

async function fetchNotes(): Promise<void> {
  loading.value = true;
  try {
    const response = await api.get(`/api/notes/${props.companyId}`);
    notes.value = response.data;
  } finally {
    loading.value = false;
  }
}

async function createNote(): Promise<void> {
  if (!newNote.value.trim()) return;
  submitting.value = true;
  try {
    const response = await api.post(`/api/notes/${props.companyId}`, { content: newNote.value });
    notes.value.unshift({
      ...response.data,
      authorName: authStore.userName,
      attachments: [],
    });
    newNote.value = '';
    toast.success('Note added');
  } catch {
    toast.error('Failed to add note');
  } finally {
    submitting.value = false;
  }
}

async function deleteNote(noteId: string): Promise<void> {
  try {
    await api.delete(`/api/notes/${noteId}`);
    notes.value = notes.value.filter(n => n.id !== noteId);
    toast.success('Note deleted');
  } catch (err: unknown) {
    const error = err as { response?: { data?: { error?: string } } };
    toast.error(error.response?.data?.error || 'Failed to delete note');
  }
}

async function uploadFile(noteId: string, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const formData = new FormData();
  formData.append('file', input.files[0]);

  try {
    const response = await api.post(`/api/notes/${noteId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const note = notes.value.find(n => n.id === noteId);
    if (note) {
      note.attachments.push(response.data);
    }
    toast.success('File uploaded');
  } catch {
    toast.error('Failed to upload file');
  }
  input.value = '';
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function canDelete(note: Note): boolean {
  if (authStore.userRole === 'admin') return true;
  if (authStore.userRole === 'supervisor') return true;
  if (note.authorId === authStore.userId) {
    const created = new Date(note.createdAt).getTime();
    const oneHour = 60 * 60 * 1000;
    return Date.now() - created < oneHour;
  }
  return false;
}

fetchNotes();
</script>

<template>
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">Notes & Files</h3>

    <!-- New note form -->
    <div class="mb-6">
      <textarea
        v-model="newNote"
        rows="3"
        class="input-field text-sm mb-2"
        placeholder="Write a note... (supports markdown)"
      />
      <Button size="sm" :loading="submitting" :disabled="!newNote.trim()" @click="createNote">
        Add Note
      </Button>
    </div>

    <!-- Notes list -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-1/3 mb-2 skeleton-pulse" />
        <div class="h-3 bg-gray-200 rounded w-full mb-1 skeleton-pulse" />
        <div class="h-3 bg-gray-200 rounded w-2/3 skeleton-pulse" />
      </div>
    </div>

    <div v-else-if="notes.length === 0" class="text-center py-8">
      <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      <p class="text-gray-500 text-sm">No notes yet</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="note in notes"
        :key="note.id"
        class="border border-gray-200 rounded-lg p-4"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">
              {{ getInitials(note.authorName) }}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ note.authorName }}</p>
              <p class="text-xs text-gray-500">{{ formatTimeAgo(note.createdAt) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <label class="cursor-pointer text-gray-400 hover:text-primary-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <input type="file" class="hidden" @change="uploadFile(note.id, $event)" />
            </label>
            <button
              v-if="canDelete(note)"
              class="text-gray-400 hover:text-red-500"
              @click="deleteNote(note.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ note.content }}</div>
        <div v-if="note.attachments?.length" class="mt-3 flex flex-wrap gap-2">
          <a
            v-for="att in note.attachments"
            :key="att.id"
            :href="att.fileUrl"
            target="_blank"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {{ att.fileName }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
