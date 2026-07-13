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

const enabledSearchFields = computed(() => searchFieldItems.value.filter((field) => field.model))
const searchFieldLabel = computed(() => {
  const labels = enabledSearchFields.value.map((field) => field.label)
  return labels.length === 4 ? '全部字段' : labels.length ? labels.join('、') : '默认名称'
})

const advancedFilterCount = computed(() => [
  store.sizeMin > 0 || store.sizeMax > 0,
  store.progressMin > 0 || store.progressMax > 0,
].filter(Boolean).length)

const activeFilterChips = computed(() => {
  const chips: Array<{ key: 'size' | 'progress' | 'fields'; label: string }> = []
  if (store.sizeMin > 0 || store.sizeMax > 0) {
    const min = store.sizeMin > 0 ? `${Math.round(store.sizeMin / 1048576)} MiB` : '不限'
    const max = store.sizeMax > 0 ? `${Math.round(store.sizeMax / 1048576)} MiB` : '不限'
    chips.push({ key: 'size', label: `大小 ${min} – ${max}` })
  }
  if (store.progressMin > 0 || store.progressMax > 0) {
    const min = store.progressMin > 0 ? `${store.progressMin}%` : '0%'
    const max = store.progressMax > 0 ? `${store.progressMax}%` : '100%'
    chips.push({ key: 'progress', label: `进度 ${min} – ${max}` })
  }
  if (!store.searchFields.name || store.searchFields.hash || store.searchFields.savePath || store.searchFields.tracker) {
    chips.push({ key: 'fields', label: `搜索范围：${searchFieldLabel.value}` })
  }
  return chips
})

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

function clearSizeFilter() {
  store.sizeMin = 0
  store.sizeMax = 0
}

function clearProgressFilter() {
  store.progressMin = 0
  store.progressMax = 0
}

function resetSearchFields() {
  store.searchFields = { name: true, hash: false, savePath: false, tracker: false }
}

function clearFilterChip(key: 'size' | 'progress' | 'fields') {
  if (key === 'size') clearSizeFilter()
  else if (key === 'progress') clearProgressFilter()
  else resetSearchFields()
}

function setSizePreset(minMiB: number, maxMiB = 0) {
  sizeMinMiB.value = minMiB
  sizeMaxMiB.value = maxMiB
}

