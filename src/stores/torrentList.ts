import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import type { Torrent, TorrentCategory, TorrentFilter, TorrentState, TorrentSort, CategoryParams } from '@/types/qbittorrent'
import {
  getTorrents,
  pauseTorrents,
  resumeTorrents,
  deleteTorrents,
  getTags,
  addTags,
  removeTags,
  createTags as createTagsApi,
  deleteTags as deleteTagsApi,
  forceStartTorrents,
  getCategories,
  createCategory as createCategoryApi,
  editCategory as editCategoryApi,
  removeCategories as removeCategoriesApi,
  setTorrentsCategory,
  setTorrentsDownloadLimit,
  setTorrentsUploadLimit,
  setTorrentsLocation,
  exportTorrent,
  renameTorrent,
} from '@/api/modules/torrents'
import { getTransferInfo, toggleAlternativeSpeedLimits, getAlternativeSpeedLimitsMode, type TransferInfo } from '@/api/modules/app'
import { isPaused } from '@/utils/state'

/** 保存的智能筛选 */
export interface SavedFilter {
  id: string
  name: string
  filter: TorrentFilter
  searchQuery: string
  searchFields: { name: boolean; hash: boolean; savePath: boolean; tracker: boolean }
  sizeMin: number
  sizeMax: number
  progressMin: number
  progressMax: number
  activeTag: string
  activeCategory: string
}

/** 判断种子是否匹配某个筛选分类 */
function matchesFilter(t: Torrent, filter: TorrentFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'downloading':
      return [
        'downloading',
        'metaDL',
        'forcedDL',
        'checkingDL',
        'checkingResumeData',
        'stalledDL',
        'queuedDL',
        'allocating',
      ].includes(t.state)
    case 'seeding':
      return ['uploading', 'queuedUP', 'stalledUP', 'checkingUP', 'forcedUP'].includes(t.state)
    case 'completed':
      return t.progress >= 1
    case 'paused':
      return isPaused(t.state)
    case 'active':
      return t.dlspeed > 0 || t.upspeed > 0
    case 'inactive':
      return t.dlspeed === 0 && t.upspeed === 0
    case 'resumed':
      return !isPaused(t.state)
    case 'stalled':
      return t.state === 'stalledUP' || t.state === 'stalledDL'
    case 'stalled_uploading':
      return t.state === 'stalledUP'
    case 'stalled_downloading':
      return t.state === 'stalledDL'
    default:
      return true
  }
}

