<script setup lang="ts">
defineOptions({ name: 'SearchView' })

import axios from 'axios'
import { computed, onUnmounted, ref } from 'vue'
import { addTorrent } from '@/api/modules/torrents'
import {
  deleteSearch,
  enableSearchPlugin,
  getSearchPlugins,
  getSearchResults,
  installSearchPlugin,
  startSearch,
  stopSearch,
  uninstallSearchPlugin,
  updateSearchPlugins,
} from '@/api/modules/search'
import type { SearchPlugin, SearchResult } from '@/types/qbittorrent'
import { formatSize } from '@/utils/format'

const toast = useToast()
const keyword = ref('')
const category = ref('all')
const selectedPlugin = ref('enabled')
const loading = ref(false)
const stopping = ref(false)
const pluginsLoading = ref(false)
const updatingPlugins = ref(false)
const installingPlugin = ref(false)
const changingPlugin = ref<string | null>(null)
const removingPlugin = ref<string | null>(null)
const pluginSource = ref('')
const pluginError = ref('')
const searchError = ref('')
const searchId = ref<number | null>(null)
const status = ref<'Running' | 'Stopped'>('Stopped')
const results = ref<SearchResult[]>([])
const totalResults = ref(0)
const hasSearched = ref(false)
const plugins = ref<SearchPlugin[]>([])
let timer: ReturnType<typeof setTimeout> | undefined

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

const enabledPlugins = computed(() => plugins.value.filter((item) => item.enabled))
const pluginItems = computed(() => [
  { label: `全部已启用插件（${enabledPlugins.value.length}）`, value: 'enabled' },
  ...enabledPlugins.value.map((item) => ({ label: item.fullName || item.name, value: item.name })),
])
const canSearch = computed(
  () =>
    Boolean(keyword.value.trim()) &&
    enabledPlugins.value.length > 0 &&
    !pluginsLoading.value &&
    !loading.value,
)

function errorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fallback
  if (error.response?.status === 409) {
    return 'qBittorrent 搜索引擎不可用，请确认 Windows 中的 python 命令可用，并至少启用一个搜索插件'
  }
  const data = error.response?.data
  if (typeof data === 'string' && data.trim()) return data.trim()
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message
  }
  return error.message || fallback
}

function clearPolling() {
  if (!timer) return
  clearTimeout(timer)
  timer = undefined
}

function schedulePolling() {
  clearPolling()
  timer = setTimeout(() => void refreshResults(), 1500)
}

async function loadPlugins(showToast = false) {
  pluginsLoading.value = true
  pluginError.value = ''
  try {
    plugins.value = await getSearchPlugins()
    if (
      selectedPlugin.value !== 'enabled' &&
      !plugins.value.some((item) => item.enabled && item.name === selectedPlugin.value)
    ) {
      selectedPlugin.value = 'enabled'
    }
    if (showToast) toast.add({ title: '插件列表已刷新', color: 'success' })
  } catch (error) {
    plugins.value = []
    pluginError.value = errorMessage(error, '无法读取搜索插件')
  } finally {
    pluginsLoading.value = false
  }
}

async function refreshResults() {
  if (searchId.value == null) return
  try {
    const data = await getSearchResults(searchId.value)
    results.value = data.results
    totalResults.value = data.total
    status.value = data.status
    searchError.value = ''
    if (data.status === 'Running') {
      schedulePolling()
    } else {
      clearPolling()
      loading.value = false
    }
  } catch (error) {
    clearPolling()
    loading.value = false
    status.value = 'Stopped'
    searchError.value = errorMessage(error, '获取搜索结果失败')
  }
}

async function discardPreviousSearch() {
  clearPolling()
  if (searchId.value == null) return
  if (status.value === 'Running') await stopSearch(searchId.value).catch(() => undefined)
  await deleteSearch(searchId.value).catch(() => undefined)
  searchId.value = null
}

async function handleSearch() {
  const pattern = keyword.value.trim()
  if (!pattern || loading.value) return
  if (!enabledPlugins.value.length) {
    toast.add({ title: '没有可用的搜索插件', description: '请先安装或启用搜索插件', color: 'warning' })
    return
  }

  await discardPreviousSearch()
  loading.value = true
  hasSearched.value = true
  searchError.value = ''
  results.value = []
  totalResults.value = 0
  try {
    const pluginSelector = selectedPlugin.value === 'enabled' ? 'enabled' : [selectedPlugin.value]
    searchId.value = await startSearch(pattern, category.value, pluginSelector)
    status.value = 'Running'
    await refreshResults()
  } catch (error) {
    loading.value = false
    status.value = 'Stopped'
    searchError.value = errorMessage(error, '搜索启动失败')
  }
}

