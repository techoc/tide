<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useTorrentListStore } from '@/stores/torrentList'
import { useSettingsStore } from '@/stores/settings'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import type { TorrentFilter } from '@/types/qbittorrent'

interface StatusItem {
  key: TorrentFilter
  label: string
  icon: string
}

const statusItems: StatusItem[] = [
  { key: 'all', label: '全部', icon: 'i-lucide-list' },
  { key: 'downloading', label: '正在下载', icon: 'i-lucide-cloud-download' },
  { key: 'seeding', label: '做种中', icon: 'i-lucide-cloud-upload' },
  { key: 'completed', label: '已完成', icon: 'i-lucide-check-circle' },
  { key: 'paused', label: '已暂停', icon: 'i-lucide-pause-circle' },
  { key: 'active', label: '活动中', icon: 'i-lucide-play-circle' },
  { key: 'inactive', label: '不活跃', icon: 'i-lucide-stop-circle' },
  { key: 'stalled', label: '已停滞', icon: 'i-lucide-gauge' },
]

const store = useTorrentListStore()
const settings = useSettingsStore()
const toast = useToast()
const confirmDialog = useConfirmDialog()
const router = useRouter()

const collapsed = computed(() => settings.sidebarCollapsed)

/** 底部导航项：统计 / 设置 */
const bottomItems = [
  { to: '/stats', label: '统计概览', icon: 'i-lucide-bar-chart-3' },
  { to: '/settings', label: '设置', icon: 'i-lucide-settings' },
]

/** 若当前不在种子列表页，则跳转回去以查看筛选结果 */
function ensureDashboard() {
  if (router.currentRoute.value.name !== 'dashboard') {
    router.push({ name: 'dashboard' })
  }
}

function selectStatus(key: TorrentFilter) {
  store.setFilter(key)
  ensureDashboard()
}

function selectCategory(cat: string) {
  // 点击同一个分类时取消选中
  if (cat === '__uncategorized__') {
    store.activeCategory = store.activeCategory === '__uncategorized__' ? '' : '__uncategorized__'
  } else {
    store.activeCategory = store.activeCategory === cat ? '' : cat
  }
  ensureDashboard()
}

function selectTag(tag: string) {
  store.activeTag = store.activeTag === tag ? '' : tag
  ensureDashboard()
}

function formatCount(n: number): string {
  return n > 999 ? '999+' : String(n)
}

// 右键删除标签
async function onTagContextMenu(e: MouseEvent, tag: string) {
  e.preventDefault()
  const confirmed = await confirmDialog.confirm({
    title: '删除标签',
    description: `确认删除标签「${tag}」？该标签会从所有种子中移除。`,
    confirmText: '确认删除',
    variant: 'error',
  })
  if (!confirmed) return
  try {
    await store.deleteTag(tag)
    toast.add({ title: '标签已删除', color: 'success' })
  } catch {
    toast.add({ title: '删除失败', color: 'error' })
  }
}

// ===== 分类管理 =====

/** 分类编辑弹窗状态 */
const categoryModal = ref({
  open: false,
  mode: 'create' as 'create' | 'edit',
  name: '',
  savePath: '',
  originalName: '',
})
const categorySaving = ref(false)

function openCreateCategory() {
  categoryModal.value = {
    open: true,
    mode: 'create',
    name: '',
    savePath: '',
    originalName: '',
  }
}

function openEditCategory(name: string, savePath: string) {
  categoryModal.value = {
    open: true,
    mode: 'edit',
    name,
    savePath,
    originalName: name,
  }
}

async function saveCategory() {
  const { mode, name, savePath, originalName } = categoryModal.value
  if (!name.trim()) {
    toast.add({ title: '分类名称不能为空', color: 'warning' })
    return
  }
  categorySaving.value = true
  try {
    if (mode === 'create') {
      await store.createCategory({ category: name.trim(), savePath: savePath || undefined })
      toast.add({ title: '分类已创建', color: 'success' })
    } else {
      await store.editCategory({ category: name.trim(), savePath: savePath || undefined })
      toast.add({ title: '分类已更新', color: 'success' })
    }
    categoryModal.value.open = false
  } catch {
    toast.add({ title: mode === 'create' ? '创建失败' : '更新失败', color: 'error' })
  } finally {
    categorySaving.value = false
  }
}

