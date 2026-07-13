<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useColorMode } from '#imports'
import { useTorrentListStore } from '@/stores/torrentList'
import { useAuthStore } from '@/stores/auth'
import { formatSpeed } from '@/utils/format'

defineEmits<{
  add: []
  'toggle-sidebar': []
}>()

const store = useTorrentListStore()
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const colorMode = useColorMode()

const dlSpeed = computed(() => formatSpeed(store.dlSpeed))
const upSpeed = computed(() => formatSpeed(store.upSpeed))

const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

/** 切换备选限速 */
async function handleToggleAltSpeed() {
  try {
    await store.toggleAltSpeed()
    toast.add({
      title: store.altSpeedEnabled ? '备选限速已开启' : '备选限速已关闭',
      color: 'success',
    })
  } catch {
    toast.add({ title: '操作失败', color: 'error' })
  }
}

/** 手动刷新 */
const refreshing = ref(false)
async function handleRefresh() {
  refreshing.value = true
  try {
    await store.fetchTorrents()
  } finally {
    refreshing.value = false
  }
}

/** 搜索框 ref（用于 Ctrl+F 快捷键聚焦） */
const searchInput = ref<unknown>(null)

function focusSearch() {
  const instance = searchInput.value as { $el?: HTMLElement } | null
  const el = instance?.$el?.querySelector('input')
  if (el instanceof HTMLInputElement) {
    el.focus()
    el.select()
  }
}

/** 全局键盘快捷键：Ctrl+F 聚焦搜索框 */
function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault()
    focusSearch()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const userMenuItems = [
  {
    label: '设置',
    icon: 'i-lucide-settings',
    onSelect: () => {
      router.push({ name: 'settings' })
    },
  },
  {
    label: '退出登录',
    icon: 'i-lucide-log-out',
    onSelect: async () => {
      await auth.logout()
      store.reset()
      toast.add({ title: '已登出', color: 'success' })
      router.replace({ name: 'login' })
    },
  },
]
</script>

<template>
  <header class="flex h-16 shrink-0 items-center gap-3 border-b border-default bg-default/90 px-3 backdrop-blur-xl sm:px-5">
    <!-- 左侧：移动端菜单 + 全局速度 -->
    <div class="flex shrink-0 items-center gap-1.5">
      <UButton
        class="md:hidden"
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        aria-label="菜单"
        @click="$emit('toggle-sidebar')"
      />

      <div class="ml-1 hidden items-center rounded-xl border border-default bg-elevated/60 px-2.5 py-1.5 sm:flex md:gap-3">
        <div
          class="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-blue-500"
        >
          <UIcon name="i-lucide-arrow-down" class="size-4" />
          <span>{{ dlSpeed }}</span>
        </div>
        <div
          class="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-emerald-500"
        >
          <UIcon name="i-lucide-arrow-up" class="size-4" />
          <span>{{ upSpeed }}</span>
        </div>
      </div>
    </div>

    <!-- 中间：搜索框（移动端隐藏） -->
    <div class="hidden min-w-0 flex-1 justify-center sm:flex">
      <UInput
        ref="searchInput"
        v-model="store.searchQuery"
        icon="i-lucide-search"
        placeholder="搜索种子"
        size="md"
        class="w-full max-w-xl"
        :ui="{ base: 'rounded-xl bg-elevated/60' }"
      >
        <template #trailing>
          <span class="hidden rounded-md border border-default bg-default px-1.5 py-0.5 text-[10px] font-medium text-muted lg:inline">Ctrl F</span>
        </template>
      </UInput>
    </div>

    <!-- 右侧：操作按钮 + 主题 + 用户菜单 -->
    <div class="ml-auto flex shrink-0 items-center gap-1">
      <!-- 备选限速开关 -->
      <UTooltip :text="store.altSpeedEnabled ? '关闭备选限速' : '开启备选限速'">
        <UButton
          :icon="store.altSpeedEnabled ? 'i-lucide-zap' : 'i-lucide-zap-off'"
          :color="store.altSpeedEnabled ? 'warning' : 'neutral'"
          :variant="store.altSpeedEnabled ? 'soft' : 'ghost'"
          aria-label="备选限速"
          @click="handleToggleAltSpeed"
        />
      </UTooltip>

      <!-- 手动刷新 -->
      <UTooltip text="刷新列表" class="hidden md:block">
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="refreshing"
          aria-label="刷新"
          class="hidden md:inline-flex"
          @click="handleRefresh"
        />
      </UTooltip>

      <!-- 添加种子（合并按钮，弹窗内切换链接/文件） -->
      <UButton
        icon="i-lucide-plus"
        color="primary"
        variant="solid"
        class="rounded-xl shadow-sm shadow-primary/20"
        aria-label="添加种子"
        @click="$emit('add')"
      >
        <span class="hidden sm:inline">添加种子</span>
      </UButton>

      <!-- 主题切换 -->
      <UTooltip :text="isDark ? '切换到浅色' : '切换到深色'" class="hidden sm:block">
        <UButton
          :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
          color="neutral"
          variant="ghost"
          aria-label="切换主题"
          class="hidden sm:inline-flex"
          @click="toggleTheme"
        />
      </UTooltip>

      <!-- 用户菜单 -->
      <UDropdownMenu :items="userMenuItems">
        <UButton icon="i-lucide-user" color="neutral" variant="ghost" aria-label="用户菜单" />
      </UDropdownMenu>
    </div>
  </header>
</template>
