<script setup lang="ts">
defineOptions({ name: 'RssView' })

import { computed, ref } from 'vue'
import {
  addRssFeed,
  addRssFolder,
  getRssItems,
  markRssAsRead,
  refreshRssItem,
  removeRssItem,
} from '@/api/modules/rss'
import type { RSSArticle, RSSItem } from '@/types/qbittorrent'

interface FlatRssItem {
  name: string
  path: string
  url?: string
  articles: RSSArticle[]
  folder: boolean
}

const toast = useToast()
const loading = ref(false)
const items = ref<Record<string, RSSItem>>({})
const selectedPath = ref('')
const showAdd = ref(false)
const addMode = ref<'feed' | 'folder'>('feed')
const addForm = ref({ name: '', url: '', refreshInterval: 0 })
const saving = ref(false)

function flatten(source: Record<string, RSSItem>, parent = ''): FlatRssItem[] {
  const result: FlatRssItem[] = []
  for (const [name, value] of Object.entries(source)) {
    const path = parent ? `${parent}\\${name}` : name
    const children = value.children ?? Object.fromEntries(
      Object.entries(value).filter(([, child]) => typeof child === 'object' && child && !Array.isArray(child)),
    ) as Record<string, RSSItem>
    const articles = Array.isArray(value.articles) ? value.articles : []
    const folder = !value.url && articles.length === 0
    result.push({ name, path, url: value.url, articles, folder })
    if (Object.keys(children).length) result.push(...flatten(children, path))
  }
  return result
}

const flatItems = computed(() => flatten(items.value))
const selected = computed(() => flatItems.value.find((item) => item.path === selectedPath.value))

async function refresh(showToast = false) {
  loading.value = true
  try {
    items.value = await getRssItems(true)
    if (!selectedPath.value && flatItems.value.length) selectedPath.value = flatItems.value[0]!.path
    if (showToast) toast.add({ title: 'RSS 已刷新', color: 'success' })
  } catch {
    toast.add({ title: 'RSS 加载失败', description: '请确认已在设置中启用 RSS', color: 'error' })
  } finally {
    loading.value = false
  }
}

function openAdd(mode: 'feed' | 'folder') {
  addMode.value = mode
  addForm.value = { name: '', url: '', refreshInterval: 0 }
  showAdd.value = true
}

async function handleAdd() {
  if (!addForm.value.name.trim()) return
  saving.value = true
  try {
    if (addMode.value === 'folder') {
      await addRssFolder(addForm.value.name.trim())
    } else {
      await addRssFeed(addForm.value.url.trim(), addForm.value.name.trim(), addForm.value.refreshInterval)
    }
    showAdd.value = false
    await refresh()
    toast.add({ title: addMode.value === 'folder' ? '文件夹已创建' : '订阅已添加', color: 'success' })
  } catch {
    toast.add({ title: '保存失败', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleRemove() {
  if (!selected.value) return
  try {
    await removeRssItem(selected.value.path)
    selectedPath.value = ''
    await refresh()
    toast.add({ title: 'RSS 项目已删除', color: 'success' })
  } catch {
    toast.add({ title: '删除失败', color: 'error' })
  }
}

async function handleRefreshItem() {
  if (!selected.value) return
  await refreshRssItem(selected.value.path)
  await refresh(true)
}

async function handleRead(article?: RSSArticle) {
  if (!selected.value) return
  await markRssAsRead(selected.value.path, article?.id)
  await refresh()
}

void refresh()
</script>

<template>
  <div class="mx-auto flex h-full max-w-[1500px] flex-col px-4 py-5 sm:px-7">
    <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">RSS 订阅</h1>
        <p class="mt-1 text-sm text-muted">管理订阅源并查看 qBittorrent 抓取的文章</p>
      </div>
      <div class="flex gap-2">
        <UButton color="neutral" variant="soft" icon="i-lucide-folder-plus" @click="openAdd('folder')">文件夹</UButton>
        <UButton icon="i-lucide-rss" @click="openAdd('feed')">添加订阅</UButton>
      </div>
    </div>

    <div class="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-default bg-default md:grid-cols-[280px_1fr]">
      <aside class="overflow-y-auto border-b border-default p-2 md:border-b-0 md:border-r">
        <button v-for="item in flatItems" :key="item.path" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated" :class="selectedPath === item.path ? 'bg-primary/10 text-primary' : ''" @click="selectedPath = item.path">
          <UIcon :name="item.folder ? 'i-lucide-folder' : 'i-lucide-rss'" class="size-4 shrink-0" />
          <span class="min-w-0 flex-1 truncate">{{ item.name }}</span>
          <span v-if="item.articles.length" class="text-xs text-muted">{{ item.articles.length }}</span>
        </button>
        <UEmpty v-if="!flatItems.length && !loading" icon="i-lucide-rss" description="暂无 RSS 订阅" class="py-12" />
      </aside>

      <section class="min-h-0 overflow-y-auto p-4">
        <template v-if="selected">
          <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate text-lg font-semibold">{{ selected.name }}</h2>
              <p v-if="selected.url" class="truncate text-xs text-muted">{{ selected.url }}</p>
            </div>
            <div class="flex gap-1">
              <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="sm" @click="handleRefreshItem">刷新</UButton>
              <UButton icon="i-lucide-check-check" color="neutral" variant="ghost" size="sm" @click="handleRead()">全部已读</UButton>
              <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm" @click="handleRemove">删除</UButton>
            </div>
          </div>
          <div v-for="(article, index) in selected.articles" :key="article.id ?? index" class="border-b border-default py-3 last:border-b-0">
            <div class="flex items-start justify-between gap-3">
              <a :href="article.link" target="_blank" rel="noopener" class="font-medium hover:text-primary">{{ article.title || '未命名文章' }}</a>
              <UButton v-if="!article.isRead" color="neutral" variant="ghost" size="xs" @click="handleRead(article)">标为已读</UButton>
            </div>
            <p v-if="article.description" class="mt-1 line-clamp-2 text-xs text-muted">{{ article.description }}</p>
          </div>
          <UEmpty v-if="!selected.articles.length" icon="i-lucide-newspaper" description="该项目暂无文章" class="py-16" />
        </template>
        <UEmpty v-else icon="i-lucide-panel-left" description="请选择一个 RSS 项目" class="py-20" />
      </section>
    </div>

    <UModal v-model:open="showAdd" :title="addMode === 'folder' ? '新建 RSS 文件夹' : '添加 RSS 订阅'">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField :label="addMode === 'folder' ? '文件夹路径' : '订阅名称/路径'">
            <UInput v-model="addForm.name" placeholder="例如：影视/高清资源" class="w-full" />
          </UFormField>
          <UFormField v-if="addMode === 'feed'" label="订阅地址">
            <UInput v-model="addForm.url" placeholder="https://example.com/rss.xml" class="w-full" />
          </UFormField>
          <UFormField v-if="addMode === 'feed'" label="刷新间隔（秒）" description="0 使用 qBittorrent 默认值">
            <UInputNumber v-model="addForm.refreshInterval" :min="0" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="() => { showAdd = false }">取消</UButton>
          <UButton :loading="saving" @click="handleAdd">保存</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
