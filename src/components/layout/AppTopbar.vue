<script setup lang="ts">
import { computed } from 'vue'
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
  <header
    class="flex h-14 shrink-0 items-center justify-between border-b border-default bg-default px-4"
  >
    <!-- 左侧：移动端菜单 + 全局速度 -->
    <div class="flex items-center gap-1.5">
      <UButton
        class="md:hidden"
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        aria-label="菜单"
        @click="$emit('toggle-sidebar')"
      />

      <div class="ml-2 flex items-center gap-3 md:gap-4">
        <div
          class="flex items-center gap-1.5 text-[13px] font-medium tabular-nums text-blue-500"
        >
          <UIcon name="i-lucide-arrow-down" class="size-4" />
          <span>{{ dlSpeed }}</span>
        </div>
        <div
          class="flex items-center gap-1.5 text-[13px] font-medium tabular-nums text-emerald-500"
        >
          <UIcon name="i-lucide-arrow-up" class="size-4" />
          <span>{{ upSpeed }}</span>
        </div>
      </div>
    </div>

    <!-- 中间：搜索框（移动端隐藏） -->
    <UInput
      v-model="store.searchQuery"
      icon="i-lucide-search"
      placeholder="搜索种子..."
      size="sm"
      class="hidden w-40 sm:block sm:w-56"
      :ui="{ base: 'h-8' }"
    />

    <!-- 右侧：操作按钮 + 主题 + 用户菜单 -->
    <div class="flex items-center gap-1.5">
      <!-- 添加种子（合并按钮，弹窗内切换链接/文件） -->
      <UButton
        icon="i-lucide-plus"
        color="primary"
        variant="solid"
        aria-label="添加种子"
        @click="$emit('add')"
      >
        <span class="hidden sm:inline">添加种子</span>
      </UButton>

      <!-- 主题切换 -->
      <UTooltip :text="isDark ? '切换到浅色' : '切换到深色'">
        <UButton
          :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
          color="neutral"
          variant="ghost"
          aria-label="切换主题"
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