export const useTorrentListStore = defineStore('torrentList', () => {
  /** 原始种子列表（全量，使用 shallowRef 避免大数组深层响应式开销） */
  const torrents = shallowRef<Torrent[]>([])
  /** 当前筛选 */
  const filter = ref<TorrentFilter>('all')
  /** 排序字段 */
  const sort = ref<TorrentSort>('added_on')
  /** 是否倒序 */
  const reverse = ref(true)
  /** 选中的 hash 集合 */
  const selectedHashes = ref<Set<string>>(new Set())
  /** 加载状态（仅首次加载时为 true，轮询时不触发，避免列表闪烁） */
  const loading = ref(false)
  /** 是否已完成首次加载（用于区分首次加载与后续轮询） */
  const initialized = ref(false)
  /** 标签列表 */
  const tags = ref<string[]>([])
  /** 当前选中标签（空表示不限） */
  const activeTag = ref('')
  /** 搜索关键词（多字段匹配：name/hash/save_path/tracker） */
  const searchQuery = ref('')
  /** 搜索字段开关 */
  const searchFields = ref({
    name: true,
    hash: false,
    savePath: false,
    tracker: false,
  })
  /** 大小区间筛选（bytes，0 = 不限） */
  const sizeMin = ref(0)
  const sizeMax = ref(0)
  /** 进度区间筛选（0-100，0 = 不限） */
  const progressMin = ref(0)
  const progressMax = ref(0)
  /** 保存的智能筛选列表 */
  const savedFilters = ref<SavedFilter[]>([])
  const SAVED_FILTERS_KEY = 'tide.savedFilters'
  // 初始化：从 localStorage 加载已保存的筛选
  try {
    const raw = localStorage.getItem(SAVED_FILTERS_KEY)
    if (raw) savedFilters.value = JSON.parse(raw) as SavedFilter[]
  } catch {
    // 忽略
  }
  /** 分类列表 */
  const categories = ref<TorrentCategory[]>([])
  /** 当前选中分类（空字符串表示"全部"，特殊值 '__uncategorized__' 表示未分类） */
  const activeCategory = ref('')
  /** 备选速度限制是否已启用 */
  const altSpeedEnabled = ref(false)
  /** 全局传输信息 */
  const transfer = ref<TransferInfo>({
    dl_info_speed: 0,
    dl_info_data: 0,
    up_info_speed: 0,
    up_info_data: 0,
    dl_rate_limit: 0,
    up_rate_limit: 0,
    dht_nodes: 0,
    connection_status: 'disconnected',
  })

  /** 各分类数量统计 */
  const counts = computed(() => {
    const result: Record<TorrentFilter, number> = {
      all: torrents.value.length,
      downloading: 0,
      seeding: 0,
      completed: 0,
      paused: 0,
      active: 0,
      inactive: 0,
      resumed: 0,
      stalled: 0,
      stalled_uploading: 0,
      stalled_downloading: 0,
    }
    for (const t of torrents.value) {
      for (const key of Object.keys(result) as TorrentFilter[]) {
        if (key !== 'all' && matchesFilter(t, key)) result[key]++
      }
    }
    return result
  })

  /** 全量列表汇总，避免多个统计字段分别遍历大数组 */
  const torrentSummary = computed(() => {
    let totalSize = 0
    let totalDownloaded = 0
    for (const torrent of torrents.value) {
      totalSize += torrent.size
      totalDownloaded += torrent.downloaded
    }
    return { totalSize, totalDownloaded }
  })

  /** 所有种子的总大小（size 之和） */
  const totalSize = computed(() => torrentSummary.value.totalSize)

  /** 每个标签下的种子数量 */
  const tagCounts = computed<Record<string, number>>(() => {
    const result: Record<string, number> = {}
    for (const t of torrents.value) {
      if (!t.tags) continue
      const tags = t.tags.split(',').map((s) => s.trim()).filter(Boolean)
      for (const tag of tags) {
        result[tag] = (result[tag] ?? 0) + 1
      }
    }
    return result
  })

  /** 每个分类下的种子数量（含未分类计数，key 为分类名，'' 代表未分类） */
  const categoryCounts = computed<Record<string, number>>(() => {
    const result: Record<string, number> = {}
    for (const t of torrents.value) {
      const cat = t.category || ''
      result[cat] = (result[cat] ?? 0) + 1
    }
    return result
  })

  /** 未分类种子数量 */
  const uncategorizedCount = computed(() => categoryCounts.value[''] ?? 0)

  /** 所有种子的已下载总量（downloaded 之和） */
  const totalDownloaded = computed(() => torrentSummary.value.totalDownloaded)

  /** 做种中的种子数 */
  const seedingCount = computed(() => counts.value.seeding)

  /** 下载中的种子数 */
  const downloadingCount = computed(() => counts.value.downloading)

  /** 暂停的种子数 */
  const pausedCount = computed(() => counts.value.paused)

  /** 已完成的种子数（progress >= 1） */
  const completedCount = computed(() => counts.value.completed)

  /** 按分类 + 标签 + 分类筛选 + 搜索关键词筛选后的列表 */
  const filteredTorrents = computed<Torrent[]>(() => {
    let list = torrents.value
    if (filter.value !== 'all') {
      list = list.filter((t) => matchesFilter(t, filter.value))
    }
    if (activeTag.value) {
      list = list.filter((t) =>
        t.tags
          .split(',')
          .map((s) => s.trim())
          .includes(activeTag.value),
      )
    }
    // 分类筛选：空字符串 = 全部，'__uncategorized__' = 未分类，其他 = 指定分类
    if (activeCategory.value === '__uncategorized__') {
      list = list.filter((t) => !t.category)
    } else if (activeCategory.value) {
      list = list.filter((t) => t.category === activeCategory.value)
    }
    // 搜索过滤：多字段匹配（name/hash/save_path/tracker）
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const sf = searchFields.value
      list = list.filter((t) => {
        if (sf.name && t.name.toLowerCase().includes(q)) return true
        if (sf.hash && t.hash.toLowerCase().includes(q)) return true
        if (sf.savePath && t.save_path.toLowerCase().includes(q)) return true
        if (sf.tracker && t.tracker.toLowerCase().includes(q)) return true
        // 如果所有字段都关闭，回退到 name 匹配
        if (!sf.name && !sf.hash && !sf.savePath && !sf.tracker) {
          return t.name.toLowerCase().includes(q)
        }
        return false
      })
    }
    // 大小区间筛选
    if (sizeMin.value > 0) {
      list = list.filter((t) => t.size >= sizeMin.value)
    }
    if (sizeMax.value > 0) {
      list = list.filter((t) => t.size <= sizeMax.value)
    }
    // 进度区间筛选（0-100 转为 0-1）
    if (progressMin.value > 0) {
      list = list.filter((t) => t.progress >= progressMin.value / 100)
    }
    if (progressMax.value > 0) {
      list = list.filter((t) => t.progress <= progressMax.value / 100)
    }
    return list
  })

  /** 排序后的列表（供表格渲染） */
  const sortedTorrents = computed<Torrent[]>(() => {
    const list = [...filteredTorrents.value]
    const field = sort.value
    list.sort((a, b) => {
      const av = a[field]
      const bv = b[field]
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv)
      }
      return (av as number) - (bv as number)
    })
    if (reverse.value) list.reverse()
    return list
  })

  /** 当前选中种子数量 */
  const selectedCount = computed(() => selectedHashes.value.size)

  /** 全局下载速度 */
  const dlSpeed = computed(() => transfer.value.dl_info_speed)
  /** 全局上传速度 */
  const upSpeed = computed(() => transfer.value.up_info_speed)

  /** 拉取种子列表（全量，客户端筛选） */
  async function fetchTorrents(): Promise<void> {
    // 仅首次加载显示 loading 遮罩，后续轮询不触发，避免列表闪烁
    const isFirstLoad = !initialized.value
    if (isFirstLoad) loading.value = true
    try {
      const list = await getTorrents({ sort: 'added_on', reverse: true })
      torrents.value = list
      reconcileSelection(list)
    } finally {
      if (isFirstLoad) {
        initialized.value = true
        loading.value = false
      }
    }
  }

  /** 拉取全局传输信息 */
  async function fetchTransfer(): Promise<void> {
    try {
      transfer.value = await getTransferInfo()
    } catch {
      // 忽略
    }
  }

  /** 拉取标签列表 */
  async function fetchTags(): Promise<void> {
    try {
      tags.value = await getTags()
    } catch {
      // 忽略
    }
  }

  /** 拉取分类列表 */
  async function fetchCategories(): Promise<void> {
    try {
      categories.value = await getCategories()
    } catch {
      // 忽略
    }
  }

  /** 拉取备选限速状态 */
  async function fetchAltSpeedMode(): Promise<void> {
    try {
      altSpeedEnabled.value = await getAlternativeSpeedLimitsMode()
    } catch {
      // 忽略
    }
  }

  /** 切换备选限速 */
  async function toggleAltSpeed(): Promise<void> {
    await toggleAlternativeSpeedLimits()
    // 乐观更新：立即翻转本地状态，避免 qBittorrent v5 状态更新延迟导致 toast 显示错误
    altSpeedEnabled.value = !altSpeedEnabled.value
  }

  /** 切换筛选分类 */
  function setFilter(f: TorrentFilter): void {
    filter.value = f
  }

  /** 设置排序 */
  function setSort(s: TorrentSort): void {
    if (sort.value === s) {
      reverse.value = !reverse.value
    } else {
      sort.value = s
      reverse.value = false
    }
  }

  /** 选中/取消选中 */
  function toggleSelect(hash: string, selected: boolean): void {
    const next = new Set(selectedHashes.value)
    if (selected) next.add(hash)
    else next.delete(hash)
    selectedHashes.value = next
  }

  /** 全选 / 取消全选（基于当前筛选后的列表） */
  function selectAll(selected: boolean): void {
    if (selected) {
      selectedHashes.value = new Set(sortedTorrents.value.map((t) => t.hash))
    } else {
      selectedHashes.value = new Set()
    }
  }

  /** 获取选中的 hash 数组 */
  function selectedArray(): string[] {
    return [...selectedHashes.value]
  }

  /** 移除已被后台删除、当前列表中不再存在的选中项 */
  function reconcileSelection(list: Torrent[]): void {
    if (!selectedHashes.value.size) return
    const availableHashes = new Set(list.map((torrent) => torrent.hash))
    const next = new Set(
      [...selectedHashes.value].filter((hash) => availableHashes.has(hash)),
    )
    if (next.size !== selectedHashes.value.size) selectedHashes.value = next
  }

  /** 暂停选中 */
  async function pauseSelected(): Promise<void> {
    const hashes = selectedArray()
    if (!hashes.length) return
    await pauseTorrents(hashes)
    await fetchTorrents()
  }

  /** 恢复选中 */
  async function resumeSelected(): Promise<void> {
    const hashes = selectedArray()
    if (!hashes.length) return
    await resumeTorrents(hashes)
    await fetchTorrents()
  }

  /** 强制续传选中 */
  async function forceStartSelected(value: boolean): Promise<void> {
    const hashes = selectedArray()
    if (!hashes.length) return
    await forceStartTorrents(hashes, value)
    await fetchTorrents()
  }

  /** 删除选中 */
  async function deleteSelected(deleteFiles: boolean): Promise<void> {
    const hashes = selectedArray()
    if (!hashes.length) return
    await deleteTorrents(hashes, deleteFiles)
    selectedHashes.value = new Set()
    await fetchTorrents()
  }

  /** 给种子添加标签（默认选中种子，可传入指定 hashes） */
  async function addTagsToSelected(tags: string, hashes?: string[]): Promise<void> {
    const targetHashes = hashes ?? selectedArray()
    if (!targetHashes.length) return
    await addTags(targetHashes, tags)
    await fetchTags()
    await fetchTorrents()
  }

  /** 移除种子标签（默认选中种子，可传入指定 hashes） */
  async function removeTagsFromSelected(tags: string, hashes?: string[]): Promise<void> {
    const targetHashes = hashes ?? selectedArray()
    if (!targetHashes.length) return
    await removeTags(targetHashes, tags)
    await fetchTorrents()
  }

  /** 将指定种子的标签更新为目标集合 */
  async function updateTorrentTags(
    hashes: string[],
    currentTags: string[],
    nextTags: string[],
  ): Promise<void> {
    if (!hashes.length) return
    const current = new Set(currentTags)
    const next = new Set(nextTags)
    const added = [...next].filter((tag) => !current.has(tag))
    const removed = [...current].filter((tag) => !next.has(tag))

    if (added.length) await addTags(hashes, added.join(','))
    if (removed.length) await removeTags(hashes, removed.join(','))
    await fetchTags()
    await fetchTorrents()
  }

  /** 创建标签定义 */
  async function createTags(tagNames: string[]): Promise<void> {
    const normalized = [...new Set(tagNames.map((tag) => tag.trim()).filter(Boolean))]
    if (!normalized.length) return
    await createTagsApi(normalized)
    await fetchTags()
  }

  /** 重命名标签，并保留该标签关联的种子 */
  async function renameTag(oldTag: string, newTag: string): Promise<void> {
    const normalized = newTag.trim()
    if (!normalized || normalized === oldTag) return
    const hashes = torrents.value
      .filter((torrent) => torrent.tags.split(',').map((tag) => tag.trim()).includes(oldTag))
      .map((torrent) => torrent.hash)

    await createTagsApi([normalized])
    if (hashes.length) await addTags(hashes, normalized)
    await deleteTagsApi([oldTag])
    if (activeTag.value === oldTag) activeTag.value = normalized
    await fetchTags()
    await fetchTorrents()
  }

  /** 删除标签定义（从 qBittorrent 标签列表中移除） */
  async function deleteTag(tag: string): Promise<void> {
    await deleteTagsApi([tag])
    if (activeTag.value === tag) activeTag.value = ''
    await fetchTags()
    await fetchTorrents()
  }

  // ===== 分类管理 actions =====

  /** 创建分类 */
  async function createCategory(params: CategoryParams): Promise<void> {
    await createCategoryApi(params)
    await fetchCategories()
  }

  /** 编辑分类 */
  async function editCategory(params: CategoryParams): Promise<void> {
    await editCategoryApi(params)
    await fetchCategories()
    await fetchTorrents()
  }

  /** 删除分类 */
  async function deleteCategory(name: string): Promise<void> {
    await removeCategoriesApi([name])
    if (activeCategory.value === name) activeCategory.value = ''
    await fetchCategories()
    await fetchTorrents()
  }

  /** 设置种子的分类（默认选中种子，可传入指定 hashes） */
  async function setTorrentCategory(category: string, hashes?: string[]): Promise<void> {
    const targetHashes = hashes ?? selectedArray()
    if (!targetHashes.length) return
    await setTorrentsCategory(targetHashes, category)
    await fetchTorrents()
  }

  // ===== 限速与位置 actions =====

  /** 设置下载限速（单位 bytes/s，0 = 不限速） */
  async function setDownloadLimit(limit: number, hashes?: string[]): Promise<void> {
    const targetHashes = hashes ?? selectedArray()
    if (!targetHashes.length) return
    await setTorrentsDownloadLimit(targetHashes, limit)
    await fetchTorrents()
  }

  /** 设置上传限速（单位 bytes/s，0 = 不限速） */
  async function setUploadLimit(limit: number, hashes?: string[]): Promise<void> {
    const targetHashes = hashes ?? selectedArray()
    if (!targetHashes.length) return
    await setTorrentsUploadLimit(targetHashes, limit)
    await fetchTorrents()
  }

  /** 移动种子保存路径 */
  async function setTorrentLocation(location: string, hashes?: string[]): Promise<void> {
    const targetHashes = hashes ?? selectedArray()
    if (!targetHashes.length) return
    await setTorrentsLocation(targetHashes, location)
    await fetchTorrents()
  }

  // ===== 导出与重命名 actions =====

  /** 导出 .torrent 文件（返回 Blob） */
  async function exportTorrentFile(hash: string): Promise<Blob> {
    return exportTorrent(hash)
  }

  /** 重命名种子 */
  async function renameTorrentAction(hash: string, name: string): Promise<void> {
    await renameTorrent(hash, name)
    await fetchTorrents()
  }

  /** 清空状态（登出时调用） */
  function reset(): void {
    torrents.value = []
    initialized.value = false
    loading.value = false
    selectedHashes.value = new Set()
    tags.value = []
    activeTag.value = ''
    searchQuery.value = ''
    sizeMin.value = 0
    sizeMax.value = 0
    progressMin.value = 0
    progressMax.value = 0
    filter.value = 'all'
    categories.value = []
    activeCategory.value = ''
    altSpeedEnabled.value = false
  }

  // ===== 保存的智能筛选 =====

  /** 保存当前筛选条件为一个智能筛选 */
  function saveCurrentFilter(name: string): void {
    const item: SavedFilter = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      filter: filter.value,
      searchQuery: searchQuery.value,
      searchFields: { ...searchFields.value },
      sizeMin: sizeMin.value,
      sizeMax: sizeMax.value,
      progressMin: progressMin.value,
      progressMax: progressMax.value,
      activeTag: activeTag.value,
      activeCategory: activeCategory.value,
    }
    savedFilters.value = [...savedFilters.value, item]
    persistSavedFilters()
  }

  /** 应用一个已保存的筛选 */
  function applySavedFilter(id: string): void {
    const item = savedFilters.value.find((f) => f.id === id)
    if (!item) return
    filter.value = item.filter
    searchQuery.value = item.searchQuery
    searchFields.value = { ...item.searchFields }
    sizeMin.value = item.sizeMin
    sizeMax.value = item.sizeMax
    progressMin.value = item.progressMin
    progressMax.value = item.progressMax
    activeTag.value = item.activeTag
    activeCategory.value = item.activeCategory
  }

  /** 删除一个已保存的筛选 */
  function deleteSavedFilter(id: string): void {
    savedFilters.value = savedFilters.value.filter((f) => f.id !== id)
    persistSavedFilters()
  }

  /** 清除所有筛选条件（恢复默认） */
  function clearAllFilters(): void {
    searchQuery.value = ''
    searchFields.value = { name: true, hash: false, savePath: false, tracker: false }
    sizeMin.value = 0
    sizeMax.value = 0
    progressMin.value = 0
    progressMax.value = 0
    activeTag.value = ''
    activeCategory.value = ''
    filter.value = 'all'
  }

  function persistSavedFilters(): void {
    try {
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(savedFilters.value))
    } catch {
      // 忽略
    }
  }

  return {
    torrents,
    filter,
    sort,
    reverse,
    selectedHashes,
    loading,
    tags,
    activeTag,
    searchQuery,
    searchFields,
    sizeMin,
    sizeMax,
    progressMin,
    progressMax,
    savedFilters,
    categories,
    activeCategory,
    altSpeedEnabled,
    transfer,
    counts,
    totalSize,
    tagCounts,
    categoryCounts,
    uncategorizedCount,
    totalDownloaded,
    seedingCount,
    downloadingCount,
    pausedCount,
    completedCount,
    filteredTorrents,
    sortedTorrents,
    selectedCount,
    dlSpeed,
    upSpeed,
    fetchTorrents,
    fetchTransfer,
    fetchTags,
    fetchCategories,
    fetchAltSpeedMode,
    toggleAltSpeed,
    setFilter,
    setSort,
    toggleSelect,
    selectAll,
    selectedArray,
    pauseSelected,
    resumeSelected,
    forceStartSelected,
    deleteSelected,
    addTagsToSelected,
    removeTagsFromSelected,
    updateTorrentTags,
    createTags,
    renameTag,
    deleteTag,
    createCategory,
    editCategory,
    deleteCategory,
    setTorrentCategory,
    setDownloadLimit,
    setUploadLimit,
    setTorrentLocation,
    exportTorrentFile,
    renameTorrentAction,
    saveCurrentFilter,
    applySavedFilter,
    deleteSavedFilter,
    clearAllFilters,
    reset,
  }
})

export { matchesFilter }
export type { TorrentState }
