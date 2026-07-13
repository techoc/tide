import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TorrentFilter, TorrentSort } from '@/types/qbittorrent'

export type ThemeMode = 'dark' | 'light'
export type ListDensity = 'compact' | 'default' | 'comfortable'

export const useSettingsStore = defineStore(
  'settings',
  () => {
    /** 主题模式 */
    const theme = ref<ThemeMode>('dark')
    /** 界面语言 */
    const language = ref<'zh' | 'en'>('zh')
    /** 侧边栏折叠状态 */
    const sidebarCollapsed = ref(false)
    /** 自动刷新间隔（毫秒，0 = 暂停） */
    const refreshInterval = ref(2000)
    /** 默认排序字段 */
    const defaultSort = ref<TorrentSort>('added_on')
    /** 默认排序是否倒序 */
    const defaultReverse = ref(true)
    /** 列表密度 */
    const listDensity = ref<ListDensity>('default')

    const isDark = computed(() => theme.value === 'dark')

    function toggleTheme(): void {
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
    }

    function setTheme(mode: ThemeMode): void {
      theme.value = mode
    }

    function toggleSidebar(): void {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }

    return {
      theme,
      language,
      sidebarCollapsed,
      refreshInterval,
      defaultSort,
      defaultReverse,
      listDensity,
      isDark,
      toggleTheme,
      setTheme,
      toggleSidebar,
    }
  },
  {
    persist: true,
  },
)

/** 侧边栏分类项定义 */
export interface CategoryItem {
  key: TorrentFilter
  label: string
  icon: string
}

export const categoryItems: CategoryItem[] = [
  { key: 'all', label: '全部', icon: 'list' },
  { key: 'downloading', label: '正在下载', icon: 'download' },
  { key: 'seeding', label: '做种中', icon: 'upload' },
  { key: 'completed', label: '已完成', icon: 'check' },
  { key: 'paused', label: '已暂停', icon: 'pause' },
  { key: 'active', label: '活动中', icon: 'play' },
  { key: 'inactive', label: '不活跃', icon: 'stop' },
  { key: 'stalled', label: '已停滞', icon: 'stall' },
]

/** 默认排序 */
export const defaultSort: TorrentSort = 'added_on'
