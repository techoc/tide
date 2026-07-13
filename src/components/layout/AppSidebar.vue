<script setup lang="ts">
import { computed } from 'vue'
import { useTorrentListStore } from '@/stores/torrentList'
import { useSettingsStore } from '@/stores/settings'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import type { TorrentFilter } from '@/types/qbittorrent'

interface CategoryItem {
  key: TorrentFilter
  label: string
  icon: string
}

const categories: CategoryItem[] = [
  { key: 'all', label: '全部', icon: 'i-lucide-list' },
  { key: 'downloading', label: '正在下载', icon: 'i-lucide-cloud-download' },
  { key: 'seeding', label: '做种中', icon: 'i-lucide-cloud-upload' },
  { key: 'completed', label: '已完成', icon: 'i-lucide-check-circle' },
  { key: 'paused', label: '已暂停', icon: 'i-lucide-pause-circle' },
  { key: 'active', label: '活动中', icon: 'i-lucide-play-circle' },
  { key: 'inactive', label: '不活跃', icon: 'i-lucide-stop-circle' },
  { key: 'stalled', label: '已停滞', icon: 'i-lucide-gauge' },
]

const store = useTorrentListStore()
const settings = useSettingsStore()
const toast = useToast()
const confirmDialog = useConfirmDialog()

const collapsed = computed(() => settings.sidebarCollapsed)

function selectCategory(key: TorrentFilter) {
  store.setFilter(key)
}

function selectTag(tag: string) {
  store.activeTag = store.activeTag === tag ? '' : tag
}

function formatCount(n: number): string {
  return n > 999 ? '999+' : String(n)
}

// 右键删除标签
async function onTagContextMenu(e: MouseEvent, tag: string) {
  e.preventDefault()
  const confirmed = await confirmDialog.confirm({
    title: '删除标签',
    description: `确认删除标签「${tag}」？该标签会从所有种子中移除。`,
    confirmText: '确认删除',
    variant: 'error',
  })
  if (!confirmed) return
  try {
    await store.deleteTag(tag)
    toast.add({ title: '标签已删除', color: 'success' })
  } catch {
    toast.add({ title: '删除失败', color: 'error' })
  }
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden bg-default text-default">
    <!-- 品牌 -->
    <div
      class="flex h-14 flex-shrink-0 items-center gap-2.5 py-4"
      :class="collapsed ? 'justify-center px-0' : 'px-[18px]'"
    >
      <div
        class="grid size-[34px] flex-shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-[#18a0fb] to-[#00d4c8] text-white"
      >
        <UIcon name="i-lucide-waves" class="size-[22px]" />
      </div>
      <span v-if="!collapsed" class="text-lg font-bold tracking-tight">Tide</span>
    </div>

    <!-- 分类列表 -->
    <div class="py-2 px-3" :class="collapsed ? 'px-0' : ''">
      <div
        v-if="!collapsed"
        class="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted"
      >
        分类
      </div>
      <nav class="flex flex-col gap-0.5">
        <button
          v-for="cat in categories"
          :key="cat.key"
          class="relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
          :class="[
            store.filter === cat.key ? 'bg-primary/15 text-primary' : 'text-default',
            collapsed ? 'justify-center py-2.5' : '',
          ]"
          :title="collapsed ? cat.label : undefined"
          @click="selectCategory(cat.key)"
        >
          <span
            class="grid flex-shrink-0 place-items-center"
            :class="store.filter === cat.key ? 'text-primary' : 'text-muted'"
          >
            <UIcon :name="cat.icon" class="size-[18px]" />
          </span>
          <span v-if="!collapsed" class="flex-1 truncate">{{ cat.label }}</span>
          <span v-if="!collapsed" class="text-xs tabular-nums text-muted">{{ store.counts[cat.key] ?? 0 }}</span>
          <UBadge
            v-else-if="(store.counts[cat.key] ?? 0) > 0"
            :label="formatCount(store.counts[cat.key] ?? 0)"
            color="primary"
            size="sm"
            class="absolute right-1 top-0.5"
          />
        </button>
      </nav>
    </div>

    <!-- 标签列表 -->
    <div v-if="!collapsed" class="flex min-h-0 flex-1 flex-col px-3 py-2 pb-0">
      <div class="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted">
        <span>标签</span>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div v-if="store.tags.length === 0" class="p-3">
          <UEmpty description="暂无标签" />
        </div>
        <nav v-else class="flex flex-col gap-0.5">
          <button
            v-for="tag in store.tags"
            :key="tag"
            class="group flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
            :class="store.activeTag === tag ? 'bg-primary/15 text-primary' : 'text-default'"
            @click="selectTag(tag)"
            @contextmenu="onTagContextMenu($event, tag)"
          >
            <span
              class="grid flex-shrink-0 place-items-center"
              :class="store.activeTag === tag ? 'text-primary' : 'text-muted'"
            >
              <UIcon name="i-lucide-tag" class="size-[16px]" />
            </span>
            <span class="flex-1 truncate text-[13px]">{{ tag }}</span>
            <span class="text-xs tabular-nums text-muted">
              {{ store.tagCounts[tag] ?? 0 }}
            </span>
          </button>
        </nav>
      </div>
    </div>

    <!-- 折叠按钮 -->
    <div class="flex flex-shrink-0 justify-center border-t border-default p-2.5">
      <UTooltip
        :text="collapsed ? '展开侧边栏' : '折叠侧边栏'"
        :content="{ side: collapsed ? 'right' : 'left' }"
      >
        <UButton
          :icon="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="settings.toggleSidebar()"
        />
      </UTooltip>
    </div>

    <!-- 删除标签确认弹窗 -->
    <UModal v-model:open="confirmDialog.isOpen.value">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-2">{{ confirmDialog.options.value.title }}</h3>
          <p
            v-if="confirmDialog.options.value.description"
            class="text-sm text-muted mb-6"
          >
            {{ confirmDialog.options.value.description }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="confirmDialog.handleCancel()">
              {{ confirmDialog.options.value.cancelText || '取消' }}
            </UButton>
            <UButton
              :color="confirmDialog.options.value.variant === 'error' ? 'error' : 'primary'"
              @click="confirmDialog.handleConfirm()"
            >
              {{ confirmDialog.options.value.confirmText || '确认' }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
