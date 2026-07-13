<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
// 以下组件仅用于 h() 渲染，需显式导入
import UCheckbox from '@nuxt/ui/components/Checkbox.vue'
import UProgress from '@nuxt/ui/components/Progress.vue'
import UBadge from '@nuxt/ui/components/Badge.vue'
import UButton from '@nuxt/ui/components/Button.vue'
import UDropdownMenu from '@nuxt/ui/components/DropdownMenu.vue'
import UTooltip from '@nuxt/ui/components/Tooltip.vue'
import type {
  Torrent,
  TorrentFile,
  TorrentTracker,
  TorrentPeers,
} from '@/types/qbittorrent'
import { useTorrentListStore } from '@/stores/torrentList'
import {
  getTorrentFiles,
  getTorrentTrackers,
  getTorrentPeers,
  setFilePriority,
  addTrackers,
  removeTrackers,
  editTracker,
  pauseTorrents,
  resumeTorrents,
  recheckTorrents,
  reannounceTorrents,
  toggleSequentialDownload,
  toggleFirstLastPiecePriority,
} from '@/api/modules/torrents'
import {
  formatSize,
  formatSpeed,
  formatTimestamp,
  formatRatio,
  formatProgress,
  formatEta,
  formatDuration,
} from '@/utils/format'
import { getStateMeta } from '@/utils/state'

const props = defineProps<{ hash: string | null }>()
const emit = defineEmits<{ 'update:hash': [value: string | null] }>()

const store = useTorrentListStore()
const toast = useToast()

const show = computed({
  get: () => !!props.hash,
  set: (v: boolean) => {
    if (!v) emit('update:hash', null)
  },
})

const activeTab = ref<'overview' | 'files' | 'trackers' | 'peers'>('overview')
const loading = ref(false)
const refreshing = ref(false)
const torrentAction = ref('')
const files = ref<TorrentFile[]>([])
const trackers = ref<TorrentTracker[]>([])
const peers = ref<TorrentPeers | null>(null)

/** 标签页配置 */
const tabItems = [
  { label: '概要', icon: 'i-lucide-info', value: 'overview', slot: 'overview' },
  { label: '文件', icon: 'i-lucide-file', value: 'files', slot: 'files' },
  { label: 'Tracker', icon: 'i-lucide-globe', value: 'trackers', slot: 'trackers' },
  { label: '对等方', icon: 'i-lucide-users', value: 'peers', slot: 'peers' },
]

/** 当前种子信息（从 store 中查找） */
const torrent = computed<Torrent | undefined>(() =>
  store.torrents.find((t) => t.hash === props.hash),
)

const stateMeta = computed(() =>
  torrent.value ? getStateMeta(torrent.value.state) : null,
)

const isPaused = computed(() =>
  torrent.value
    ? ['pausedUP', 'pausedDL', 'stoppedUP', 'stoppedDL'].includes(torrent.value.state)
    : false,
)

// 加载详情数据
async function loadDetailData() {
  if (!props.hash) return
  loading.value = true
  try {
    if (activeTab.value === 'files') {
      files.value = await getTorrentFiles(props.hash)
    } else if (activeTab.value === 'trackers') {
      trackers.value = await getTorrentTrackers(props.hash)
    } else if (activeTab.value === 'peers') {
      peers.value = await getTorrentPeers(props.hash)
    }
  } catch {
    toast.add({ title: '加载详情失败', color: 'error' })
  } finally {
    loading.value = false
  }
}

/** 刷新主列表和当前标签页数据 */
async function refreshDetail(showToast = false) {
  if (!props.hash || refreshing.value) return
  refreshing.value = true
  try {
    await store.fetchTorrents()
    if (activeTab.value !== 'overview') await loadDetailData()
    if (showToast) toast.add({ title: '详情已刷新', color: 'success' })
  } catch {
    toast.add({ title: '刷新详情失败', color: 'error' })
  } finally {
    refreshing.value = false
  }
}

/** 暂停或恢复当前种子 */
async function handlePauseResume() {
  if (!props.hash || torrentAction.value) return
  const wasPaused = isPaused.value
  torrentAction.value = 'pause'
  try {
    if (wasPaused) await resumeTorrents([props.hash])
    else await pauseTorrents([props.hash])
    await store.fetchTorrents()
    toast.add({ title: wasPaused ? '已恢复' : '已暂停', color: 'success' })
  } catch {
    toast.add({ title: '操作失败', color: 'error' })
  } finally {
    torrentAction.value = ''
  }
}

