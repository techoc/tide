<script setup lang="ts">
defineOptions({ name: 'TorrentDashboard' })

import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useTorrentListStore } from '@/stores/torrentList'
import { useAddTorrentModal } from '@/composables/useAddTorrent'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { categoryItems } from '@/stores/settings'
import type { Torrent } from '@/types/qbittorrent'
import TorrentTable from '@/components/torrent/TorrentTable.vue'
import TorrentCardList from '@/components/torrent/TorrentCardList.vue'
import BatchToolbar from '@/components/torrent/BatchToolbar.vue'
import FilterPanel from '@/components/torrent/FilterPanel.vue'
import TorrentContextMenu from '@/components/torrent/TorrentContextMenu.vue'
import TagSelectorModal from '@/components/torrent/TagSelectorModal.vue'
import DetailDrawer from '@/components/torrent/DetailDrawer.vue'

const store = useTorrentListStore()
const toast = useToast()
const confirmDialog = useConfirmDialog()
const { open: openAdd } = useAddTorrentModal()

// 速度历史轮询已在 MainLayout 中统一管理，此处不再重复

// ===== 键盘快捷键 =====

/** Delete 键删除选中种子 */
async function handleDeleteSelected() {
  if (store.selectedCount === 0) return
  const confirmed = await confirmDialog.confirm({
    title: '删除种子',
    description: `确认删除选中的 ${store.selectedCount} 个种子？（不删除文件）`,
    confirmText: '确认删除',
    variant: 'error',
  })
  if (!confirmed) return
  try {
    await store.deleteSelected(false)
    toast.add({ title: `已删除 ${store.selectedCount} 个种子`, color: 'success' })
  } catch {
    toast.add({ title: '删除失败', color: 'error' })
  }
}

function onKeydown(e: KeyboardEvent) {
  // 忽略输入框中的按键
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

  // Ctrl+A / Cmd+A：全选当前列表
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault()
    store.selectAll(true)
    return
  }

  // Delete 键：删除选中种子
  if (e.key === 'Delete') {
    e.preventDefault()
    handleDeleteSelected()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const currentCategoryLabel = computed(() => {
  const item = categoryItems.find((c) => c.key === store.filter)
  return item?.label ?? '全部'
})

const currentContext = computed(() => {
  if (store.activeCategory) {
    return store.activeCategory === '__uncategorized__' ? '未分类' : store.activeCategory
  }
  if (store.activeTag) return `# ${store.activeTag}`
  return '管理并查看当前 qBittorrent 中的所有任务'
})

/** qBittorrent 中确实没有任何种子 */
const hasNoTorrents = computed(
  () => !store.loading && store.torrents.length === 0,
)

/** 有种子，但当前筛选条件没有匹配结果 */
const hasNoFilteredResults = computed(
  () => !store.loading && store.torrents.length > 0 && store.sortedTorrents.length === 0,
)

// 响应式：移动端切换为卡片模式
const isMobile = ref(false)
function checkMobile() {
  isMobile.value = window.innerWidth < 768
}
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => window.removeEventListener('resize', checkMobile))

// 详情抽屉
const detailHash = ref<string | null>(null)
function showDetail(hash: string) {
  detailHash.value = hash
}

// 右键菜单状态
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  torrent: null as Torrent | null,
})

// 表格行右键：弹出菜单
function onContextMenu(event: Event, torrent: Torrent) {
  contextMenu.value = {
    visible: true,
    x: (event as MouseEvent).clientX,
    y: (event as MouseEvent).clientY,
    torrent,
  }
}

// 关闭右键菜单
function closeContextMenu() {
  contextMenu.value.visible = false
  contextMenu.value.torrent = null
}

// 标签选择弹窗状态
const tagModal = ref({
  open: false,
  hashes: [] as string[],
  initialTags: [] as string[],
  targetLabel: '',
})

/** 打开标签弹窗（单行操作） */
function openTagModalForHash(hash: string, name?: string) {
  tagModal.value = {
    open: true,
    hashes: [hash],
    initialTags: store.torrents
      .find((torrent) => torrent.hash === hash)
      ?.tags.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [],
    targetLabel: name ? `「${name}」` : '1 个种子',
  }
}

// 右键菜单/操作列的 add-tag 事件：打开标签选择弹窗
function onAddTag(hash: string) {
  const torrent = store.torrents.find((t) => t.hash === hash)
  openTagModalForHash(hash, torrent?.name)
  closeContextMenu()
}
</script>

