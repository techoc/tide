<script setup lang="ts">
import { ref, computed } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import AddTorrentModal from '@/components/torrent/AddTorrentModal.vue'
import { useSettingsStore } from '@/stores/settings'
import { useTorrentListStore } from '@/stores/torrentList'
import { usePolling } from '@/composables/usePolling'
import { useSpeedHistory } from '@/composables/useSpeedHistory'
import { useAddTorrentModal } from '@/composables/useAddTorrent'

const settings = useSettingsStore()
const store = useTorrentListStore()

// 移动端侧边栏抽屉
const mobileDrawer = ref(false)

// 添加种子弹窗（共享状态）
const { show: addModalShow, open: openAdd } = useAddTorrentModal()

// 种子列表轮询间隔（响应式，从设置读取）
const torrentInterval = computed(() => settings.refreshInterval)
// 全局传输信息轮询间隔
const transferInterval = computed(() => settings.refreshInterval)

// 轮询种子列表（间隔由设置控制，0 = 暂停）
usePolling(store.fetchTorrents, torrentInterval)
// 轮询全局传输信息（顶部速度条），同时记录速度历史供 StatsOverview 使用
const { push } = useSpeedHistory()
usePolling(async () => {
  await store.fetchTransfer()
  push(store.dlSpeed, store.upSpeed)
}, transferInterval)
// 标签列表（低频）
usePolling(store.fetchTags, 30000)
// 分类列表（低频）
usePolling(store.fetchCategories, 30000)
// 备选限速状态（低频）
usePolling(store.fetchAltSpeedMode, 10000)
</script>

<template>
  <div class="flex h-dvh w-full overflow-hidden bg-muted/30 text-default">
    <!-- 桌面端侧边栏 -->
    <aside
      class="hidden flex-shrink-0 overflow-hidden border-r border-default bg-default shadow-sm transition-all duration-300 md:flex"
      :style="{ width: settings.sidebarCollapsed ? '76px' : '248px' }"
    >
      <AppSidebar />
    </aside>

    <!-- 移动端抽屉侧边栏 -->
    <USlideover
      v-model:open="mobileDrawer"
      side="left"
      :ui="{ content: 'w-[280px] max-w-[86vw]' }"
    >
      <template #content>
        <AppSidebar force-expanded @navigate="mobileDrawer = false" />
      </template>
    </USlideover>

    <!-- 主面板 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex-shrink-0">
        <AppTopbar
          @add="openAdd"
          @toggle-sidebar="mobileDrawer = true"
        />
      </div>

      <main class="min-h-0 flex-1 overflow-hidden">
        <RouterView />
      </main>
    </div>

    <!-- 添加种子弹窗 -->
    <AddTorrentModal v-model:show="addModalShow" />
  </div>
</template>