/** 右键分类弹出菜单 */
async function onCategoryContextMenu(e: MouseEvent, name: string, savePath: string) {
  e.preventDefault()
  // 使用确认弹窗简单处理：编辑 or 删除
  const confirmed = await confirmDialog.confirm({
    title: '分类操作',
    description: `分类「${name}」— 点击确认编辑，或点击删除移除该分类。`,
    confirmText: '编辑',
    cancelText: '取消',
    variant: 'default',
  })
  if (confirmed) {
    openEditCategory(name, savePath)
  }
}

/** 删除分类 */
async function deleteCategoryAction(name: string) {
  const confirmed = await confirmDialog.confirm({
    title: '删除分类',
    description: `确认删除分类「${name}」？该分类下的种子将变为未分类。`,
    confirmText: '确认删除',
    variant: 'error',
  })
  if (!confirmed) return
  try {
    await store.deleteCategory(name)
    toast.add({ title: '分类已删除', color: 'success' })
  } catch {
    toast.add({ title: '删除失败', color: 'error' })
  }
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden bg-default text-default">
    <!-- 品牌 -->
    <div
      class="flex h-14 flex-shrink-0 items-center gap-2.5 py-4"
      :class="collapsed ? 'justify-center px-0' : 'px-[18px]'"
    >
      <div
        class="grid size-[34px] flex-shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-[#18a0fb] to-[#00d4c8] text-white"
      >
        <UIcon name="i-lucide-waves" class="size-[22px]" />
      </div>
      <span v-if="!collapsed" class="text-lg font-bold tracking-tight">Tide</span>
    </div>

    <!-- 状态列表 -->
    <div class="py-2 px-3" :class="collapsed ? 'px-0' : ''">
      <div
        v-if="!collapsed"
        class="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted"
      >
        状态
      </div>
      <nav class="flex flex-col gap-0.5">
        <button
          v-for="item in statusItems"
          :key="item.key"
          class="relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
          :class="[
            store.filter === item.key ? 'bg-primary/15 text-primary' : 'text-default',
            collapsed ? 'justify-center py-2.5' : '',
          ]"
          :title="collapsed ? item.label : undefined"
          @click="selectStatus(item.key)"
        >
          <span
            class="grid flex-shrink-0 place-items-center"
            :class="store.filter === item.key ? 'text-primary' : 'text-muted'"
          >
            <UIcon :name="item.icon" class="size-[18px]" />
          </span>
          <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
          <span v-if="!collapsed" class="text-xs tabular-nums text-muted">{{ store.counts[item.key] ?? 0 }}</span>
          <UBadge
            v-else-if="(store.counts[item.key] ?? 0) > 0"
            :label="formatCount(store.counts[item.key] ?? 0)"
            color="primary"
            size="sm"
            class="absolute right-1 top-0.5"
          />
        </button>
      </nav>
    </div>

    <!-- 分类列表（qBittorrent 分类） -->
    <div v-if="!collapsed" class="flex min-h-0 flex-col px-3 py-2">
      <div class="flex items-center justify-between px-2.5 pb-1.5 pt-2">
        <span class="text-[11px] font-semibold uppercase tracking-[0.6px] text-muted">分类</span>
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="新建分类"
          @click="openCreateCategory"
        />
      </div>
      <div class="min-h-0 max-h-[200px] overflow-y-auto">
        <nav class="flex flex-col gap-0.5">
          <!-- 未分类 -->
          <button
            class="group flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
            :class="store.activeCategory === '__uncategorized__' ? 'bg-primary/15 text-primary' : 'text-default'"
            @click="selectCategory('__uncategorized__')"
            @contextmenu.prevent="onCategoryContextMenu($event, '', '')"
          >
            <span
              class="grid flex-shrink-0 place-items-center"
              :class="store.activeCategory === '__uncategorized__' ? 'text-primary' : 'text-muted'"
            >
              <UIcon name="i-lucide-folder-question" class="size-[16px]" />
            </span>
            <span class="flex-1 truncate text-[13px]">未分类</span>
            <span class="text-xs tabular-nums text-muted">{{ store.uncategorizedCount }}</span>
          </button>
          <!-- 已有分类 -->
          <button
            v-for="cat in store.categories"
            :key="cat.name"
            class="group flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
            :class="store.activeCategory === cat.name ? 'bg-primary/15 text-primary' : 'text-default'"
            @click="selectCategory(cat.name)"
            @contextmenu.prevent="onCategoryContextMenu($event, cat.name, cat.savePath)"
          >
            <span
              class="grid flex-shrink-0 place-items-center"
              :class="store.activeCategory === cat.name ? 'text-primary' : 'text-muted'"
            >
              <UIcon name="i-lucide-folder" class="size-[16px]" />
            </span>
            <span class="flex-1 truncate text-[13px]">{{ cat.name }}</span>
            <span class="text-xs tabular-nums text-muted">
              {{ store.categoryCounts[cat.name] ?? 0 }}
            </span>
          </button>
        </nav>
      </div>
    </div>

    <!-- 标签列表 -->
    <div v-if="!collapsed" class="flex min-h-0 flex-1 flex-col px-3 py-2 pb-0">
      <div class="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted">
        <span>标签</span>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div v-if="store.tags.length === 0" class="px-2.5 py-3 text-xs text-muted">
          暂无标签
        </div>
        <nav v-else class="flex flex-col gap-0.5">
          <button
            v-for="tag in store.tags"
            :key="tag"
            class="group flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
            :class="store.activeTag === tag ? 'bg-primary/15 text-primary' : 'text-default'"
            @click="selectTag(tag)"
            @contextmenu="onTagContextMenu($event, tag)"
          >
            <span
              class="grid flex-shrink-0 place-items-center"
              :class="store.activeTag === tag ? 'text-primary' : 'text-muted'"
            >
              <UIcon name="i-lucide-tag" class="size-[16px]" />
            </span>
            <span class="flex-1 truncate text-[13px]">{{ tag }}</span>
            <span class="text-xs tabular-nums text-muted">
              {{ store.tagCounts[tag] ?? 0 }}
            </span>
          </button>
        </nav>
      </div>
    </div>

    <!-- 底部导航：统计 / 设置 -->
    <div class="flex flex-shrink-0 flex-col gap-0.5 border-t border-default px-3 py-2" :class="collapsed ? 'items-center' : ''">
      <RouterLink
        v-for="item in bottomItems"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ isActive, navigate }"
      >
        <button
          class="relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
          :class="[
            isActive ? 'bg-primary/15 text-primary' : 'text-default',
            collapsed ? 'justify-center py-2.5' : '',
          ]"
          :title="collapsed ? item.label : undefined"
          @click="navigate"
        >
          <span
            class="grid flex-shrink-0 place-items-center"
            :class="isActive ? 'text-primary' : 'text-muted'"
          >
            <UIcon :name="item.icon" class="size-[18px]" />
          </span>
          <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
        </button>
      </RouterLink>
    </div>

    <!-- 折叠按钮 -->
    <div class="flex flex-shrink-0 justify-center border-t border-default p-2.5">
      <UTooltip
        :text="collapsed ? '展开侧边栏' : '折叠侧边栏'"
        :content="{ side: collapsed ? 'right' : 'left' }"
      >
        <UButton
          :icon="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="settings.toggleSidebar()"
        />
      </UTooltip>
    </div>

    <!-- 删除标签确认弹窗 -->
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

    <!-- 分类编辑/创建弹窗 -->
    <UModal v-model:open="categoryModal.open" :title="categoryModal.mode === 'create' ? '新建分类' : '编辑分类'">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField label="分类名称" required>
            <UInput
              v-model="categoryModal.name"
              placeholder="输入分类名称"
              class="w-full"
            />
          </UFormField>
          <UFormField label="保存路径">
            <UInput
              v-model="categoryModal.savePath"
              placeholder="留空使用默认路径"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between gap-2 w-full">
          <UButton
            v-if="categoryModal.mode === 'edit'"
            color="error"
            variant="soft"
            icon="i-lucide-trash"
            @click="deleteCategoryAction(categoryModal.originalName); categoryModal.open = false"
          >
            删除
          </UButton>
          <div class="flex gap-2 ml-auto">
            <UButton color="neutral" variant="ghost" @click="() => { categoryModal.open = false }">取消</UButton>
            <UButton
              color="primary"
              :loading="categorySaving"
              @click="saveCategory"
            >
              {{ categoryModal.mode === 'create' ? '创建' : '保存' }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
