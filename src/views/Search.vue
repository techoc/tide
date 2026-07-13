<script setup lang="ts">
defineOptions({ name: 'SearchView' })

import { computed, onUnmounted, ref } from 'vue'
import { addTorrent } from '@/api/modules/torrents'
import {
  deleteSearch,
  getSearchPlugins,
  getSearchResults,
  startSearch,
  stopSearch,
  updateSearchPlugins,
} from '@/api/modules/search'
import type { SearchPlugin, SearchResult } from '@/types/qbittorrent'
import { formatSize } from '@/utils/format'

const toast = useToast()
const keyword = ref('')
const category = ref('all')
const loading = ref(false)
const updatingPlugins = ref(false)
const searchId = ref<number | null>(null)
const status = ref<'Running' | 'Stopped'>('Stopped')
const results = ref<SearchResult[]>([])
const plugins = ref<SearchPlugin[]>([])
let timer: ReturnType<typeof setInterval> | undefined

const categoryItems = [
  { label: '全部分类', value: 'all' },
  { label: '电影', value: 'movies' },
  { label: '剧集', value: 'tv' },
  { label: '音乐', value: 'music' },
  { label: '游戏', value: 'games' },
  { label: '软件', value: 'software' },
  { label: '图书', value: 'books' },
  { label: '动漫', value: 'anime' },
]

const enabledPluginCount = computed(() => plugins.value.filter((item) => item.enabled).length)

async function loadPlugins() {
  try {
    plugins.value = await getSearchPlugins()
  } catch {
    // 搜索引擎可能未安装 Python，搜索时会显示更明确的错误。
  }
}

async function refreshResults() {
  if (searchId.value == null) return
  const data = await getSearchResults(searchId.value)
  results.value = data.results
  status.value = data.status
  if (data.status === 'Stopped' && timer) {
    clearInterval(timer)
    timer = undefined
    loading.value = false
  }
}

async function handleSearch() {
  const pattern = keyword.value.trim()
  if (!pattern || loading.value) return
  if (searchId.value != null) {
    await deleteSearch(searchId.value).catch(() => undefined)
  }
  loading.value = true
  results.value = []
  try {
    searchId.value = await startSearch(pattern, category.value, 'enabled')
    status.value = 'Running'
    await refreshResults()
    timer = setInterval(() => void refreshResults(), 1500)
  } catch {
    loading.value = false
    toast.add({ title: '搜索启动失败', description: '请确认已安装 Python 和搜索插件', color: 'error' })
  }
}

async function handleStop() {
  if (searchId.value == null) return
  await stopSearch(searchId.value)
  await refreshResults()
}

async function handleAdd(result: SearchResult) {
  try {
    await addTorrent({ urls: result.fileUrl })
    toast.add({ title: '已提交到下载队列', color: 'success' })
  } catch {
    toast.add({ title: '添加下载失败', color: 'error' })
  }
}

async function handleUpdatePlugins() {
  updatingPlugins.value = true
  try {
    await updateSearchPlugins()
    await loadPlugins()
    toast.add({ title: '搜索插件已更新', color: 'success' })
  } catch {
    toast.add({ title: '插件更新失败', color: 'error' })
  } finally {
    updatingPlugins.value = false
  }
}

void loadPlugins()
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="mx-auto h-full max-w-[1500px] overflow-y-auto px-4 py-5 sm:px-7">
    <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">资源搜索</h1>
        <p class="mt-1 text-sm text-muted">通过 qBittorrent 搜索插件查找资源并直接加入下载</p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="soft"
        :loading="updatingPlugins"
        @click="handleUpdatePlugins"
      >
        更新插件（{{ enabledPluginCount }} 已启用）
      </UButton>
    </div>

    <UCard class="mb-4">
      <form class="flex flex-col gap-3 md:flex-row" @submit.prevent="handleSearch">
        <UInput v-model="keyword" icon="i-lucide-search" placeholder="输入关键词" class="flex-1" autofocus />
        <USelect v-model="category" :items="categoryItems" class="w-full md:w-44" />
        <UButton type="submit" icon="i-lucide-search" :loading="loading">搜索</UButton>
        <UButton v-if="status === 'Running'" color="neutral" variant="soft" icon="i-lucide-square" @click="handleStop">停止</UButton>
      </form>
    </UCard>

    <div class="mb-3 flex items-center justify-between text-sm text-muted">
      <span>找到 {{ results.length }} 条结果</span>
      <span v-if="status === 'Running'" class="inline-flex items-center gap-1.5 text-primary">
        <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> 搜索中
      </span>
    </div>

    <div v-if="results.length" class="overflow-hidden rounded-2xl border border-default bg-default">
      <div v-for="result in results" :key="`${result.siteUrl}-${result.fileUrl}`" class="flex flex-col gap-3 border-b border-default p-4 last:border-b-0 md:flex-row md:items-center">
        <div class="min-w-0 flex-1">
          <a :href="result.descrLink" target="_blank" rel="noopener" class="font-medium text-default hover:text-primary">{{ result.fileName }}</a>
          <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>{{ formatSize(result.fileSize) }}</span>
            <span class="text-emerald-500">做种 {{ result.nbSeeders }}</span>
            <span>下载 {{ result.nbLeechers }}</span>
            <span>{{ result.siteUrl }}</span>
          </div>
        </div>
        <UButton size="sm" icon="i-lucide-download" @click="handleAdd(result)">下载</UButton>
      </div>
    </div>
    <UEmpty v-else icon="i-lucide-search-x" description="输入关键词开始搜索" class="py-20" />
  </div>
</template>
