<script setup lang="ts">
import { h, computed, ref, type FunctionalComponent, type VNode } from 'vue'
import type { TableColumn } from '@nuxt/ui'
// UTable 已不再使用：改为 useVirtualizer 自定义渲染，但仍复用下方列定义
// 以下组件仅用于 h() 渲染，需显式导入
import UCheckbox from '@nuxt/ui/components/Checkbox.vue'
import UProgress from '@nuxt/ui/components/Progress.vue'
import UBadge from '@nuxt/ui/components/Badge.vue'
import UButton from '@nuxt/ui/components/Button.vue'
import UDropdownMenu from '@nuxt/ui/components/DropdownMenu.vue'
import UIcon from '@nuxt/ui/runtime/vue/components/Icon.vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { Torrent, TorrentSort } from '@/types/qbittorrent'
import { useTorrentListStore } from '@/stores/torrentList'
import { useSettingsStore } from '@/stores/settings'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import {
  pauseTorrents,
  resumeTorrents,
  forceStartTorrents,
  deleteTorrents,
} from '@/api/modules/torrents'
import { formatSize, formatSpeed, formatEta, formatRatio, formatProgress } from '@/utils/format'
import { getStateMeta } from '@/utils/state'

const props = defineProps<{ showDetail?: (hash: string) => void }>()

const emit = defineEmits<{
  contextmenu: [event: Event, torrent: Torrent]
  'add-tag': [hash: string]
}>()

const store = useTorrentListStore()
const settings = useSettingsStore()
const toast = useToast()
const confirmDialog = useConfirmDialog()

/** 列表密度对应的行高 */
const rowHeight = computed(() => {
  switch (settings.listDensity) {
    case 'compact': return 36
    case 'comfortable': return 56
    default: return 44
  }
})

// ===== 列配置（显示/隐藏） =====

const HIDDEN_COLUMNS_KEY = 'tide.table.hiddenColumns'

/** 可隐藏的列配置（select/name/progress/actions 不可隐藏） */
const hideableColumns: { id: string; label: string }[] = [
  { id: 'size', label: '大小' },
  { id: 'dlspeed', label: '下载速度' },
  { id: 'upspeed', label: '上传速度' },
  { id: 'eta', label: '剩余时间' },
  { id: 'state', label: '状态' },
  { id: 'ratio', label: '比率' },
  { id: 'tags', label: '标签' },
]

/** 被隐藏的列 ID 集合（从 localStorage 读取初始值） */
const hiddenColumns = ref<Set<string>>(
  new Set(
    (() => {
      try {
        const raw = localStorage.getItem(HIDDEN_COLUMNS_KEY)
        return raw ? (JSON.parse(raw) as string[]) : []
      } catch {
        return []
      }
    })(),
  ),
)