<template>
  <div class="dashboard mx-auto flex h-full w-full max-w-[1800px] flex-col px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
    <!-- 标题栏 -->
    <div class="mb-4 flex shrink-0 items-start justify-between gap-3 sm:mb-5">
      <div class="min-w-0">
        <div class="flex items-center gap-2.5">
          <div class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-download-cloud" class="size-5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-baseline gap-2">
              <h1 class="m-0 truncate text-xl font-bold tracking-tight sm:text-2xl">{{ currentCategoryLabel }}</h1>
              <span class="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-xs font-medium tabular-nums text-muted">
                {{ store.sortedTorrents.length }}
              </span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted sm:text-sm">{{ currentContext }}</p>
          </div>
        </div>
      </div>
    </div>

    <UInput
      v-model="store.searchQuery"
      icon="i-lucide-search"
      placeholder="搜索种子"
      class="mb-3 w-full sm:hidden"
      :ui="{ base: 'rounded-xl bg-default' }"
    />

    <!-- 内容区 -->
    <div class="flex min-h-0 flex-1 flex-col">
      <!-- 加载态：骨架屏 -->
      <div
        v-if="store.loading && store.torrents.length === 0"
        class="flex flex-col gap-2 h-full"
      >
        <!-- 骨架表格行 -->
        <div
          v-for="i in 8"
          :key="i"
          class="flex items-center gap-3 h-12 rounded-md bg-elevated/30 animate-pulse"
          :style="{ animationDelay: `${i * 80}ms` }"
        >
          <div class="w-4 h-4 ml-3 rounded bg-elevated" />
          <div class="flex-1 h-4 rounded bg-elevated" />
          <div class="w-20 h-4 rounded bg-elevated" />
          <div class="w-16 h-4 mr-3 rounded bg-elevated" />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="hasNoTorrents" class="h-full flex items-center justify-center">
        <UEmpty
          icon="i-lucide-cloud-download"
          size="lg"
          description="暂无种子"
        >
          <template #actions>
            <UButton
              color="primary"
              icon="i-lucide-plus-circle"
              @click="openAdd"
            >
              添加第一个种子
            </UButton>
          </template>
        </UEmpty>
      </div>

      <!-- 种子列表 -->
      <template v-else>
        <!-- 批量操作栏 -->
        <BatchToolbar />

        <!-- 筛选面板 -->
        <FilterPanel class="mb-3 shrink-0" />

        <!-- 筛选无结果：保留筛选面板，避免无法还原条件 -->
        <div
          v-if="hasNoFilteredResults"
          class="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-default bg-default shadow-sm"
        >
          <UEmpty
            icon="i-lucide-filter-x"
            size="lg"
            title="没有符合条件的种子"
            description="当前筛选条件没有匹配结果，可以调整条件或清除全部筛选。"
          >
            <template #actions>
              <UButton
                color="primary"
                icon="i-lucide-rotate-ccw"
                @click="store.clearAllFilters()"
              >
                清除全部筛选
              </UButton>
            </template>
          </UEmpty>
        </div>

        <!-- 桌面端：表格 -->
        <div
          v-else-if="!isMobile"
          class="table-container min-h-0 flex-1 overflow-hidden rounded-2xl border border-default bg-default shadow-sm"
        >
          <TorrentTable :show-detail="showDetail" @contextmenu="onContextMenu" @add-tag="onAddTag" />
        </div>

        <!-- 移动端：卡片 -->
        <div v-else class="cards-container min-h-0 flex-1 overflow-y-auto pb-4">
          <TorrentCardList :show-detail="showDetail" />
        </div>
      </template>
    </div>

    <!-- 详情抽屉 -->
    <DetailDrawer v-model:hash="detailHash" />

    <!-- 右键菜单（Teleport 到 body） -->
    <TorrentContextMenu
      :torrent="contextMenu.visible ? contextMenu.torrent : null"
      :x="contextMenu.x"
      :y="contextMenu.y"
      @close="closeContextMenu"
      @show-detail="(hash) => { showDetail(hash); closeContextMenu() }"
      @add-tag="onAddTag"
    />

    <!-- 标签选择弹窗（单行操作） -->
    <TagSelectorModal
      v-model:open="tagModal.open"
      mode="manage"
      :hashes="tagModal.hashes"
      :initial-tags="tagModal.initialTags"
      :target-label="tagModal.targetLabel"
    />

    <!-- 确认弹窗（Delete 快捷键删除用） -->
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

<style scoped>
@media (max-width: 768px) {
  .dashboard {
    padding: 12px 12px;
  }
}
</style>
