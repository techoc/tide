<script setup lang="ts">
import { computed } from 'vue'
import type { Torrent } from '@/types/qbittorrent'
import { useTorrentListStore } from '@/stores/torrentList'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import {
  pauseTorrents,
  resumeTorrents,
  forceStartTorrents,
  deleteTorrents,
} from '@/api/modules/torrents'

const props = defineProps<{
  torrent: Torrent | null  // 当前右键的种子，null 时不显示
  x: number               // 菜单 x 坐标
  y: number               // 菜单 y 坐标
}>()

const emit = defineEmits<{
  'close': []
  'show-detail': [hash: string]
  'add-tag': [hash: string]
}>()

const store = useTorrentListStore()
const toast = useToast()
const confirmDialog = useConfirmDialog()

/** 暂停状态：pausedUP/pausedDL/stoppedUP/stoppedDL 视为已暂停 */
const isPaused = computed(() => {
  if (!props.torrent) return false
  return ['pausedUP', 'pausedDL', 'stoppedUP', 'stoppedDL'].includes(props.torrent.state)
})

/** 边界处理，确保菜单不超出视口右侧 */
const adjustedX = computed(() => Math.min(props.x, window.innerWidth - 200))
/** 边界处理，确保菜单不超出视口底部 */
const adjustedY = computed(() => Math.min(props.y, window.innerHeight - 320))

/** 查看详情 */
function handleShowDetail() {
  if (!props.torrent) return
  emit('show-detail', props.torrent.hash)
  emit('close')
}

/** 暂停 */
async function handlePause() {
  if (!props.torrent) return
  try {
    await pauseTorrents([props.torrent.hash])
    toast.add({ title: '已暂停', color: 'success' })
    await store.fetchTorrents()
  } catch {
    toast.add({ title: '操作失败', color: 'error' })
  }
  emit('close')
}

/** 恢复 */
async function handleResume() {
  if (!props.torrent) return
  try {
    await resumeTorrents([props.torrent.hash])
    toast.add({ title: '已恢复', color: 'success' })
    await store.fetchTorrents()
  } catch {
    toast.add({ title: '操作失败', color: 'error' })
  }
  emit('close')
}

/** 强制续传 */
async function handleForceStart() {
  if (!props.torrent) return
  try {
    await forceStartTorrents([props.torrent.hash], true)
    toast.add({ title: '已强制续传', color: 'success' })
    await store.fetchTorrents()
  } catch {
    toast.add({ title: '操作失败', color: 'error' })
  }
  emit('close')
}

/** 复制 Hash */
async function handleCopyHash() {
  if (!props.torrent) return
  try {
    await navigator.clipboard.writeText(props.torrent.hash)
    toast.add({ title: 'Hash 已复制', color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
  emit('close')
}

/** 复制名称 */
async function handleCopyName() {
  if (!props.torrent) return
  try {
    await navigator.clipboard.writeText(props.torrent.name)
    toast.add({ title: '名称已复制', color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
  emit('close')
}

/** 添加标签 */
function handleAddTag() {
  if (!props.torrent) return
  emit('add-tag', props.torrent.hash)
  emit('close')
}

/** 删除种子（需确认） */
async function handleDelete() {
  if (!props.torrent) return
  const confirmed = await confirmDialog.confirm({
    title: '删除种子',
    description: `确认删除"${props.torrent.name}"？`,
    confirmText: '确认删除',
    variant: 'error',
  })
  if (!confirmed) return
  try {
    await deleteTorrents([props.torrent.hash], false)
    toast.add({ title: '已删除', color: 'success' })
    await store.fetchTorrents()
  } catch {
    toast.add({ title: '删除失败', color: 'error' })
  }
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <!-- 透明遮罩：捕获点击/右键以关闭菜单 -->
    <div
      v-if="torrent"
      class="fixed inset-0 z-50"
      @click="$emit('close')"
      @contextmenu.prevent="$emit('close')"
    >
      <!-- 菜单主体 -->
      <div
        class="fixed min-w-[180px] bg-default border border-default rounded-md shadow-lg py-1 z-50"
        :style="{ left: adjustedX + 'px', top: adjustedY + 'px' }"
        @click.stop
      >
        <!-- 查看详情 -->
        <button
          class="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left cursor-pointer hover:bg-elevated transition-colors"
          @click="handleShowDetail"
        >
          <UIcon name="i-lucide-info" class="size-4 shrink-0" />
          <span>查看详情</span>
        </button>

        <!-- 分隔线 -->
        <div class="h-px bg-default my-1" />

        <!-- 暂停/恢复（根据状态动态显示） -->
        <button
          v-if="isPaused"
          class="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left cursor-pointer hover:bg-elevated transition-colors"
          @click="handleResume"
        >
          <UIcon name="i-lucide-play" class="size-4 shrink-0" />
          <span>恢复</span>
        </button>
        <button
          v-else
          class="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left cursor-pointer hover:bg-elevated transition-colors"
          @click="handlePause"
        >
          <UIcon name="i-lucide-pause" class="size-4 shrink-0" />
          <span>暂停</span>
        </button>

        <!-- 强制续传 -->
        <button
          class="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left cursor-pointer hover:bg-elevated transition-colors"
          @click="handleForceStart"
        >
          <UIcon name="i-lucide-zap" class="size-4 shrink-0" />
          <span>强制续传</span>
        </button>

        <!-- 分隔线 -->
        <div class="h-px bg-default my-1" />

        <!-- 复制 Hash -->
        <button
          class="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left cursor-pointer hover:bg-elevated transition-colors"
          @click="handleCopyHash"
        >
          <UIcon name="i-lucide-copy" class="size-4 shrink-0" />
          <span>复制 Hash</span>
        </button>

        <!-- 复制名称 -->
        <button
          class="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left cursor-pointer hover:bg-elevated transition-colors"
          @click="handleCopyName"
        >
          <UIcon name="i-lucide-file-copy" class="size-4 shrink-0" />
          <span>复制名称</span>
        </button>

        <!-- 分隔线 -->
        <div class="h-px bg-default my-1" />

        <!-- 添加标签 -->
        <button
          class="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left cursor-pointer hover:bg-elevated transition-colors"
          @click="handleAddTag"
        >
          <UIcon name="i-lucide-tag" class="size-4 shrink-0" />
          <span>添加标签</span>
        </button>

        <!-- 删除种子（红色） -->
        <button
          class="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left cursor-pointer text-error hover:bg-elevated transition-colors"
          @click="handleDelete"
        >
          <UIcon name="i-lucide-trash" class="size-4 shrink-0" />
          <span>删除种子</span>
        </button>
      </div>
    </div>
  </Teleport>

  <!-- 确认弹窗（删除种子用） -->
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
</template>