/** 切换列显示/隐藏并持久化 */
function toggleColumn(id: string) {
  const next = new Set(hiddenColumns.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  hiddenColumns.value = next
  localStorage.setItem(HIDDEN_COLUMNS_KEY, JSON.stringify([...next]))
}

/** 列配置下拉菜单项 */
const columnMenuItems = computed(() =>
  hideableColumns.map((c) => ({
    label: c.label,
    icon: hiddenColumns.value.has(c.id) ? 'i-lucide-square' : 'i-lucide-check-square',
    onSelect: () => toggleColumn(c.id),
  })),
)

// ===== 行内操作下拉菜单 =====

/** 暂停状态判断 */
function isPausedTorrent(t: Torrent): boolean {
  return ['pausedUP', 'pausedDL', 'stoppedUP', 'stoppedDL'].includes(t.state)
}

/** 构造操作菜单项 */
function buildActionItems(torrent: Torrent) {
  const paused = isPausedTorrent(torrent)
  return [
    { label: '查看详情', icon: 'i-lucide-info', onSelect: () => props.showDetail?.(torrent.hash) },
    { type: 'separator' as const },
    paused
      ? { label: '恢复', icon: 'i-lucide-play', onSelect: () => handleResume(torrent) }
      : { label: '暂停', icon: 'i-lucide-pause', onSelect: () => handlePause(torrent) },
    { label: '强制续传', icon: 'i-lucide-zap', onSelect: () => handleForceStart(torrent) },
    { type: 'separator' as const },
    { label: '复制 Hash', icon: 'i-lucide-copy', onSelect: () => handleCopyHash(torrent) },
    { label: '复制名称', icon: 'i-lucide-file-copy', onSelect: () => handleCopyName(torrent) },
    { label: '导出 .torrent', icon: 'i-lucide-download', onSelect: () => handleExport(torrent) },
    { type: 'separator' as const },
    { label: '添加标签', icon: 'i-lucide-tag', onSelect: () => emit('add-tag', torrent.hash) },
    { label: '重命名', icon: 'i-lucide-pencil', onSelect: () => openRenameModal(torrent) },
    { type: 'separator' as const },
    { label: '删除种子', icon: 'i-lucide-trash', color: 'error' as const, onSelect: () => handleDelete(torrent) },
  ]
}

async function handlePause(torrent: Torrent) {
  try {
    await pauseTorrents([torrent.hash])
    toast.add({ title: '已暂停', color: 'success' })
    await store.fetchTorrents()
  } catch {
    toast.add({ title: '操作失败', color: 'error' })
  }
}

async function handleResume(torrent: Torrent) {
  try {
    await resumeTorrents([torrent.hash])
    toast.add({ title: '已恢复', color: 'success' })
    await store.fetchTorrents()
  } catch {
    toast.add({ title: '操作失败', color: 'error' })
  }
}

async function handleForceStart(torrent: Torrent) {
  try {
    await forceStartTorrents([torrent.hash], true)
    toast.add({ title: '已强制续传', color: 'success' })
    await store.fetchTorrents()
  } catch {
    toast.add({ title: '操作失败', color: 'error' })
  }
}

async function handleCopyHash(torrent: Torrent) {
  try {
    await navigator.clipboard.writeText(torrent.hash)
    toast.add({ title: 'Hash 已复制', color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
}

async function handleCopyName(torrent: Torrent) {
  try {
    await navigator.clipboard.writeText(torrent.name)
    toast.add({ title: '名称已复制', color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
}

/** 导出 .torrent 文件 */
async function handleExport(torrent: Torrent) {
  try {
    const blob = await store.exportTorrentFile(torrent.hash)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${torrent.name}.torrent`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.add({ title: '导出成功', color: 'success' })
  } catch {
    toast.add({ title: '导出失败', color: 'error' })
  }
}

// ===== 重命名弹窗 =====
const renameModal = ref({ open: false, hash: '', name: '', saving: false })

function openRenameModal(torrent: Torrent) {
  renameModal.value = { open: true, hash: torrent.hash, name: torrent.name, saving: false }
}

async function handleRename() {
  if (!renameModal.value.hash || !renameModal.value.name.trim()) return
  renameModal.value.saving = true
  try {
    await store.renameTorrentAction(renameModal.value.hash, renameModal.value.name.trim())
    toast.add({ title: '重命名成功', color: 'success' })
    renameModal.value.open = false
  } catch {
    toast.add({ title: '重命名失败', color: 'error' })
  } finally {
    renameModal.value.saving = false
  }
}

async function handleDelete(torrent: Torrent) {
  const confirmed = await confirmDialog.confirm({
    title: '删除种子',
    description: `确认删除"${torrent.name}"？`,
    confirmText: '确认删除',
    variant: 'error',
  })
  if (!confirmed) return
  try {
    await deleteTorrents([torrent.hash], false)
    toast.add({ title: '已删除', color: 'success' })
    await store.fetchTorrents()
  } catch {
    toast.add({ title: '删除失败', color: 'error' })
  }
}

/** 进度条颜色映射到 Nuxt UI 语义色 */
function progressColor(progress: number): 'success' | 'primary' | 'warning' | 'error' {
  if (progress >= 1) return 'success'
  if (progress >= 0.5) return 'primary'
  if (progress >= 0.1) return 'warning'
  return 'error'
}

/**
 * 由于改用自定义渲染（脱离 UTable），这里构造轻量的 row / table 上下文，
 * 让现有列定义中的 cell / header 函数可以无改动地复用：
 * - 选择状态由 store.selectedHashes 管理
 * - 排序由 store.sort / store.reverse 管理（manualSorting）
 */
interface FakeRowCtx {
  original: Torrent
  getIsSelected: () => boolean
  toggleSelected: (v: boolean) => void
}
interface FakeTableCtx {
  getIsAllRowsSelected: () => boolean
  getIsSomeRowsSelected: () => boolean
  toggleAllRowsSelected: (v: boolean) => void
}

function makeRowContext(torrent: Torrent): FakeRowCtx {
  return {
    original: torrent,
    getIsSelected: () => store.selectedHashes.has(torrent.hash),
    toggleSelected: (v: boolean) => store.toggleSelect(torrent.hash, v),
  }
}

function makeTableContext(): FakeTableCtx {
  const allSelected = () => {
    const list = store.sortedTorrents
    return list.length > 0 && list.every((t) => store.selectedHashes.has(t.hash))
  }
  return {
    getIsAllRowsSelected: allSelected,
    getIsSomeRowsSelected: () => {
      const list = store.sortedTorrents
      return !allSelected() && list.some((t) => store.selectedHashes.has(t.hash))
    },
    toggleAllRowsSelected: (v: boolean) => store.selectAll(v),
  }
}

/** 调用列定义中的 cell 函数，返回 VNode / 字符串 */
function renderCell(col: TableColumn<Torrent>, torrent: Torrent): VNode | string | null {
  if (typeof col.cell !== 'function') return null
  const result = (col.cell as (ctx: { row: FakeRowCtx }) => VNode | string)({
    row: makeRowContext(torrent),
  })
  return result ?? null
}

/** 调用列定义中的 header 函数（仅 select 列为函数），返回 VNode / 字符串 */
function renderHeader(col: TableColumn<Torrent>): VNode | string | null {
  if (typeof col.header !== 'function') return null
  const result = (col.header as (ctx: { table: FakeTableCtx }) => VNode | string)({
    table: makeTableContext(),
  })
  return result ?? null
}

/** 列标识：优先 id，其次 accessorKey（TableColumn 是联合类型，需断言访问） */
function colId(col: TableColumn<Torrent>): string | undefined {
  const c = col as { id?: string; accessorKey?: string }
  return c.id ?? c.accessorKey
}

/** 列唯一标识 */
function colKey(col: TableColumn<Torrent>): string {
  return colId(col) ?? ''
}

/** 列是否可排序（与 TanStack 默认一致：未显式禁用即可排序） */
function canSort(col: TableColumn<Torrent>): boolean {
  return col.enableSorting !== false
}

/** 列当前是否处于排序状态 */
function isSorted(col: TableColumn<Torrent>): boolean {
  if (!canSort(col)) return false
  const field = colId(col)
  return !!field && store.sort === field
}

/** 表头点击切换排序 */
function toggleSort(col: TableColumn<Torrent>): void {
  if (!canSort(col)) return
  const field = colId(col) as TorrentSort
  if (!field) return
  store.setSort(field)
}

/** 单元格宽度样式：name 列自动伸缩填充剩余空间，其余固定宽度 */
function cellStyle(col: TableColumn<Torrent>): Record<string, string> {
  // 没有 size 的列（如 name）自动 flex grow，并允许内部 truncate
  if (col.size == null) {
    const min = col.minSize ?? 120
    return { flex: `1 1 ${min}px`, minWidth: `${min}px` }
  }
  return { flex: `0 0 ${col.size}px`, width: `${col.size}px` }
}

/** 行点击打开详情（排除 checkbox 和操作列区域） */
function onRowSelect(e: Event, torrent: Torrent | undefined): void {
  if (!torrent) return
  const target = e.target as HTMLElement
  if (target.closest('[role="checkbox"]')) return
  if (target.closest('.actions-cell')) return
  props.showDetail?.(torrent.hash)
}

/** 行右键 -> 触发 contextmenu 事件（供父组件弹出菜单） */
function onContextMenu(e: Event, torrent: Torrent | undefined): void {
  if (!torrent) return
  emit('contextmenu', e, torrent)
}

/** 列定义（TanStack ColumnDef 格式，原样保留） */
const columns: TableColumn<Torrent>[] = [
  // 选择列（checkbox）
  {
    id: 'select',
    header: ({ table }) => {
      const all = table.getIsAllRowsSelected()
      const some = table.getIsSomeRowsSelected()
      return h(UCheckbox, {
        modelValue: all ? true : some ? ('indeterminate' as const) : false,
        'onUpdate:modelValue': (v: unknown) => {
          if (v !== 'indeterminate') table.toggleAllRowsSelected(!!v)
        },
      })
    },
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (v: unknown) => {
          if (v !== 'indeterminate') row.toggleSelected(!!v)
        },
      }),
    enableSorting: false,
    size: 45,
  },
  // 名称
  {
    accessorKey: 'name',
    header: '名称',
    cell: ({ row }) => h('div', { class: 'truncate' }, row.original.name),
    minSize: 200,
  },
  // 大小
  {
    accessorKey: 'size',
    header: '大小',
    cell: ({ row }) => formatSize(row.original.size),
    size: 100,
  },
  // 进度
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
          color: progressColor(row.original.progress),
          class: 'flex-1 min-w-[60px]',
        }),
        h('span', { class: 'text-xs tabular-nums text-right min-w-[36px]' }, `${p}%`),
      ])
    },
    size: 160,
  },
  // 下载速度
  {
    accessorKey: 'dlspeed',
    header: '下载速度',
    cell: ({ row }) =>
      row.original.dlspeed > 0
        ? h('span', { class: 'text-blue-500 tabular-nums' }, formatSpeed(row.original.dlspeed))
        : h('span', { class: 'text-muted tabular-nums' }, '—'),
    size: 110,
  },
  // 上传速度
  {
    accessorKey: 'upspeed',
    header: '上传速度',
    cell: ({ row }) =>
      row.original.upspeed > 0
        ? h('span', { class: 'text-green-500 tabular-nums' }, formatSpeed(row.original.upspeed))
        : h('span', { class: 'text-muted tabular-nums' }, '—'),
    size: 110,
  },
  // 剩余时间
  {
    accessorKey: 'eta',
    header: '剩余',
    cell: ({ row }) =>
      row.original.eta > 0 && row.original.eta !== 8640000 ? formatEta(row.original.eta) : '∞',
    size: 90,
  },
  // 状态
  {
    accessorKey: 'state',
    header: '状态',
    cell: ({ row }) => {
      const meta = getStateMeta(row.original.state)
      return h('div', { class: 'flex items-center gap-1.5' }, [
        h(UIcon, {
          name: meta.icon,
          class: 'size-4 shrink-0',
          style: { color: meta.color },
        }),
        h(
          'span',
          { class: 'text-xs font-medium whitespace-nowrap', style: { color: meta.color } },
          meta.label,
        ),
      ])
    },
    size: 110,
  },
  // 比率
  {
    accessorKey: 'ratio',
    header: '比率',
    cell: ({ row }) => formatRatio(row.original.ratio),
    size: 80,
  },
  // 标签
  {
    accessorKey: 'tags',
    header: '标签',
    cell: ({ row }) => {
      if (!row.original.tags) return h('span', { class: 'text-muted' }, '—')
      const tags = row.original.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      if (!tags.length) return h('span', { class: 'text-muted' }, '—')
      return h('div', { class: 'flex items-center gap-1 flex-wrap' }, [
        ...tags.slice(0, 2).map((t) =>
          h(UBadge, {
            label: t,
            color: 'primary',
            variant: 'subtle',
            size: 'sm',
          }),
        ),
        tags.length > 2
          ? h('span', { class: 'text-xs text-muted' }, `+${tags.length - 2}`)
          : null,
      ])
    },
    size: 120,
  },
  // 操作列（下拉菜单）
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      h(
        UDropdownMenu,
        { items: buildActionItems(row.original), mode: 'click' },
        {
          default: () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              color: 'neutral',
              variant: 'ghost',
              size: 'xs',
              'aria-label': '操作',
            }),
        },
      ),
    enableSorting: false,
    size: 50,
  },
]

/** 过滤掉被隐藏的列后的列表（select/name/progress/actions 始终显示） */
const visibleColumns = computed(() =>
  columns.filter((col) => {
    const id = colKey(col)
    // select 和 actions 列始终显示
    if (id === 'select' || id === 'actions') return true
    return !hiddenColumns.value.has(id ?? '')
  }),
)

/**
 * VNodeRenderer：用于在模板中渲染由 cell / header 函数返回的 VNode 或字符串。
 * <component :is> 无法直接消费 VNode，故用此轻量函数式组件包装。
 */
const VNodeRenderer: FunctionalComponent<{ node: VNode | string | null }> = (props) => props.node

/** 滚动容器 ref */
const scrollContainer = ref<HTMLElement | null>(null)

/** 虚拟滚动：仅渲染可视区域 + overscan 行，支持 1000+ 流畅 */
const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: store.sortedTorrents.length,
    getScrollElement: () => scrollContainer.value,
    estimateSize: () => rowHeight.value, // 行高由列表密度控制
    overscan: 8, // 预渲染额外行数
  })),
)

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
const totalHeight = computed(() => rowVirtualizer.value.getTotalSize())

/** 将虚拟行与对应种子数据关联，便于模板渲染 */
const virtualItems = computed(() => {
  const list = store.sortedTorrents
  return virtualRows.value.map((vr) => ({
    vr,
    torrent: list[vr.index] as Torrent,
  }))
})
</script>

<template>
  <div ref="scrollContainer" class="torrent-table-wrap h-full overflow-auto relative">
    <!-- 列配置按钮（浮动在右上角） -->
    <UDropdownMenu
      :items="columnMenuItems"
      mode="click"
      :ui="{ content: 'min-w-[160px]' }"
    >
      <UButton
        icon="i-lucide-settings-2"
        color="neutral"
        variant="ghost"
        size="xs"
        class="absolute right-1 top-1 z-30 opacity-60 hover:opacity-100"
        aria-label="列配置"
        title="列配置"
      />
    </UDropdownMenu>

    <table class="w-full">
      <thead class="sticky top-0 z-10 bg-default">
        <tr class="flex border-b border-default">
          <th
            v-for="col in visibleColumns"
            :key="colKey(col)"
            :style="cellStyle(col)"
            class="px-3 py-2 text-xs font-medium text-muted text-left select-none overflow-hidden"
            :class="canSort(col) ? 'cursor-pointer hover:text-default' : ''"
            @click="toggleSort(col)"
          >
            <div class="flex items-center gap-1 min-w-0">
              <VNodeRenderer v-if="typeof col.header === 'function'" :node="renderHeader(col)" />
              <span v-else class="truncate">{{ col.header }}</span>
              <UIcon
                v-if="isSorted(col)"
                :name="store.reverse ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up'"
                class="size-3 opacity-70 shrink-0"
              />
            </div>
          </th>
        </tr>
      </thead>
      <tbody :style="{ display: 'grid', position: 'relative', height: totalHeight + 'px', width: '100%' }">
        <tr
          v-for="item in virtualItems"
          :key="item.vr.index"
          :style="{
            display: 'flex',
            position: 'absolute',
            top: '0',
            transform: `translateY(${item.vr.start}px)`,
            width: '100%',
            height: item.vr.size + 'px',
          }"
          class="border-b border-default hover:bg-primary/5 cursor-pointer"
          @click="onRowSelect($event, item.torrent)"
          @contextmenu.prevent="onContextMenu($event, item.torrent)"
        >
          <td
            v-for="col in visibleColumns"
            :key="colKey(col)"
            :style="cellStyle(col)"
            class="px-3 py-2 text-sm flex items-center overflow-hidden"
            :class="colKey(col) === 'actions' ? 'actions-cell justify-center' : ''"
          >
            <div class="min-w-0 flex-1 overflow-hidden" :class="colKey(col) === 'actions' ? 'flex justify-center' : ''">
              <VNodeRenderer :node="renderCell(col, item.torrent)" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 加载中遮罩 -->
    <div
      v-if="store.loading"
      class="absolute inset-0 flex items-center justify-center bg-default/40 z-20 pointer-events-none"
    >
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 text-primary" />
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="store.sortedTorrents.length === 0"
      class="absolute inset-0 flex items-center justify-center text-muted text-sm pointer-events-none"
    >
      暂无种子
    </div>

    <!-- 删除确认弹窗 -->
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

    <!-- 重命名弹窗 -->
    <UModal v-model:open="renameModal.open" title="重命名种子">
      <template #body>
        <UInput
          v-model="renameModal.name"
          placeholder="输入新名称"
          class="w-full"
          @keyup.enter="handleRename"
        />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="() => { renameModal.open = false }">取消</UButton>
          <UButton color="primary" :loading="renameModal.saving" @click="handleRename">确认</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.torrent-table-wrap {
  height: 100%;
}
</style>