function setProgressPreset(min: number, max: number) {
  store.progressMin = min
  store.progressMax = max
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
  <div class="relative z-30 flex flex-col gap-2 rounded-xl border border-default bg-default px-2.5 py-2 shadow-sm sm:px-3">
    <!-- 搜索字段切换 + 展开按钮 -->
    <div class="flex flex-wrap items-center gap-1.5 overflow-visible">
      <!-- 搜索字段下拉 -->
      <UDropdownMenu
        :items="searchFieldItems.map((f) => ({
          label: f.label,
          icon: f.model ? 'i-lucide-check-square' : 'i-lucide-square',
          onSelect: () => toggleSearchField(f.key),
        }))"
        :portal="true"
        :content="{ align: 'start', side: 'bottom', sideOffset: 6 }"
        :ui="{ content: 'z-[100] min-w-44' }"
      >
        <UButton
          icon="i-lucide-search"
          color="neutral"
          variant="soft"
          size="xs"
          :label="`搜索字段 · ${enabledSearchFields.length || 1}`"
          trailing-icon="i-lucide-chevron-down"
        />
      </UDropdownMenu>

      <!-- 大小/进度筛选展开 -->
      <UButton
        :icon="expanded ? 'i-lucide-chevron-up' : 'i-lucide-sliders-horizontal'"
        color="neutral"
        variant="ghost"
        size="xs"
        :label="expanded
          ? '收起筛选'
          : advancedFilterCount
            ? `高级筛选 · ${advancedFilterCount}`
            : '高级筛选'"
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

      <div v-if="activeFilterChips.length" class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:justify-end">
        <span class="hidden text-[11px] text-muted lg:inline">当前条件</span>
        <UBadge
          v-for="chip in activeFilterChips"
          :key="chip.key"
          color="primary"
          variant="subtle"
          size="sm"
          class="max-w-full"
        >
          <span class="flex min-w-0 items-center gap-1">
            <span class="truncate">{{ chip.label }}</span>
            <button
              type="button"
              class="grid size-4 shrink-0 place-items-center rounded hover:bg-primary/15"
              :aria-label="`清除${chip.label}`"
              @click="clearFilterChip(chip.key)"
            >
              <UIcon name="i-lucide-x" class="size-3" />
            </button>
          </span>
        </UBadge>
      </div>
    </div>

    <!-- 高级筛选面板 -->
    <div
      v-if="expanded"
      class="flex flex-col gap-3 rounded-xl border border-default bg-elevated/40 p-3 sm:p-4"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-default">高级筛选</h3>
          <p class="mt-0.5 text-xs text-muted">留空或填写 0 表示不限制；条件会立即应用到当前列表。</p>
        </div>
        <UButton
          v-if="advancedFilterCount"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-rotate-ccw"
          label="重置区间"
          @click="() => { clearSizeFilter(); clearProgressFilter() }"
        />
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        <!-- 大小区间 -->
        <section class="rounded-xl border border-default bg-default p-3">
          <div class="mb-3 flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <UIcon name="i-lucide-hard-drive" class="size-4" />
              </span>
              <div>
                <h4 class="text-sm font-medium">文件大小</h4>
                <p class="text-[11px] text-muted">单位为 MiB，例如 1024 MiB = 1 GiB</p>
              </div>
            </div>
            <UButton v-if="store.sizeMin || store.sizeMax" icon="i-lucide-x" color="neutral" variant="ghost" size="xs" aria-label="清除大小筛选" @click="clearSizeFilter" />
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <UFormField label="最小大小" size="xs">
              <UInputNumber v-model="sizeMinMiB" :min="0" size="sm" placeholder="不限" class="w-full" />
            </UFormField>
            <span class="pb-2 text-xs text-muted">至</span>
            <UFormField label="最大大小" size="xs">
              <UInputNumber v-model="sizeMaxMiB" :min="0" size="sm" placeholder="不限" class="w-full" />
            </UFormField>
          </div>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <span class="mr-1 self-center text-[11px] text-muted">快捷选择</span>
            <UButton color="neutral" variant="soft" size="xs" label="≥ 1 GiB" @click="setSizePreset(1024)" />
            <UButton color="neutral" variant="soft" size="xs" label="≥ 10 GiB" @click="setSizePreset(10240)" />
            <UButton color="neutral" variant="soft" size="xs" label="≤ 1 GiB" @click="setSizePreset(0, 1024)" />
          </div>
        </section>

        <!-- 进度区间 -->
        <section class="rounded-xl border border-default bg-default p-3">
          <div class="mb-3 flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <UIcon name="i-lucide-chart-no-axes-column-increasing" class="size-4" />
              </span>
              <div>
                <h4 class="text-sm font-medium">完成进度</h4>
                <p class="text-[11px] text-muted">按下载完成百分比缩小列表范围</p>
              </div>
            </div>
            <UButton v-if="store.progressMin || store.progressMax" icon="i-lucide-x" color="neutral" variant="ghost" size="xs" aria-label="清除进度筛选" @click="clearProgressFilter" />
          </div>
          <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <UFormField label="最低进度" size="xs">
              <UInputNumber v-model="store.progressMin" :min="0" :max="100" size="sm" placeholder="0" class="w-full" />
            </UFormField>
            <span class="pb-2 text-xs text-muted">至</span>
            <UFormField label="最高进度" size="xs">
              <UInputNumber v-model="store.progressMax" :min="0" :max="100" size="sm" placeholder="100" class="w-full" />
            </UFormField>
          </div>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <span class="mr-1 self-center text-[11px] text-muted">快捷选择</span>
            <UButton color="neutral" variant="soft" size="xs" label="未完成" @click="setProgressPreset(0, 99)" />
            <UButton color="neutral" variant="soft" size="xs" label="即将完成" @click="setProgressPreset(90, 99)" />
            <UButton color="neutral" variant="soft" size="xs" label="已完成" @click="setProgressPreset(100, 100)" />
          </div>
        </section>
      </div>

      <!-- 已保存的筛选列表（展开模式下显示） -->
      <div v-if="store.savedFilters.length" class="flex flex-col gap-1.5 border-t border-default pt-3">
        <span class="text-xs font-medium text-muted">已保存的筛选</span>
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
