<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useTorrentListStore } from '@/stores/torrentList'

const props = defineProps<{
  open: boolean
  mode: 'add' | 'remove' | 'manage'
  hashes: string[]
  initialTags?: string[]
  /** 目标描述（如种子名称或"选中的 N 项"），用于弹窗提示 */
  targetLabel?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const store = useTorrentListStore()
const toast = useToast()

/** 已选中的标签（从已有标签中选择的） */
const selectedTags = ref<Set<string>>(new Set())
/** 新输入的标签（仅 add 模式） */
const newTagInput = ref('')

/** 弹窗标题 */
const title = computed(() => {
  if (props.mode === 'manage') return '管理标签'
  return props.mode === 'add' ? '添加标签' : '移除标签'
})

/** 副标题描述 */
const description = computed(() => {
  const target = props.targetLabel ?? `${props.hashes.length} 个种子`
  if (props.mode === 'manage') return `为${target}设置标签：`
  return `对${target}${props.mode === 'add' ? '添加' : '移除'}以下标签：`
})

/** 当前已选标签数组（合并已有选择和新输入） */
const allSelectedTags = computed(() => {
  const fromExisting = [...selectedTags.value]
  const fromInput = newTagInput.value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && !fromExisting.includes(s))
  return [...fromExisting, ...fromInput]
})

/** 弹窗打开时重置状态 */
watch(
  () => props.open,
  (open) => {
    if (open) {
      selectedTags.value = new Set(props.mode === 'manage' ? props.initialTags ?? [] : [])
      newTagInput.value = ''
    }
  },
)

/** 切换已有标签选中状态 */
function toggleTag(tag: string) {
  const next = new Set(selectedTags.value)
  if (next.has(tag)) next.delete(tag)
  else next.add(tag)
  selectedTags.value = next
}

/** 提交标签操作 */
async function handleSubmit() {
  const tags = allSelectedTags.value
  if (!tags.length && props.mode !== 'manage') {
    toast.add({ title: '请选择或输入至少一个标签', color: 'warning' })
    return
  }
  const tagsStr = tags.join(',')
  try {
    if (props.mode === 'manage') {
      await store.updateTorrentTags(props.hashes, props.initialTags ?? [], tags)
      toast.add({ title: '标签已更新', color: 'success' })
    } else if (props.mode === 'add') {
      await store.addTagsToSelected(tagsStr, props.hashes)
      toast.add({ title: '标签已添加', color: 'success' })
    } else {
      await store.removeTagsFromSelected(tagsStr, props.hashes)
      toast.add({ title: '标签已移除', color: 'success' })
    }
    emit('update:open', false)
  } catch {
    toast.add({ title: '标签操作失败', color: 'error' })
  }
}
</script>

<template>
  <UModal :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-2">{{ title }}</h3>
        <p class="text-sm text-muted mb-4">{{ description }}</p>

        <!-- 已有标签列表（可点击选择） -->
        <div v-if="store.tags.length" class="mb-4">
          <div class="text-xs font-medium text-muted mb-2">已有标签</div>
          <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            <button
              v-for="tag in store.tags"
              :key="tag"
              class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer"
              :class="
                selectedTags.has(tag)
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-default bg-transparent text-default hover:bg-muted'
              "
              @click="toggleTag(tag)"
            >
              <UIcon v-if="selectedTags.has(tag)" name="i-lucide-check" class="size-3" />
              <UIcon v-else name="i-lucide-tag" class="size-3" />
              {{ tag }}
            </button>
          </div>
        </div>

        <!-- 新标签输入（添加或完整管理模式） -->
        <div v-if="mode !== 'remove'" class="mb-4">
          <div class="text-xs font-medium text-muted mb-2">新标签（逗号分隔）</div>
          <UInput
            v-model="newTagInput"
            placeholder="输入新标签，逗号分隔"
            icon="i-lucide-plus"
          />
        </div>

        <!-- 已选标签预览 -->
        <div v-if="allSelectedTags.length" class="mb-4">
          <div class="text-xs font-medium text-muted mb-2">已选（{{ allSelectedTags.length }}）</div>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="tag in allSelectedTags"
              :key="tag"
              :label="tag"
              :color="mode === 'remove' ? 'warning' : 'primary'"
              variant="subtle"
            />
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2 mt-6">
          <UButton color="neutral" variant="ghost" @click="emit('update:open', false)">
            取消
          </UButton>
          <UButton color="primary" @click="handleSubmit">
            {{ mode === 'manage' ? '保存' : '确定' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
