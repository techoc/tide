<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
// 以下组件仅用于 h() 渲染，需显式导入
import UCheckbox from '@nuxt/ui/components/Checkbox.vue'
import UProgress from '@nuxt/ui/components/Progress.vue'
import UBadge from '@nuxt/ui/components/Badge.vue'
import UButton from '@nuxt/ui/components/Button.vue'
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
} from '@/api/modules/torrents'
import { formatSize, formatSpeed, formatTimestamp, formatRatio, formatProgress } from '@/utils/format'
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

/** 文件列表列定义 */
const fileColumns: TableColumn<TorrentFile>[] = [
  {
    id: 'select',
    header: '',
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
    cell: ({ row }) => h('span', { class: 'truncate' }, row.original.name),
    minSize: 240,
  },
  {
    accessorKey: 'size',
    header: '大小',
    cell: ({ row }) => formatSize(row.original.size),
    size: 100,
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
    size: 140,
  },
  {
    id: 'priority',
    header: '优先级',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-1' }, [
        h(UBadge, {
          label: priorityLabel(row.original.priority),
          color: priorityColor(row.original.priority),
          variant: 'subtle',
          size: 'sm',
        }),
        h(UButton, {
          label: '跳过',
          size: 'xs',
          variant: 'ghost',
          onClick: () => handleFilePriority([row.original.index], 0),
        }),
        h(UButton, {
          label: '普通',
          size: 'xs',
          variant: 'ghost',
          onClick: () => handleFilePriority([row.original.index], 1),
        }),
        h(UButton, {
          label: '最高',
          size: 'xs',
          variant: 'ghost',
          onClick: () => handleFilePriority([row.original.index], 7),
        }),
      ]),
    size: 180,
  },
]

/** Tracker 列表列定义 */
const trackerColumns: TableColumn<TorrentTracker>[] = [
  {
    accessorKey: 'url',
    header: 'Tracker URL',
    cell: ({ row }) => h('span', { class: 'truncate' }, row.original.url),
    minSize: 280,
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const statusMap: Record<
        number,
        { label: string; color: 'neutral' | 'success' | 'warning' | 'error' }
      > = {
        0: { label: '已禁用', color: 'neutral' },
        1: { label: '未联系', color: 'neutral' },
        2: { label: '工作中', color: 'success' },
        3: { label: '更新中', color: 'warning' },
        4: { label: '未工作', color: 'error' },
      }
      const meta = statusMap[row.original.status] ?? statusMap[0]!
      return h(UBadge, {
        label: meta!.label,
        color: meta!.color,
        variant: 'subtle',
        size: 'sm',
      })
    },
    size: 100,
  },
  { accessorKey: 'num_seeds', header: '种子数', size: 80 },
  { accessorKey: 'num_leeches', header: '下载者', size: 80 },
  { accessorKey: 'num_downloaded', header: '已下载', size: 80 },
  {
    accessorKey: 'msg',
    header: '消息',
    cell: ({ row }) => h('span', { class: 'truncate' }, row.original.msg || '—'),
    minSize: 160,
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

/** 对等方列表列定义 */
const peerColumns: TableColumn<PeerRow>[] = [
  {
    accessorKey: 'ip',
    header: 'IP',
    cell: ({ row }) => `${row.original.ip}:${row.original.port}`,
    size: 180,
  },
  {
    accessorKey: 'client',
    header: '客户端',
    cell: ({ row }) => h('span', { class: 'truncate' }, row.original.client),
    size: 160,
  },
  {
    accessorKey: 'progress',
    header: '进度',
    cell: ({ row }) => `${formatProgress(row.original.progress)}%`,
    size: 100,
  },
  {
    accessorKey: 'dl_speed',
    header: '下载',
    cell: ({ row }) =>
      row.original.dl_speed > 0 ? formatSpeed(row.original.dl_speed) : '—',
    size: 110,
  },
  {
    accessorKey: 'up_speed',
    header: '上传',
    cell: ({ row }) =>
      row.original.up_speed > 0 ? formatSpeed(row.original.up_speed) : '—',
    size: 110,
  },
  {
    accessorKey: 'country_code',
    header: '地区',
    cell: ({ row }) => row.original.country_code || '—',
    size: 70,
  },
]

const peerList = computed(() =>
  peers.value ? Object.values(peers.value.peers) : [],
)

// ===== Peers 排序 =====
const peerSortKey = ref<'ip' | 'client' | 'progress' | 'dl_speed' | 'up_speed' | 'country_code' | null>(null)
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
function togglePeerSort(key: 'ip' | 'client' | 'progress' | 'dl_speed' | 'up_speed' | 'country_code') {
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

// ===== 文件批量优先级 =====
const selectedFileIndexes = ref<Set<number>>(new Set())

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
  peerSortKey.value = null
  peerSortReverse.value = false
})
</script>