async function handleStop() {
  if (searchId.value == null || stopping.value) return
  stopping.value = true
  clearPolling()
  try {
    await stopSearch(searchId.value)
    await refreshResults()
  } catch (error) {
    searchError.value = errorMessage(error, '停止搜索失败')
  } finally {
    clearPolling()
    stopping.value = false
    loading.value = false
    status.value = 'Stopped'
  }
}

async function handleAdd(result: SearchResult) {
  try {
    await addTorrent({ urls: result.fileUrl })
    toast.add({ title: '已提交到下载队列', color: 'success' })
  } catch (error) {
    toast.add({ title: '添加下载失败', description: errorMessage(error, '无法添加该搜索结果'), color: 'error' })
  }
}

async function handleUpdatePlugins() {
  updatingPlugins.value = true
  try {
    await updateSearchPlugins()
    await loadPlugins()
    toast.add({ title: '搜索插件已更新', color: 'success' })
  } catch (error) {
    toast.add({ title: '插件更新失败', description: errorMessage(error, '无法更新插件'), color: 'error' })
  } finally {
    updatingPlugins.value = false
  }
}

async function handleInstallPlugin() {
  const source = pluginSource.value.trim()
  if (!source || installingPlugin.value) return
  installingPlugin.value = true
  try {
    await installSearchPlugin([source])
    pluginSource.value = ''
    await loadPlugins()
    toast.add({ title: '搜索插件已安装', color: 'success' })
  } catch (error) {
    toast.add({ title: '插件安装失败', description: errorMessage(error, '无法安装插件'), color: 'error' })
  } finally {
    installingPlugin.value = false
  }
}

async function handlePluginEnabled(plugin: SearchPlugin) {
  if (changingPlugin.value) return
  changingPlugin.value = plugin.name
  try {
    await enableSearchPlugin([plugin.name], !plugin.enabled)
    await loadPlugins()
  } catch (error) {
    toast.add({ title: '插件状态修改失败', description: errorMessage(error, '无法修改插件'), color: 'error' })
  } finally {
    changingPlugin.value = null
  }
}

async function handleUninstallPlugin(plugin: SearchPlugin) {
  if (removingPlugin.value) return
  removingPlugin.value = plugin.name
  try {
    await uninstallSearchPlugin([plugin.name])
    await loadPlugins()
    toast.add({ title: '搜索插件已卸载', color: 'success' })
  } catch (error) {
    toast.add({ title: '卸载失败', description: errorMessage(error, '无法卸载插件'), color: 'error' })
  } finally {
    removingPlugin.value = null
  }
}

void loadPlugins()
onUnmounted(() => {
  clearPolling()
  if (searchId.value != null && status.value === 'Running') {
    void stopSearch(searchId.value).catch(() => undefined)
  }
})
</script>

