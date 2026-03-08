<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue';
import type { LeaderboardEntry } from '@/types';

interface Props {
  entries: LeaderboardEntry[];
}

defineProps<Props>();
</script>

<template>
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">Team Leaderboard</h3>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Calls</th>
            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Answer %</th>
            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">New Clients</th>
            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Shipments</th>
            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Goal %</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="(entry, idx) in entries" :key="entry.userId" class="hover:bg-gray-50">
            <td class="px-3 py-2.5 text-sm font-medium text-gray-900">
              <span v-if="idx === 0" class="text-amber-500">1</span>
              <span v-else-if="idx === 1" class="text-gray-400">2</span>
              <span v-else-if="idx === 2" class="text-amber-700">3</span>
              <span v-else>{{ idx + 1 }}</span>
            </td>
            <td class="px-3 py-2.5 text-sm font-medium text-gray-900">{{ entry.name }}</td>
            <td class="px-3 py-2.5 text-sm text-right text-gray-600">{{ entry.callsMonth }}</td>
            <td class="px-3 py-2.5 text-sm text-right">
              <span :class="entry.answerRate >= 50 ? 'text-green-600' : 'text-red-600'">
                {{ entry.answerRate }}%
              </span>
            </td>
            <td class="px-3 py-2.5 text-sm text-right text-gray-600">{{ entry.newClients }}</td>
            <td class="px-3 py-2.5 text-sm text-right text-gray-600">{{ entry.shipments }}</td>
            <td class="px-3 py-2.5 text-sm text-right">
              <Badge
                v-if="entry.goalPct !== null"
                :color="entry.goalPct >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                size="sm"
              >
                {{ entry.goalPct }}%
              </Badge>
              <span v-else class="text-gray-400">--</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
