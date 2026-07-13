<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTorrentListStore } from '@/stores/torrentList'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import TagSelectorModal from './TagSelectorModal.vue'
import {
  decreaseTorrentPriority,
  increaseTorrentPriority,
  reannounceTorrents,
  recheckTorrents,
  setAutomaticTorrentManagement,
  setSuperSeeding,
  setTorrentBottomPriority,
  setTorrentTopPriority,
} from '@/api/modules/torrents'

const store = useTorrentListStore()
const toast = useToast()
const confirmDialog = useConfirmDialog()

const showTagModal = ref(false)
const tagMode = ref<'add' | 'remove'>('add')

// 分类选择弹窗
const showCategoryModal = ref(false)
const categorySelect = ref('')
const categorySaving = ref(false)

const hasSelection = computed(() => store.selectedCount > 0)

/** 当前选中种子的 hash 数组 */
const selectedHashesArray = computed(() => store.selectedArray())

/** 分类下拉选项 */
const categoryItems = computed(() => [
  { label: '不指定分类', value: '' },
  ...store.categories.map((c) => ({ label: c.name, value: c.name })),
])

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
  const count = store.selectedCount
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
    toast.add({ title: `已删除 ${count} 个种子`, color: 'success' })
  } catch {
    toast.add({ title: '删除失败', color: 'error' })
  }
}

async function runAdvanced(title: string, action: (hashes: string[]) => Promise<void>) {
  const hashes = selectedHashesArray.value
  if (!hashes.length) return
  try {
    await action(hashes)
    await store.fetchTorrents()
    toast.add({ title, color: 'success' })
  } catch {
    toast.add({ title: '批量操作失败', color: 'error' })
  }
}

const advancedItems = computed(() => [
  { label: '重新校验', icon: 'i-lucide-shield-check', onSelect: () => runAdvanced('已开始重新校验', recheckTorrents) },
  { label: '重新汇报 Tracker', icon: 'i-lucide-radio', onSelect: () => runAdvanced('已重新汇报 Tracker', reannounceTorrents) },
  { type: 'separator' as const },
  { label: '队列置顶', icon: 'i-lucide-chevrons-up', onSelect: () => runAdvanced('已移至队列顶部', setTorrentTopPriority) },
  { label: '提高优先级', icon: 'i-lucide-chevron-up', onSelect: () => runAdvanced('已提高队列优先级', increaseTorrentPriority) },
  { label: '降低优先级', icon: 'i-lucide-chevron-down', onSelect: () => runAdvanced('已降低队列优先级', decreaseTorrentPriority) },
  { label: '队列置底', icon: 'i-lucide-chevrons-down', onSelect: () => runAdvanced('已移至队列底部', setTorrentBottomPriority) },
  { type: 'separator' as const },
  { label: '启用自动管理', icon: 'i-lucide-wand-sparkles', onSelect: () => runAdvanced('已启用自动管理', (hashes) => setAutomaticTorrentManagement(hashes, true)) },
  { label: '关闭自动管理', icon: 'i-lucide-folder-cog', onSelect: () => runAdvanced('已关闭自动管理', (hashes) => setAutomaticTorrentManagement(hashes, false)) },
  { label: '启用超级做种', icon: 'i-lucide-upload-cloud', onSelect: () => runAdvanced('已启用超级做种', (hashes) => setSuperSeeding(hashes, true)) },
])

function openTagModal(mode: 'add' | 'remove') {
  tagMode.value = mode
  showTagModal.value = true
}

function openCategoryModal() {
  categorySelect.value = ''
  showCategoryModal.value = true
}

async function handleSetCategory() {
  categorySaving.value = true
  try {
    await store.setTorrentCategory(categorySelect.value)
    toast.add({ title: `已移动 ${store.selectedCount} 个种子到分类`, color: 'success' })
    showCategoryModal.value = false
  } catch {
    toast.add({ title: '移动分类失败', color: 'error' })
  } finally {
    categorySaving.value = false
  }
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
          icon="i-lucide-folder-input"
          label="移动分类"
          @click="openCategoryModal"
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
        <UDropdownMenu :items="advancedItems" :content="{ align: 'end' }">
          <UButton
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-ellipsis"
            label="更多操作"
            trailing-icon="i-lucide-chevron-down"
          />
        </UDropdownMenu>
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

  <!-- 分类选择弹窗 -->
  <UModal v-model:open="showCategoryModal" title="移动到分类">
    <template #body>
      <div class="flex flex-col gap-3">
        <p class="text-sm text-muted">将选中的 {{ store.selectedCount }} 个种子移动到指定分类：</p>
        <USelect
          v-model="categorySelect"
          :items="categoryItems"
          placeholder="选择分类"
          class="w-full"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="() => { showCategoryModal = false }">取消</UButton>
        <UButton
          color="primary"
          :loading="categorySaving"
          @click="handleSetCategory"
        >
          确认移动
        </UButton>
      </div>
    </template>
  </UModal>

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