<template>
  <USlideover
    v-model:open="show"
    :title="torrent?.name || '种子详情'"
    :ui="{ content: 'w-[680px] max-w-full' }"
  >
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
                <span class="w-20 shrink-0 text-[13px] text-muted">保存路径</span>
                <span class="flex-1 text-[13px] line-clamp-2 break-all">{{ torrent.save_path }}</span>
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
            <!-- 批量操作栏 -->
            <div v-if="files.length && selectedFileIndexes.size > 0" class="flex items-center gap-2 mb-2 p-2 bg-primary/10 border border-primary/30 rounded-lg">
              <span class="text-sm text-primary">已选 {{ selectedFileIndexes.size }} 个文件</span>
              <UButton size="xs" color="neutral" variant="ghost" label="清除" @click="() => { selectedFileIndexes = new Set() }" />
              <div class="flex gap-1 ml-auto">
                <UButton size="xs" color="neutral" variant="soft" label="跳过" @click="handleBatchPriority(0)" />
                <UButton size="xs" color="neutral" variant="soft" label="普通" @click="handleBatchPriority(1)" />
                <UButton size="xs" color="warning" variant="soft" label="高" @click="handleBatchPriority(6)" />
                <UButton size="xs" color="error" variant="soft" label="最高" @click="handleBatchPriority(7)" />
              </div>
            </div>

            <UTable
              v-if="files.length"
              :data="files"
              :columns="fileColumns"
              :loading="loading"
            />
            <div v-else-if="loading" class="flex items-center justify-center py-12">
              <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
            </div>
            <UEmpty v-else description="暂无文件数据" />
          </template>

          <!-- Tracker -->
          <template #trackers>
            <!-- 添加 Tracker 输入区 -->
            <div class="flex gap-2 mb-3">
              <UInput
                v-model="trackerInput"
                placeholder="输入 Tracker URL，每行一个"
                class="flex-1"
                :loading="trackerAdding"
                @keyup.enter="handleAddTracker"
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
                :key="i"
                class="flex items-center gap-2 p-2 rounded-md hover:bg-elevated/50 group"
              >
                <UIcon name="i-lucide-globe" class="size-4 text-muted shrink-0" />
                <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span class="text-xs truncate">{{ t.url }}</span>
                  <div class="flex items-center gap-2 text-[11px] text-muted">
                    <UBadge
                      :label="t.status === 2 ? '工作中' : t.status === 3 ? '更新中' : t.status === 4 ? '未工作' : t.status === 1 ? '未联系' : '已禁用'"
                      :color="t.status === 2 ? 'success' : t.status === 4 ? 'error' : t.status === 3 ? 'warning' : 'neutral'"
                      variant="subtle"
                      size="xs"
                    />
                    <span>种子: {{ t.num_seeds }}</span>
                    <span>下载者: {{ t.num_leeches }}</span>
                  </div>
                </div>
                <UButton
                  icon="i-lucide-trash"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                  @click="handleRemoveTracker(t.url)"
                />
              </div>
            </div>
            <div v-else-if="loading" class="flex items-center justify-center py-12">
              <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
            </div>
            <UEmpty v-else description="暂无 Tracker" />
          </template>

          <!-- 对等方 -->
          <template #peers>
            <!-- Peers 排序表头 -->
            <div v-if="sortedPeerList.length" class="flex items-center gap-1 mb-2 px-2 text-xs text-muted">
              <button class="hover:text-primary transition-colors" @click="togglePeerSort('ip')">IP:端口</button>
              <span>|</span>
              <button class="hover:text-primary transition-colors" @click="togglePeerSort('client')">客户端</button>
              <span>|</span>
              <button class="hover:text-primary transition-colors" @click="togglePeerSort('progress')">进度</button>
              <span>|</span>
              <button class="hover:text-primary transition-colors" @click="togglePeerSort('dl_speed')">↓速度</button>
              <span>|</span>
              <button class="hover:text-primary transition-colors" @click="togglePeerSort('up_speed')">↑速度</button>
              <span>|</span>
              <button class="hover:text-primary transition-colors" @click="togglePeerSort('country_code')">地区</button>
            </div>

            <div v-if="sortedPeerList.length" class="flex flex-col gap-0.5 max-h-[400px] overflow-y-auto">
              <div
                v-for="(p, i) in sortedPeerList"
                :key="i"
                class="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-elevated/50 text-xs"
              >
                <div class="flex items-center gap-1.5 min-w-0 w-[160px]">
                  <span v-if="p.country_code" class="text-base">{{ p.country_code }}</span>
                  <span class="font-mono truncate">{{ p.ip }}:{{ p.port }}</span>
                </div>
                <span class="flex-1 truncate text-muted">{{ p.client || '—' }}</span>
                <span class="w-10 text-right tabular-nums">{{ formatProgress(p.progress) }}%</span>
                <span class="w-16 text-right tabular-nums text-blue-500">{{ p.dl_speed > 0 ? formatSpeed(p.dl_speed) : '—' }}</span>
                <span class="w-16 text-right tabular-nums text-emerald-500">{{ p.up_speed > 0 ? formatSpeed(p.up_speed) : '—' }}</span>
              </div>
            </div>
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
