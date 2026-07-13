<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useTorrentListStore } from '@/stores/torrentList'
import { usePolling } from '@/composables/usePolling'
import { useSpeedHistory } from '@/composables/useSpeedHistory'
import { useAddTorrentModal } from '@/composables/useAddTorrent'
import { categoryItems } from '@/stores/settings'
import type { Torrent } from '@/types/qbittorrent'
import TorrentTable from '@/components/torrent/TorrentTable.vue'
import TorrentCardList from '@/components/torrent/TorrentCardList.vue'
import BatchToolbar from '@/components/torrent/BatchToolbar.vue'
import StatsOverview from '@/components/torrent/StatsOverview.vue'
import TorrentContextMenu from '@/components/torrent/TorrentContextMenu.vue'
import TagSelectorModal from '@/components/torrent/TagSelectorModal.vue'
import DetailDrawer from '@/components/torrent/DetailDrawer.vue'

const store = useTorrentListStore()
const { open: openAdd } = useAddTorrentModal()

// 轮询种子列表（每 2 秒）
usePolling(store.fetchTorrents, 2000)

// 轮询 transfer 信息（每 2 秒），同时记录速度历史
const { push } = useSpeedHistory()
usePolling(async () => {
  await store.fetchTransfer()
  push(store.dlSpeed, store.upSpeed)
}, 2000)

const currentCategoryLabel = computed(() => {
  const item = categoryItems.find((c) => c.key === store.filter)
  return item?.label ?? '全部'
})

const isEmpty = computed(
  () => !store.loading && store.sortedTorrents.length === 0,
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
  targetLabel: '',
})

/** 打开标签弹窗（单行操作） */
function openTagModalForHash(hash: string, name?: string) {
  tagModal.value = {
    open: true,
    hashes: [hash],
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
  <div class="dashboard flex flex-col h-full p-4 sm:p-5">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between mb-4 shrink-0">
      <div class="flex items-baseline gap-3">
        <h2 class="m-0 text-xl font-bold">{{ currentCategoryLabel }}</h2>
        <span class="text-[13px] text-muted">{{ store.sortedTorrents.length }} 个种子</span>
      </div>
    </div>

    <!-- 统计概览 -->
    <StatsOverview class="mb-4 shrink-0" />

    <!-- 内容区 -->
    <div class="flex-1 min-h-0">
      <!-- 加载态 -->
      <div
        v-if="store.loading && store.torrents.length === 0"
        class="flex flex-col items-center justify-center gap-3 h-full text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="text-3xl animate-spin" />
        <p>正在加载种子列表…</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="isEmpty" class="h-full flex items-center justify-center">
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

        <!-- 桌面端：表格 -->
        <div
          v-if="!isMobile"
          class="table-container h-[calc(100%-50px)] rounded-[10px] overflow-hidden bg-default border border-default"
        >
          <TorrentTable :show-detail="showDetail" @contextmenu="onContextMenu" @add-tag="onAddTag" />
        </div>

        <!-- 移动端：卡片 -->
        <div v-else class="cards-container h-[calc(100%-50px)] overflow-y-auto pb-4">
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
      mode="add"
      :hashes="tagModal.hashes"
      :target-label="tagModal.targetLabel"
    />
  </div>
</template>

<style scoped>
@media (max-width: 768px) {
  .dashboard {
    padding: 12px 12px;
  }
}
</style>
