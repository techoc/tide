import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import type { Torrent, TorrentFilter, TorrentState, TorrentSort } from '@/types/qbittorrent'
import {
  getTorrents,
  pauseTorrents,
  resumeTorrents,
  deleteTorrents,
  getTags,
  addTags,
  removeTags,
  deleteTags as deleteTagsApi,
  forceStartTorrents,
} from '@/api/modules/torrents'
import { getTransferInfo, type TransferInfo } from '@/api/modules/app'

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
      return t.state === 'pausedUP' || t.state === 'pausedDL' || t.state === 'stoppedUP' || t.state === 'stoppedDL'
    case 'active':
      return t.dlspeed > 0 || t.upspeed > 0
    case 'inactive':
      return t.dlspeed === 0 && t.upspeed === 0
    case 'resumed':
      return t.state !== 'pausedUP' && t.state !== 'pausedDL' && t.state !== 'stoppedUP' && t.state !== 'stoppedDL'
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
  /** 加载状态 */
  const loading = ref(false)
  /** 标签列表 */
  const tags = ref<string[]>([])
  /** 当前选中标签（空表示不限） */
  const activeTag = ref('')
  /** 搜索关键词（按 name 模糊匹配，不区分大小写） */
  const searchQuery = ref('')
  /** 全局传输信息 */
  const transfer = ref<TransferInfo>({
    dl_info_speed: 0,
    dl_info_data: 0,
    up_info_speed: 0,
    up_info_data: 0,
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

  /** 所有种子的总大小（size 之和） */
  const totalSize = computed(() =>
    torrents.value.reduce((sum, t) => sum + t.size, 0),
  )

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

  /** 所有种子的已下载总量（downloaded 之和） */
  const totalDownloaded = computed(() =>
    torrents.value.reduce((sum, t) => sum + t.downloaded, 0),
  )

  /** 做种中的种子数 */
  const seedingCount = computed(
    () =>
      torrents.value.filter((t) => matchesFilter(t, 'seeding')).length,
  )

  /** 下载中的种子数 */
  const downloadingCount = computed(
    () =>
      torrents.value.filter((t) => matchesFilter(t, 'downloading')).length,
  )

  /** 暂停的种子数 */
  const pausedCount = computed(
    () => torrents.value.filter((t) => matchesFilter(t, 'paused')).length,
  )

  /** 已完成的种子数（progress >= 1） */
  const completedCount = computed(
    () => torrents.value.filter((t) => matchesFilter(t, 'completed')).length,
  )

  /** 按分类 + 标签 + 搜索关键词筛选后的列表 */
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
    // 搜索过滤：按 name 模糊匹配，不区分大小写
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter((t) => t.name.toLowerCase().includes(q))
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
    loading.value = true
    try {
      const list = await getTorrents({ sort: 'added_on', reverse: true })
      torrents.value = list
    } finally {
      loading.value = false
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

  /** 删除标签定义（从 qBittorrent 标签列表中移除） */
  async function deleteTag(tag: string): Promise<void> {
    await deleteTagsApi([tag])
    if (activeTag.value === tag) activeTag.value = ''
    await fetchTags()
    await fetchTorrents()
  }

  /** 清空状态（登出时调用） */
  function reset(): void {
    torrents.value = []
    selectedHashes.value = new Set()
    tags.value = []
    activeTag.value = ''
    searchQuery.value = ''
    filter.value = 'all'
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
    transfer,
    counts,
    totalSize,
    tagCounts,
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
    deleteTag,
    reset,
  }
})

export { matchesFilter }
export type { TorrentState }