<template>
  <div class="mx-auto h-full max-w-[1500px] overflow-y-auto px-4 py-5 sm:px-7">
    <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">资源搜索</h1>
        <p class="mt-1 text-sm text-muted">通过 qBittorrent 搜索插件查找资源并直接加入下载</p>
      </div>
      <div class="flex gap-2">
        <UButton
          icon="i-lucide-rotate-cw"
          color="neutral"
          variant="soft"
          :loading="pluginsLoading"
          @click="loadPlugins(true)"
        >
          刷新列表
        </UButton>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="soft"
          :loading="updatingPlugins"
          @click="handleUpdatePlugins"
        >
          更新插件
        </UButton>
      </div>
    </div>

    <UAlert
      v-if="pluginError"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="搜索引擎不可用"
      :description="pluginError"
      class="mb-4"
    />

    <UCard class="mb-4">
      <form class="flex flex-col gap-3 md:flex-row" @submit.prevent="handleSearch">
        <UInput v-model="keyword" icon="i-lucide-search" placeholder="输入关键词" class="flex-1" autofocus />
        <USelect v-model="category" :items="categoryItems" class="w-full md:w-40" />
        <USelect
          v-model="selectedPlugin"
          :items="pluginItems"
          :disabled="!enabledPlugins.length"
          aria-label="搜索插件"
          class="w-full md:w-56"
        />
        <UButton type="submit" icon="i-lucide-search" :loading="loading" :disabled="!canSearch">搜索</UButton>
        <UButton
          v-if="status === 'Running'"
          color="neutral"
          variant="soft"
          icon="i-lucide-square"
          :loading="stopping"
          @click="handleStop"
        >
          停止
        </UButton>
      </form>
      <p v-if="!pluginsLoading && !enabledPlugins.length" class="mt-3 text-sm text-warning">
        尚无已启用的搜索插件，请在下方安装或启用插件后再搜索。
      </p>
    </UCard>

    <UCard class="mb-4">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="font-semibold">搜索插件</h2>
            <p class="mt-0.5 text-xs text-muted">已安装 {{ plugins.length }} 个，已启用 {{ enabledPlugins.length }} 个</p>
          </div>
        </div>
      </template>

      <form class="mb-4 flex flex-col gap-2 sm:flex-row" @submit.prevent="handleInstallPlugin">
        <UInput
          v-model="pluginSource"
          icon="i-lucide-link"
          placeholder="输入搜索插件的 .py 文件 URL"
          class="min-w-0 flex-1"
        />
        <UButton
          type="submit"
          color="neutral"
          variant="soft"
          icon="i-lucide-package-plus"
          :loading="installingPlugin"
          :disabled="!pluginSource.trim()"
        >
          安装插件
        </UButton>
      </form>

      <div v-if="plugins.length" class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="plugin in plugins"
          :key="plugin.name"
          class="flex items-center justify-between gap-3 rounded-xl border border-default p-3"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{{ plugin.fullName || plugin.name }}</p>
            <p class="truncate text-xs text-muted">{{ plugin.version || '未知版本' }} · {{ plugin.url || plugin.name }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <UButton
              size="xs"
              :color="plugin.enabled ? 'primary' : 'neutral'"
              :variant="plugin.enabled ? 'soft' : 'outline'"
              :loading="changingPlugin === plugin.name"
              @click="handlePluginEnabled(plugin)"
            >
              {{ plugin.enabled ? '停用' : '启用' }}
            </UButton>
            <UTooltip text="卸载插件">
              <UButton
                icon="i-lucide-trash"
                size="xs"
                color="error"
                variant="ghost"
                :loading="removingPlugin === plugin.name"
                @click="handleUninstallPlugin(plugin)"
              />
            </UTooltip>
          </div>
        </div>
      </div>
      <UEmpty
        v-else-if="!pluginsLoading && !pluginError"
        icon="i-lucide-package-search"
        description="尚未安装搜索插件"
        class="py-8"
      />
    </UCard>

    <UAlert
      v-if="searchError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-x"
      title="搜索失败"
      :description="searchError"
      class="mb-4"
    />

    <div class="mb-3 flex items-center justify-between text-sm text-muted">
      <span>找到 {{ totalResults || results.length }} 条结果</span>
      <span v-if="status === 'Running'" class="inline-flex items-center gap-1.5 text-primary">
        <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> 搜索中
      </span>
    </div>

    <div v-if="results.length" class="overflow-hidden rounded-2xl border border-default bg-default">
      <div
        v-for="result in results"
        :key="`${result.engineName}-${result.fileUrl}`"
        class="flex flex-col gap-3 border-b border-default p-4 last:border-b-0 md:flex-row md:items-center"
      >
        <div class="min-w-0 flex-1">
          <a
            :href="result.descrLink"
            target="_blank"
            rel="noopener"
            class="font-medium text-default hover:text-primary"
          >
            {{ result.fileName }}
          </a>
          <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>{{ formatSize(result.fileSize) }}</span>
            <span class="text-emerald-500">做种 {{ result.nbSeeders }}</span>
            <span>下载 {{ result.nbLeechers }}</span>
            <span>{{ result.engineName }}</span>
          </div>
        </div>
        <UButton size="sm" icon="i-lucide-download" @click="handleAdd(result)">下载</UButton>
      </div>
    </div>
    <UEmpty
      v-else
      icon="i-lucide-search-x"
      :description="hasSearched && status === 'Stopped' ? '没有找到匹配结果' : '输入关键词开始搜索'"
      class="py-20"
    />
  </div>
</template>