/** 执行单个种子命令并同步详情 */
async function runTorrentCommand(
  key: string,
  successTitle: string,
  action: (hashes: string[]) => Promise<void>,
) {
  if (!props.hash || torrentAction.value) return
  torrentAction.value = key
  try {
    await action([props.hash])
    await store.fetchTorrents()
    toast.add({ title: successTitle, color: 'success' })
  } catch {
    toast.add({ title: '操作失败', color: 'error' })
  } finally {
    torrentAction.value = ''
  }
}

// hash 或 tab 变化时重新加载
watch(
  [() => props.hash, activeTab],
  () => {
    if (props.hash && activeTab.value !== 'overview') {
      loadDetailData()
    }
  },
  { immediate: true },
)

// 复制 hash
async function copyHash() {
  if (!props.hash) return
  try {
    await navigator.clipboard.writeText(props.hash)
    toast.add({ title: 'Hash 已复制', color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
}

async function copyText(text: string, successTitle: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: successTitle, color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
}

// ===== 限速设置 =====
const dlLimitKiB = ref(0) // 下载限速（KiB/s），0 = 不限速
const upLimitKiB = ref(0) // 上传限速（KiB/s），0 = 不限速
const limitSaving = ref(false)

// ===== 重命名 =====
const editingName = ref(false)
const nameInput = ref('')
const renameSaving = ref(false)

// ===== 保存路径 =====
const editingPath = ref(false)
const pathInput = ref('')
const pathSaving = ref(false)

// ===== 分类修改 =====
const editingCategory = ref(false)
const categorySelect = ref('')

/** 分类下拉选项 */
const categoryItems = computed(() => [
  { label: '不指定分类', value: '' },
  ...store.categories.map((c) => ({ label: c.name, value: c.name })),
])

/** 当种子变化时，同步限速值（bytes → KiB） */
watch(
  torrent,
  (t) => {
    if (t) {
      dlLimitKiB.value = t.dl_limit > 0 ? Math.round(t.dl_limit / 1024) : 0
      upLimitKiB.value = t.up_limit > 0 ? Math.round(t.up_limit / 1024) : 0
      nameInput.value = t.name
      pathInput.value = t.save_path
      categorySelect.value = t.category
    }
  },
  { immediate: true },
)

/** 保存限速 */
async function saveLimits() {
  if (!props.hash) return
  limitSaving.value = true
  try {
    // KiB/s → bytes/s
    const dlBytes = dlLimitKiB.value > 0 ? dlLimitKiB.value * 1024 : 0
    const upBytes = upLimitKiB.value > 0 ? upLimitKiB.value * 1024 : 0
    await store.setDownloadLimit(dlBytes, [props.hash])
    await store.setUploadLimit(upBytes, [props.hash])
    toast.add({ title: '限速已更新', color: 'success' })
  } catch {
    toast.add({ title: '限速设置失败', color: 'error' })
  } finally {
    limitSaving.value = false
  }
}

/** 保存重命名 */
async function saveName() {
  if (!props.hash || !nameInput.value.trim()) return
  renameSaving.value = true
  try {
    await store.renameTorrentAction(props.hash, nameInput.value.trim())
    toast.add({ title: '名称已更新', color: 'success' })
    editingName.value = false
  } catch {
    toast.add({ title: '重命名失败', color: 'error' })
  } finally {
    renameSaving.value = false
  }
}

/** 保存路径 */
async function savePath() {
  if (!props.hash || !pathInput.value.trim()) return
  pathSaving.value = true
  try {
    await store.setTorrentLocation(pathInput.value.trim(), [props.hash])
    toast.add({ title: '路径已更新', color: 'success' })
    editingPath.value = false
  } catch {
    toast.add({ title: '路径更新失败', color: 'error' })
  } finally {
    pathSaving.value = false
  }
}

/** 保存分类 */
async function saveCategory() {
  if (!props.hash) return
  try {
    await store.setTorrentCategory(categorySelect.value, [props.hash])
    toast.add({ title: '分类已更新', color: 'success' })
    editingCategory.value = false
  } catch {
    toast.add({ title: '分类更新失败', color: 'error' })
  }
}

/** 导出 .torrent 文件 */
async function handleExport() {
  if (!props.hash) return
  try {
    const blob = await store.exportTorrentFile(props.hash)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${torrent.value?.name || props.hash}.torrent`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.add({ title: '导出成功', color: 'success' })
  } catch {
    toast.add({ title: '导出失败', color: 'error' })
  }
}

// 文件优先级操作
async function handleFilePriority(indexes: number[], priority: 0 | 1 | 6 | 7) {
  if (!props.hash) return
  try {
    await setFilePriority(props.hash, indexes, priority)
    toast.add({ title: '优先级已更新', color: 'success' })
    files.value = await getTorrentFiles(props.hash)
  } catch {
    toast.add({ title: '设置失败', color: 'error' })
  }
}

/** 优先级映射颜色 */
function priorityColor(priority: number): 'neutral' | 'primary' | 'warning' | 'error' {
  if (priority === 0) return 'neutral'
  if (priority === 1) return 'primary'
  if (priority === 6) return 'warning'
  return 'error'
}

/** 优先级映射文案 */
function priorityLabel(priority: number): string {
  const map: Record<number, string> = { 0: '跳过', 1: '普通', 6: '高', 7: '最高' }
  return map[priority] ?? '普通'
}

// ===== 文件筛选与批量选择 =====
const fileSearch = ref('')
const selectedFileIndexes = ref<Set<number>>(new Set())

const filteredFiles = computed(() => {
  const keyword = fileSearch.value.trim().toLocaleLowerCase()
  if (!keyword) return files.value
  return files.value.filter((file) => file.name.toLocaleLowerCase().includes(keyword))
})

const allVisibleFilesSelected = computed(() =>
  filteredFiles.value.length > 0
  && filteredFiles.value.every((file) => selectedFileIndexes.value.has(file.index)),
)

const someVisibleFilesSelected = computed(() =>
  !allVisibleFilesSelected.value
  && filteredFiles.value.some((file) => selectedFileIndexes.value.has(file.index)),
)

function toggleAllVisibleFiles(selected: boolean) {
  const next = new Set(selectedFileIndexes.value)
  for (const file of filteredFiles.value) {
    if (selected) next.add(file.index)
    else next.delete(file.index)
  }
  selectedFileIndexes.value = next
}

/** 文件列表列定义 */
const fileColumns: TableColumn<TorrentFile>[] = [
  {
    id: 'select',
    header: () => h(UCheckbox, {
      modelValue: allVisibleFilesSelected.value
        ? true
        : someVisibleFilesSelected.value
          ? 'indeterminate'
          : false,
      'onUpdate:modelValue': (value: unknown) => {
        if (value !== 'indeterminate') toggleAllVisibleFiles(value === true)
      },
      'aria-label': '选择当前显示的全部文件',
    }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': selectedFileIndexes.value.has(row.original.index),
        'onUpdate:modelValue': (val: unknown) => {
          if (val !== 'indeterminate') toggleFileSelect(row.original.index)
        },
        class: 'cursor-pointer',
      }),
    size: 40,
  },
  {
    accessorKey: 'name',
    header: '文件名',
    cell: ({ row }) => h('span', { class: 'block max-w-[240px] truncate', title: row.original.name }, row.original.name),
    size: 240,
  },
  {
    accessorKey: 'size',
    header: '大小',
    cell: ({ row }) => formatSize(row.original.size),
    size: 90,
  },
  {
    accessorKey: 'progress',
    header: '进度',
    cell: ({ row }) => {
      const p = formatProgress(row.original.progress)
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UProgress, {
          modelValue: p,
          max: 100,
          size: 'sm',
          color: row.original.progress >= 1 ? 'success' : 'primary',
          class: 'flex-1 min-w-[50px]',
        }),
        h('span', { class: 'text-[11px] tabular-nums text-right min-w-[32px]' }, `${p}%`),
      ])
    },
    size: 120,
  },
  {
    id: 'priority',
    header: '优先级',
    cell: ({ row }) =>
      h(
        UDropdownMenu,
        {
          items: [
            { label: '跳过', onSelect: () => handleFilePriority([row.original.index], 0) },
            { label: '普通', onSelect: () => handleFilePriority([row.original.index], 1) },
            { label: '高', onSelect: () => handleFilePriority([row.original.index], 6) },
            { label: '最高', onSelect: () => handleFilePriority([row.original.index], 7) },
          ],
          content: { align: 'end' },
          ui: { content: 'z-60' },
        },
        {
          default: () => h(UButton, {
            label: priorityLabel(row.original.priority),
            color: priorityColor(row.original.priority),
            variant: 'soft',
            size: 'xs',
            trailingIcon: 'i-lucide-chevron-down',
          }),
        },
      ),
    size: 120,
  },
]

/** 对等方行类型 */
type PeerRow = {
  ip: string
  port: number
  client: string
  progress: number
  dl_speed: number
  up_speed: number
  country_code: string
}

type PeerSortKey = 'ip' | 'client' | 'progress' | 'dl_speed' | 'up_speed' | 'country_code'

/** 对等方排序表头：与数据共用同一张表，避免列错位 */
function peerHeader(label: string, key: PeerSortKey) {
  return () => h(
    'button',
    {
      type: 'button',
      class: 'inline-flex items-center gap-1 whitespace-nowrap hover:text-primary transition-colors',
      onClick: () => togglePeerSort(key),
    },
    [
      label,
      peerSortKey.value === key
        ? h('span', { class: 'text-[10px]' }, peerSortReverse.value ? '▼' : '▲')
        : null,
    ],
  )
}

/** 对等方列表列定义 */
const peerColumns: TableColumn<PeerRow>[] = [
  {
    accessorKey: 'ip',
    header: peerHeader('IP:端口', 'ip'),
    cell: ({ row }) => h(
      UTooltip,
      {
        text: `${row.original.ip}:${row.original.port}`,
        delayDuration: 200,
        ui: {
          content: 'z-60 max-w-[min(90vw,480px)]',
          text: 'break-all font-mono',
        },
      },
      {
        default: () => h(
          'span',
          { class: 'block max-w-[150px] cursor-help truncate font-mono' },
          `${row.original.ip}:${row.original.port}`,
        ),
      },
    ),
    size: 160,
  },
  {
    accessorKey: 'client',
    header: peerHeader('客户端', 'client'),
    cell: ({ row }) => h('span', { class: 'block max-w-[130px] truncate', title: row.original.client }, row.original.client || '—'),
    size: 140,
  },
  {
    accessorKey: 'progress',
    header: peerHeader('进度', 'progress'),
    cell: ({ row }) => `${formatProgress(row.original.progress)}%`,
    size: 70,
  },
  {
    accessorKey: 'dl_speed',
    header: peerHeader('下载', 'dl_speed'),
    cell: ({ row }) =>
      row.original.dl_speed > 0 ? formatSpeed(row.original.dl_speed) : '—',
    size: 90,
  },
  {
    accessorKey: 'up_speed',
    header: peerHeader('上传', 'up_speed'),
    cell: ({ row }) =>
      row.original.up_speed > 0 ? formatSpeed(row.original.up_speed) : '—',
    size: 90,
  },
  {
    accessorKey: 'country_code',
    header: peerHeader('地区', 'country_code'),
    cell: ({ row }) => row.original.country_code || '—',
    size: 60,
  },
]

const peerList = computed(() =>
  peers.value ? Object.values(peers.value.peers) : [],
)

const peerSummary = computed(() => ({
  count: peerList.value.length,
  downloadSpeed: peerList.value.reduce((sum, peer) => sum + peer.dl_speed, 0),
  uploadSpeed: peerList.value.reduce((sum, peer) => sum + peer.up_speed, 0),
}))

// ===== Peers 排序 =====
const peerSortKey = ref<PeerSortKey | null>(null)
const peerSortReverse = ref(false)

/** 排序后的 Peers 列表 */
const sortedPeerList = computed(() => {
  if (!peerSortKey.value) return peerList.value
  const key = peerSortKey.value
  const list = [...peerList.value]
  list.sort((a, b) => {
    let cmp = 0
    if (key === 'progress') {
      cmp = a.progress - b.progress
    } else if (key === 'dl_speed' || key === 'up_speed') {
      cmp = a[key] - b[key]
    } else {
      cmp = String(a[key]).localeCompare(String(b[key]))
    }
    return peerSortReverse.value ? -cmp : cmp
  })
  return list
})

/** 切换 Peers 排序 */
function togglePeerSort(key: PeerSortKey) {
  if (peerSortKey.value === key) {
    peerSortReverse.value = !peerSortReverse.value
  } else {
    peerSortKey.value = key
    peerSortReverse.value = false
  }
}

// ===== Tracker 管理 =====
const trackerInput = ref('')
const trackerAdding = ref(false)
const editingTrackerUrl = ref<string | null>(null)
const trackerEditInput = ref('')
const trackerEditing = ref(false)

function isEditableTracker(url: string) {
  return /^(https?|udp|wss?):\/\//i.test(url)
}

function startEditTracker(url: string) {
  editingTrackerUrl.value = url
  trackerEditInput.value = url
}

function cancelEditTracker() {
  editingTrackerUrl.value = null
  trackerEditInput.value = ''
}

async function handleEditTracker() {
  if (!props.hash || !editingTrackerUrl.value || !trackerEditInput.value.trim()) return
  const newUrl = trackerEditInput.value.trim()
  if (newUrl === editingTrackerUrl.value) {
    cancelEditTracker()
    return
  }
  trackerEditing.value = true
  try {
    await editTracker(props.hash, editingTrackerUrl.value, newUrl)
    toast.add({ title: 'Tracker 已修改', color: 'success' })
    cancelEditTracker()
    trackers.value = await getTorrentTrackers(props.hash)
  } catch {
    toast.add({ title: '修改 Tracker 失败', color: 'error' })
  } finally {
    trackerEditing.value = false
  }
}

/** 添加 Tracker */
async function handleAddTracker() {
  if (!props.hash || !trackerInput.value.trim()) return
  trackerAdding.value = true
  try {
    await addTrackers(props.hash, trackerInput.value.trim())
    toast.add({ title: 'Tracker 已添加', color: 'success' })
    trackerInput.value = ''
    trackers.value = await getTorrentTrackers(props.hash)
  } catch {
    toast.add({ title: '添加 Tracker 失败', color: 'error' })
  } finally {
    trackerAdding.value = false
  }
}

/** 删除 Tracker */
async function handleRemoveTracker(url: string) {
  if (!props.hash) return
  try {
    await removeTrackers(props.hash, url)
    toast.add({ title: 'Tracker 已删除', color: 'success' })
    trackers.value = await getTorrentTrackers(props.hash)
  } catch {
    toast.add({ title: '删除 Tracker 失败', color: 'error' })
  }
}

/** 切换文件选中 */
function toggleFileSelect(index: number) {
  const next = new Set(selectedFileIndexes.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  selectedFileIndexes.value = next
}

/** 批量设置文件优先级 */
async function handleBatchPriority(priority: 0 | 1 | 6 | 7) {
  if (!props.hash || selectedFileIndexes.value.size === 0) return
  try {
    await setFilePriority(props.hash, [...selectedFileIndexes.value], priority)
    toast.add({ title: `已批量设置 ${selectedFileIndexes.value.size} 个文件`, color: 'success' })
    selectedFileIndexes.value = new Set()
    files.value = await getTorrentFiles(props.hash)
  } catch {
    toast.add({ title: '批量设置失败', color: 'error' })
  }
}

// hash 变化时清空文件选中
watch(() => props.hash, () => {
  selectedFileIndexes.value = new Set()
  fileSearch.value = ''
  peerSortKey.value = null
  peerSortReverse.value = false
  cancelEditTracker()
})
</script>

<template>
  <USlideover
    v-model:open="show"
    :title="torrent?.name || '种子详情'"
    :ui="{
      overlay: 'z-40',
      content: 'z-50 w-[680px] max-w-full',
    }"
  >
    <template #actions>
      <UButton
        :icon="isPaused ? 'i-lucide-play' : 'i-lucide-pause'"
        color="neutral"
        variant="ghost"
        size="sm"
        :loading="torrentAction === 'pause'"
        :aria-label="isPaused ? '恢复种子' : '暂停种子'"
        :title="isPaused ? '恢复种子' : '暂停种子'"
        @click="handlePauseResume"
      />
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
        size="sm"
        :loading="refreshing"
        aria-label="刷新详情"
        title="刷新详情"
        @click="refreshDetail(true)"
      />
    </template>

    <template #body>
      <template v-if="torrent">
        <!-- 状态标识 + 进度 -->
        <div class="flex items-center gap-4 mb-5">
          <div
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
            :style="{ background: `${stateMeta?.color}22`, color: stateMeta?.color }"
          >
            <UIcon :name="stateMeta?.icon" class="size-4" />
            {{ stateMeta?.label }}
          </div>
          <div class="flex-1 flex items-center gap-2 min-w-0">
            <UProgress
              :model-value="formatProgress(torrent.progress)"
              :max="100"
              size="md"
              :color="torrent.progress >= 1 ? 'success' : 'primary'"
              class="flex-1"
            />
            <span class="text-xs tabular-nums text-muted whitespace-nowrap">
              {{ formatProgress(torrent.progress) }}%
            </span>
          </div>
        </div>

        <UTabs v-model="activeTab" :items="tabItems">
          <!-- 概要 -->
          <template #overview>
            <div class="flex flex-col">
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">Hash</span>
                <div class="flex-1 min-w-0 font-mono text-xs flex items-center gap-1">
                  <span class="truncate">{{ torrent.hash }}</span>
                  <UButton
                    size="xs"
                    variant="ghost"
                    icon="i-lucide-copy"
                    @click="copyHash"
                  />
                </div>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">大小</span>
                <span class="flex-1 text-[13px] break-all">
                  {{ formatSize(torrent.size) }}<template v-if="torrent.total_size > 0 && torrent.total_size !== torrent.size"> / {{ formatSize(torrent.total_size) }}</template>
                </span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">已下载</span>
                <span class="flex-1 text-[13px] break-all">{{ formatSize(torrent.downloaded) }}</span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">已上传</span>
                <span class="flex-1 text-[13px] break-all">{{ formatSize(torrent.uploaded) }}（比率 {{ formatRatio(torrent.ratio) }}）</span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">添加时间</span>
                <span class="flex-1 text-[13px] break-all">{{ formatTimestamp(torrent.added_on) }}</span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">完成时间</span>
                <span class="flex-1 text-[13px] break-all">{{ torrent.completion_on ? formatTimestamp(torrent.completion_on) : '—' }}</span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">剩余时间</span>
                <span class="flex-1 text-[13px]">{{ formatEta(torrent.eta) }}</span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">活动时间</span>
                <span class="flex-1 text-[13px]">{{ formatDuration(torrent.time_active) }}</span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">最后活动</span>
                <span class="flex-1 text-[13px]">{{ formatTimestamp(torrent.last_activity) }}</span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">可用性</span>
                <span class="flex-1 text-[13px] tabular-nums">{{ torrent.availability < 0 ? '—' : torrent.availability.toFixed(3) }}</span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">保存路径</span>
                <span class="flex-1 text-[13px] line-clamp-2 break-all">{{ torrent.save_path }}</span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">内容路径</span>
                <span class="flex-1 text-[13px] line-clamp-2 break-all">{{ torrent.content_path || '—' }}</span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">Magnet</span>
                <div class="flex-1 min-w-0 flex items-center gap-1">
                  <span class="truncate text-xs font-mono">{{ torrent.magnet_uri || '—' }}</span>
                  <UButton
                    v-if="torrent.magnet_uri"
                    size="xs"
                    variant="ghost"
                    icon="i-lucide-copy"
                    aria-label="复制 Magnet 链接"
                    @click="copyText(torrent.magnet_uri, 'Magnet 链接已复制')"
                  />
                </div>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">Tracker</span>
                <span class="flex-1 min-w-0 text-[13px] truncate">{{ torrent.tracker || '—' }}</span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">做种数</span>
                <span class="flex-1 text-[13px] break-all">{{ torrent.num_seeds }}（总 {{ torrent.num_complete }}）</span>
              </div>
              <div class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">下载者</span>
                <span class="flex-1 text-[13px] break-all">{{ torrent.num_leechs }}（总 {{ torrent.num_incomplete }}）</span>
              </div>
              <div v-if="torrent.dlspeed > 0" class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">下载速度</span>
                <span class="flex-1 text-[13px] text-blue-500 font-semibold">{{ formatSpeed(torrent.dlspeed) }}</span>
              </div>
              <div v-if="torrent.upspeed > 0" class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">上传速度</span>
                <span class="flex-1 text-[13px] text-green-500 font-semibold">{{ formatSpeed(torrent.upspeed) }}</span>
              </div>
              <div v-if="torrent.tags" class="flex py-2.5 border-b border-default gap-3">
                <span class="w-20 shrink-0 text-[13px] text-muted">标签</span>
                <div class="flex-1 flex items-center gap-1 flex-wrap">
                  <UBadge
                    v-for="t in torrent.tags.split(',').filter(Boolean)"
                    :key="t"
                    :label="t"
                    color="primary"
                    variant="subtle"
                    size="sm"
                  />
                </div>
              </div>
            </div>

            <!-- 操作区域 -->
            <div class="mt-4 flex flex-col gap-3">
              <h4 class="m-0 text-sm font-semibold text-default flex items-center gap-1.5">
                <UIcon name="i-lucide-settings-2" class="size-4" />
                种子操作
              </h4>

              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-radio"
                  label="重新汇报"
                  :loading="torrentAction === 'reannounce'"
                  @click="runTorrentCommand('reannounce', '已向 Tracker 重新汇报', reannounceTorrents)"
                />
                <UButton
                  size="sm"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-shield-check"
                  label="重新校验"
                  :loading="torrentAction === 'recheck'"
                  @click="runTorrentCommand('recheck', '已开始重新校验', recheckTorrents)"
                />
                <UButton
                  size="sm"
                  :color="torrent.seq_dl ? 'primary' : 'neutral'"
                  variant="soft"
                  icon="i-lucide-list-ordered"
                  label="顺序下载"
                  :loading="torrentAction === 'sequential'"
                  @click="runTorrentCommand('sequential', '顺序下载设置已更新', toggleSequentialDownload)"
                />
                <UButton
                  size="sm"
                  :color="torrent.f_l_piece_prio ? 'primary' : 'neutral'"
                  variant="soft"
                  icon="i-lucide-chevrons-left-right-ellipsis"
                  label="首尾优先"
                  :loading="torrentAction === 'first-last'"
                  @click="runTorrentCommand('first-last', '首尾块优先设置已更新', toggleFirstLastPiecePriority)"
                />
              </div>

              <!-- 重命名 -->
              <div class="flex items-center gap-2">
                <span class="w-20 shrink-0 text-[13px] text-muted">名称</span>
                <UInput
                  v-if="editingName"
                  v-model="nameInput"
                  size="sm"
                  class="flex-1"
                  :loading="renameSaving"
                  @keyup.enter="saveName"
                />
                <span v-else class="flex-1 text-[13px] truncate">{{ torrent.name }}</span>
                <UButton
                  v-if="editingName"
                  size="xs"
                  color="primary"
                  icon="i-lucide-check"
                  :loading="renameSaving"
                  @click="saveName"
                />
                <UButton
                  v-else
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-pencil"
                  @click="() => { editingName = true }"
                />
              </div>

              <!-- 分类 -->
              <div class="flex items-center gap-2">
                <span class="w-20 shrink-0 text-[13px] text-muted">分类</span>
                <USelect
                  v-if="editingCategory"
                  v-model="categorySelect"
                  :items="categoryItems"
                  size="sm"
                  class="flex-1"
                  :ui="{ content: 'z-60' }"
                />
                <span v-else class="flex-1 text-[13px] truncate">{{ torrent.category || '未分类' }}</span>
                <UButton
                  v-if="editingCategory"
                  size="xs"
                  color="primary"
                  icon="i-lucide-check"
                  @click="saveCategory"
                />
                <UButton
                  v-else
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-pencil"
                  @click="() => { editingCategory = true }"
                />
              </div>

              <!-- 保存路径 -->
              <div class="flex items-center gap-2">
                <span class="w-20 shrink-0 text-[13px] text-muted">路径</span>
                <UInput
                  v-if="editingPath"
                  v-model="pathInput"
                  size="sm"
                  class="flex-1"
                  :loading="pathSaving"
                  @keyup.enter="savePath"
                />
                <span v-else class="flex-1 text-[13px] truncate">{{ torrent.save_path }}</span>
                <UButton
                  v-if="editingPath"
                  size="xs"
                  color="primary"
                  icon="i-lucide-check"
                  :loading="pathSaving"
                  @click="savePath"
                />
                <UButton
                  v-else
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-pencil"
                  @click="() => { editingPath = true }"
                />
              </div>

              <!-- 限速设置 -->
              <div class="flex items-center gap-2">
                <span class="w-20 shrink-0 text-[13px] text-muted">下载限速</span>
                <UInputNumber
                  v-model="dlLimitKiB"
                  :min="0"
                  size="sm"
                  class="flex-1"
                  placeholder="0 = 不限速"
                />
                <span class="text-xs text-muted whitespace-nowrap">KiB/s</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-20 shrink-0 text-[13px] text-muted">上传限速</span>
                <UInputNumber
                  v-model="upLimitKiB"
                  :min="0"
                  size="sm"
                  class="flex-1"
                  placeholder="0 = 不限速"
                />
                <span class="text-xs text-muted whitespace-nowrap">KiB/s</span>
              </div>
              <UButton
                size="sm"
                color="primary"
                variant="soft"
                icon="i-lucide-save"
                :loading="limitSaving"
                label="保存限速"
                @click="saveLimits"
              />

              <!-- 导出 .torrent -->
              <UButton
                size="sm"
                color="neutral"
                variant="soft"
                icon="i-lucide-download"
                label="导出 .torrent 文件"
                @click="handleExport"
              />
            </div>
          </template>

          <!-- 文件列表 -->
          <template #files>
            <div class="mb-3 flex items-center gap-2">
              <UInput
                v-model="fileSearch"
                icon="i-lucide-search"
                placeholder="搜索文件名"
                size="sm"
                class="flex-1"
              />
              <span class="shrink-0 text-xs tabular-nums text-muted">
                {{ filteredFiles.length }} / {{ files.length }}
              </span>
            </div>

            <!-- 批量操作栏 -->
            <div v-if="files.length && selectedFileIndexes.size > 0" class="flex flex-wrap items-center gap-2 mb-2 p-2 bg-primary/10 border border-primary/30 rounded-lg">
              <span class="text-sm text-primary">已选 {{ selectedFileIndexes.size }} 个文件</span>
              <UButton size="xs" color="neutral" variant="ghost" label="清除" @click="() => { selectedFileIndexes = new Set() }" />
              <div class="flex flex-wrap gap-1 w-full sm:w-auto sm:ml-auto">
                <UButton size="xs" color="neutral" variant="soft" label="跳过" @click="handleBatchPriority(0)" />
                <UButton size="xs" color="neutral" variant="soft" label="普通" @click="handleBatchPriority(1)" />
                <UButton size="xs" color="warning" variant="soft" label="高" @click="handleBatchPriority(6)" />
                <UButton size="xs" color="error" variant="soft" label="最高" @click="handleBatchPriority(7)" />
              </div>
            </div>

            <UTable
              v-if="filteredFiles.length"
              :data="filteredFiles"
              :columns="fileColumns"
              :loading="loading"
              class="w-full max-w-full"
              :ui="{
                base: 'min-w-[610px]',
                th: 'px-2 py-2.5',
                td: 'px-2 py-2.5',
              }"
            />
            <div v-else-if="loading" class="flex items-center justify-center py-12">
              <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
            </div>
            <UEmpty v-else :description="fileSearch ? '没有匹配的文件' : '暂无文件数据'" />
          </template>

          <!-- Tracker -->
          <template #trackers>
            <!-- 添加 Tracker 输入区 -->
            <div class="flex items-end gap-2 mb-3">
              <UTextarea
                v-model="trackerInput"
                placeholder="输入 Tracker URL，每行一个"
                class="flex-1"
                :rows="2"
                :disabled="trackerAdding"
              />
              <UButton
                color="primary"
                icon="i-lucide-plus"
                :loading="trackerAdding"
                label="添加"
                @click="handleAddTracker"
              />
            </div>

            <div v-if="trackers.length" class="flex flex-col gap-1">
              <div
                v-for="(t, i) in trackers"
                :key="`${t.url}-${i}`"
                class="flex items-center gap-2 p-2 rounded-md hover:bg-elevated/50 group"
              >
                <UIcon name="i-lucide-globe" class="size-4 text-muted shrink-0" />
                <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                  <UInput
                    v-if="editingTrackerUrl === t.url"
                    v-model="trackerEditInput"
                    size="sm"
                    class="w-full"
                    :disabled="trackerEditing"
                    autofocus
                    @keyup.enter="handleEditTracker"
                    @keyup.esc="cancelEditTracker"
                  />
                  <UTooltip
                    v-else
                    :text="t.url"
                    :delay-duration="200"
                    :ui="{ content: 'z-60 max-w-[min(90vw,520px)]', text: 'break-all font-mono' }"
                  >
                    <span class="block cursor-help truncate text-xs">{{ t.url }}</span>
                  </UTooltip>
                  <div v-if="editingTrackerUrl !== t.url" class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                    <UBadge
                      :label="t.status === 2 ? '工作中' : t.status === 3 ? '更新中' : t.status === 4 ? '未工作' : t.status === 1 ? '未联系' : '已禁用'"
                      :color="t.status === 2 ? 'success' : t.status === 4 ? 'error' : t.status === 3 ? 'warning' : 'neutral'"
                      variant="subtle"
                      size="xs"
                    />
                    <span>种子: {{ t.num_seeds }}</span>
                    <span>下载者: {{ t.num_leeches }}</span>
                    <span v-if="t.tier >= 0">层级: {{ t.tier }}</span>
                  </div>
                  <span v-if="editingTrackerUrl !== t.url && t.msg" class="truncate text-[11px] text-warning" :title="t.msg">{{ t.msg }}</span>
                </div>
                <template v-if="editingTrackerUrl === t.url">
                  <UButton
                    icon="i-lucide-check"
                    size="xs"
                    color="primary"
                    variant="ghost"
                    :loading="trackerEditing"
                    aria-label="保存 Tracker"
                    @click="handleEditTracker"
                  />
                  <UButton
                    icon="i-lucide-x"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :disabled="trackerEditing"
                    aria-label="取消修改"
                    @click="cancelEditTracker"
                  />
                </template>
                <template v-else-if="isEditableTracker(t.url)">
                  <UButton
                    icon="i-lucide-pencil"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    class="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="修改 Tracker"
                    @click="startEditTracker(t.url)"
                  />
                  <UButton
                    icon="i-lucide-trash"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    class="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="删除 Tracker"
                    @click="handleRemoveTracker(t.url)"
                  />
                </template>
              </div>
            </div>
            <div v-else-if="loading" class="flex items-center justify-center py-12">
              <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
            </div>
            <UEmpty v-else description="暂无 Tracker" />
          </template>

          <!-- 对等方 -->
          <template #peers>
            <div v-if="sortedPeerList.length" class="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-elevated/50 px-3 py-2 text-xs text-muted">
              <span>连接 <strong class="text-default">{{ peerSummary.count }}</strong></span>
              <span>下载 <strong class="text-blue-500">{{ formatSpeed(peerSummary.downloadSpeed) }}</strong></span>
              <span>上传 <strong class="text-emerald-500">{{ formatSpeed(peerSummary.uploadSpeed) }}</strong></span>
            </div>
            <UTable
              v-if="sortedPeerList.length"
              :data="sortedPeerList"
              :columns="peerColumns"
              class="w-full max-w-full"
              :ui="{
                root: 'max-h-[400px]',
                base: 'min-w-[610px]',
                thead: 'sticky top-0 z-1 bg-default',
                th: 'px-2 py-2.5 text-xs',
                td: 'px-2 py-2.5 text-xs tabular-nums',
              }"
            />
            <div v-else-if="loading" class="flex items-center justify-center py-12">
              <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
            </div>
            <UEmpty v-else description="暂无对等方" />
          </template>
        </UTabs>
      </template>

      <div v-else class="py-10">
        <UEmpty description="未选中种子" />
      </div>
    </template>
  </USlideover>
</template>
