<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTorrentListStore } from '@/stores/torrentList'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import TagSelectorModal from './TagSelectorModal.vue'

const store = useTorrentListStore()
const toast = useToast()
const confirmDialog = useConfirmDialog()

const showTagModal = ref(false)
const tagMode = ref<'add' | 'remove'>('add')

const hasSelection = computed(() => store.selectedCount > 0)

/** 当前选中种子的 hash 数组 */
const selectedHashesArray = computed(() => store.selectedArray())

async function handlePause() {
  try {
    await store.pauseSelected()
    toast.add({ title: `已暂停 ${store.selectedCount} 个种子`, color: 'success' })
  } catch {
    toast.add({ title: '暂停失败', color: 'error' })
  }
}

async function handleResume() {
  try {
    await store.resumeSelected()
    toast.add({ title: `已恢复 ${store.selectedCount} 个种子`, color: 'success' })
  } catch {
    toast.add({ title: '恢复失败', color: 'error' })
  }
}

async function handleForceStart() {
  try {
    await store.forceStartSelected(true)
    toast.add({ title: `已强制续传 ${store.selectedCount} 个种子`, color: 'success' })
  } catch {
    toast.add({ title: '操作失败', color: 'error' })
  }
}

async function handleDelete(deleteFilesFlag: boolean) {
  const confirmed = await confirmDialog.confirm({
    title: deleteFilesFlag ? '删除种子及文件' : '删除种子',
    description: deleteFilesFlag
      ? `确认删除选中的种子并删除下载文件？此操作不可撤销！`
      : `确认删除选中的 ${store.selectedCount} 个种子？（不删除文件）`,
    confirmText: '确认删除',
    variant: 'error',
  })
  if (!confirmed) return
  try {
    await store.deleteSelected(deleteFilesFlag)
    toast.add({ title: `已删除 ${store.selectedCount} 个种子`, color: 'success' })
  } catch {
    toast.add({ title: '删除失败', color: 'error' })
  }
}

function openTagModal(mode: 'add' | 'remove') {
  tagMode.value = mode
  showTagModal.value = true
}
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="hasSelection"
      class="flex flex-col gap-2 items-stretch md:flex-row md:items-center md:justify-between px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg mb-3 backdrop-blur"
    >
      <div class="flex items-center gap-3">
        <span class="text-sm font-semibold text-primary">已选中 {{ store.selectedCount }} 项</span>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-x"
          label="清除"
          @click="store.selectAll(false)"
        />
      </div>
      <div class="flex gap-1 flex-wrap">
        <UButton
          color="primary"
          variant="soft"
          size="sm"
          icon="i-lucide-play"
          label="恢复"
          @click="handleResume"
        />
        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-lucide-pause"
          label="暂停"
          @click="handlePause"
        />
        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-lucide-zap"
          label="强制续传"
          @click="handleForceStart"
        />
        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-lucide-tag"
          label="加标签"
          @click="openTagModal('add')"
        />
        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-lucide-tag"
          label="移除标签"
          @click="openTagModal('remove')"
        />
        <UButton
          color="error"
          variant="soft"
          size="sm"
          icon="i-lucide-trash"
          label="删除种子"
          @click="handleDelete(false)"
        />
        <UButton
          color="error"
          variant="solid"
          size="sm"
          icon="i-lucide-trash"
          label="删除种子及文件"
          @click="handleDelete(true)"
        />
      </div>
    </div>
  </Transition>

  <!-- 标签选择弹窗 -->
  <TagSelectorModal
    v-model:open="showTagModal"
    :mode="tagMode"
    :hashes="selectedHashesArray"
    :target-label="`选中的 ${store.selectedCount} 项`"
  />

  <!-- 确认弹窗 -->
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

<style scoped>
/* 过渡动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
