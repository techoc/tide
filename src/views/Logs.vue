<script setup lang="ts">
defineOptions({ name: 'LogsView' })

import { computed, ref, watch } from 'vue'
import { getMainLog, getPeerLog } from '@/api/modules/log'
import type { LogEntry, PeerLogEntry } from '@/types/qbittorrent'
import { formatTimestamp } from '@/utils/format'

const toast = useToast()
const activeTab = ref<'main' | 'peers'>('main')
const loading = ref(false)
const query = ref('')
const mainLogs = ref<LogEntry[]>([])
const peerLogs = ref<PeerLogEntry[]>([])
const selectedLevel = ref<'all' | 'normal' | 'info' | 'warning' | 'critical'>('all')

const levelItems = [
  { label: '全部级别', value: 'all' },
  { label: '普通', value: 'normal' },
  { label: '信息', value: 'info' },
  { label: '警告', value: 'warning' },
  { label: '严重', value: 'critical' },
]

const levels = computed(() => ({
  normal: selectedLevel.value === 'all' || selectedLevel.value === 'normal',
  info: selectedLevel.value === 'all' || selectedLevel.value === 'info',
  warning: selectedLevel.value === 'all' || selectedLevel.value === 'warning',
  critical: selectedLevel.value === 'all' || selectedLevel.value === 'critical',
}))

const filteredMain = computed(() => {
  const value = query.value.trim().toLowerCase()
  return value ? mainLogs.value.filter((item) => item.message.toLowerCase().includes(value)) : mainLogs.value
})

const filteredPeers = computed(() => {
  const value = query.value.trim().toLowerCase()
  return value
    ? peerLogs.value.filter((item) => `${item.ip} ${item.reason}`.toLowerCase().includes(value))
    : peerLogs.value
})

function logColor(type: number): 'neutral' | 'info' | 'warning' | 'error' {
  if (type === 4) return 'error'
  if (type === 8) return 'warning'
  if (type === 2) return 'info'
  return 'neutral'
}

function logLabel(type: number): string {
  return ({ 1: '普通', 2: '信息', 4: '严重', 8: '警告' } as Record<number, string>)[type] ?? String(type)
}

async function refresh() {
  loading.value = true
  try {
    if (activeTab.value === 'main') {
      mainLogs.value = await getMainLog(levels.value)
    } else {
      peerLogs.value = await getPeerLog()
    }
  } catch {
    toast.add({ title: '日志加载失败', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function switchTab(value: 'main' | 'peers') {
  activeTab.value = value
  await refresh()
}

watch(selectedLevel, () => void refresh())

void refresh()
</script>

<template>
  <div class="mx-auto flex h-full max-w-[1500px] flex-col px-4 py-5 sm:px-7">
    <div class="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">运行日志</h1>
        <p class="mt-1 text-sm text-muted">查看 qBittorrent 主日志和 Peer 封禁记录</p>
      </div>
      <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" :loading="loading" @click="refresh">刷新</UButton>
    </div>

    <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex gap-1 rounded-lg bg-elevated p-1">
        <UButton :variant="activeTab === 'main' ? 'solid' : 'ghost'" size="sm" @click="switchTab('main')">主日志</UButton>
        <UButton :variant="activeTab === 'peers' ? 'solid' : 'ghost'" size="sm" @click="switchTab('peers')">Peer 日志</UButton>
      </div>
      <div class="flex w-full gap-2 sm:w-auto">
        <USelect
          v-if="activeTab === 'main'"
          v-model="selectedLevel"
          :items="levelItems"
          aria-label="日志级别"
          class="w-32 shrink-0"
        />
        <UInput v-model="query" icon="i-lucide-search" placeholder="筛选日志" class="min-w-0 flex-1 sm:w-72" />
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-auto rounded-2xl border border-default bg-default">
      <div v-if="activeTab === 'main'">
        <div v-for="item in filteredMain" :key="item.id" class="grid gap-2 border-b border-default px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[160px_76px_1fr]">
          <span class="text-xs tabular-nums text-muted">{{ formatTimestamp(item.timestamp) }}</span>
          <UBadge :label="logLabel(item.type)" :color="logColor(item.type)" variant="subtle" size="sm" class="w-fit" />
          <span class="break-words font-mono text-xs">{{ item.message }}</span>
        </div>
        <UEmpty v-if="!filteredMain.length && !loading" icon="i-lucide-scroll-text" description="暂无日志" class="py-20" />
      </div>
      <div v-else>
        <div v-for="item in filteredPeers" :key="item.id" class="grid gap-2 border-b border-default px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[160px_180px_80px_1fr]">
          <span class="text-xs tabular-nums text-muted">{{ formatTimestamp(item.timestamp) }}</span>
          <span class="font-mono text-xs">{{ item.ip }}</span>
          <UBadge :label="item.blocked ? '已封禁' : '已放行'" :color="item.blocked ? 'error' : 'success'" variant="subtle" size="sm" class="w-fit" />
          <span class="text-xs text-muted">{{ item.reason || '—' }}</span>
        </div>
        <UEmpty v-if="!filteredPeers.length && !loading" icon="i-lucide-shield" description="暂无 Peer 日志" class="py-20" />
      </div>
    </div>
  </div>
</template>
