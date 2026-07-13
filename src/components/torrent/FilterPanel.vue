<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTorrentListStore } from '@/stores/torrentList'

const store = useTorrentListStore()
const toast = useToast()

const expanded = ref(false)

/** 搜索字段选项 */
const searchFieldItems = computed(() => [
  { label: '名称', key: 'name' as const, model: store.searchFields.name },
  { label: 'Hash', key: 'hash' as const, model: store.searchFields.hash },
  { label: '路径', key: 'savePath' as const, model: store.searchFields.savePath },
  { label: 'Tracker', key: 'tracker' as const, model: store.searchFields.tracker },
])

/** 是否有活跃的筛选条件 */
const hasActiveFilters = computed(() => {
  return (
    store.sizeMin > 0 ||
    store.sizeMax > 0 ||
    store.progressMin > 0 ||
    store.progressMax > 0 ||
    !store.searchFields.name ||
    store.searchFields.hash ||
    store.searchFields.savePath ||
    store.searchFields.tracker
  )
})

/** 大小单位 (MiB) 转换辅助 */
const sizeMinMiB = computed({
  get: () => (store.sizeMin > 0 ? Math.round(store.sizeMin / 1048576) : 0),
  set: (v: number) => {
    store.sizeMin = v > 0 ? v * 1048576 : 0
  },
})
const sizeMaxMiB = computed({
  get: () => (store.sizeMax > 0 ? Math.round(store.sizeMax / 1048576) : 0),
  set: (v: number) => {
    store.sizeMax = v > 0 ? v * 1048576 : 0
  },
})

/** 切换搜索字段 */
function toggleSearchField(key: 'name' | 'hash' | 'savePath' | 'tracker') {
  store.searchFields = { ...store.searchFields, [key]: !store.searchFields[key] }
}

/** 保存当前筛选 */
const showSaveModal = ref(false)
const filterName = ref('')

function openSaveModal() {
  filterName.value = ''
  showSaveModal.value = true
}

function handleSaveFilter() {
  if (!filterName.value.trim()) {
    toast.add({ title: '请输入筛选名称', color: 'warning' })
    return
  }
  store.saveCurrentFilter(filterName.value.trim())
  toast.add({ title: '筛选已保存', color: 'success' })
  showSaveModal.value = false
}

/** 应用已保存的筛选 */
function handleApplyFilter(id: string) {
  store.applySavedFilter(id)
  toast.add({ title: '筛选已应用', color: 'success' })
}

/** 删除已保存的筛选 */
function handleDeleteFilter(id: string) {
  store.deleteSavedFilter(id)
  toast.add({ title: '筛选已删除', color: 'success' })
}

/** 清除所有筛选 */
function handleClearAll() {
  store.clearAllFilters()
  toast.add({ title: '筛选已清除', color: 'success' })
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-xl border border-default bg-default px-2.5 py-2 shadow-sm sm:px-3">
    <!-- 搜索字段切换 + 展开按钮 -->
    <div class="flex items-center gap-1.5 overflow-x-auto sm:flex-wrap">
      <!-- 搜索字段下拉 -->
      <UDropdownMenu :items="searchFieldItems.map((f) => ({
        label: f.label,
        icon: f.model ? 'i-lucide-check-square' : 'i-lucide-square',
        onSelect: () => toggleSearchField(f.key),
      }))">
        <UButton
          icon="i-lucide-search"
          color="neutral"
          variant="soft"
          size="xs"
          label="搜索字段"
          trailing-icon="i-lucide-chevron-down"
        />
      </UDropdownMenu>

      <!-- 大小/进度筛选展开 -->
      <UButton
        :icon="expanded ? 'i-lucide-chevron-up' : 'i-lucide-sliders-horizontal'"
        color="neutral"
        variant="ghost"
        size="xs"
        :label="expanded ? '收起筛选' : '高级筛选'"
        @click="() => { expanded = !expanded }"
      />

      <!-- 保存当前筛选 -->
      <UButton
        icon="i-lucide-bookmark-plus"
        color="neutral"
        variant="ghost"
        size="xs"
        label="保存筛选"
        @click="openSaveModal"
      />

      <!-- 已保存的筛选列表 -->
      <UDropdownMenu
        v-if="store.savedFilters.length"
        :items="store.savedFilters.map((f) => ({
          label: f.name,
          icon: 'i-lucide-bookmark',
          onSelect: () => handleApplyFilter(f.id),
        }))"
      >
        <UButton
          icon="i-lucide-bookmark"
          color="neutral"
          variant="ghost"
          size="xs"
          label="已保存"
          trailing-icon="i-lucide-chevron-down"
        />
      </UDropdownMenu>

      <!-- 清除全部 -->
      <UButton
        v-if="hasActiveFilters"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="xs"
        label="清除"
        @click="handleClearAll"
      />
    </div>

    <!-- 高级筛选面板 -->
    <div
      v-if="expanded"
      class="flex flex-col gap-3 rounded-xl border border-default bg-elevated/50 p-3"
    >
      <!-- 大小区间 -->
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-muted whitespace-nowrap w-16">大小</span>
        <UInputNumber
          v-model="sizeMinMiB"
          :min="0"
          size="xs"
          placeholder="最小"
          class="w-28"
        />
        <span class="text-xs text-muted">~</span>
        <UInputNumber
          v-model="sizeMaxMiB"
          :min="0"
          size="xs"
          placeholder="最大"
          class="w-28"
        />
        <span class="text-xs text-muted">MiB</span>
      </div>

      <!-- 进度区间 -->
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-muted whitespace-nowrap w-16">进度</span>
        <UInputNumber
          v-model="store.progressMin"
          :min="0"
          :max="100"
          size="xs"
          placeholder="最小"
          class="w-28"
        />
        <span class="text-xs text-muted">~</span>
        <UInputNumber
          v-model="store.progressMax"
          :min="0"
          :max="100"
          size="xs"
          placeholder="最大"
          class="w-28"
        />
        <span class="text-xs text-muted">%</span>
      </div>

      <!-- 已保存的筛选列表（展开模式下显示） -->
      <div v-if="store.savedFilters.length" class="flex flex-col gap-1.5">
        <span class="text-xs text-muted">已保存的筛选</span>
        <div class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="f in store.savedFilters"
            :key="f.id"
            :label="f.name"
            color="primary"
            variant="subtle"
            size="sm"
            class="cursor-pointer"
            @click="handleApplyFilter(f.id)"
          >
            <template #default>
              <span class="flex items-center gap-1">
                {{ f.name }}
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  color="neutral"
                  variant="link"
                  @click.stop="handleDeleteFilter(f.id)"
                />
              </span>
            </template>
          </UBadge>
        </div>
      </div>
    </div>

    <!-- 保存筛选弹窗 -->
    <UModal v-model:open="showSaveModal" title="保存当前筛选">
      <template #body>
        <div class="flex flex-col gap-3">
          <p class="text-sm text-muted">为当前筛选条件命名以便快速调用：</p>
          <UInput
            v-model="filterName"
            placeholder="例如：大于 1GiB 的下载中种子"
            class="w-full"
            @keyup.enter="handleSaveFilter"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="() => { showSaveModal = false }">取消</UButton>
          <UButton color="primary" @click="handleSaveFilter">保存</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
