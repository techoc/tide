<script setup lang="ts">
import { ref, computed } from 'vue'
import { addTorrent } from '@/api/modules/torrents'
import { useTorrentListStore } from '@/stores/torrentList'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ 'update:show': [value: boolean] }>()

const toast = useToast()
const store = useTorrentListStore()

// 弹窗开关双向绑定（桥接 props.show 与 UModal 的 open）
const open = computed({
  get: () => props.show,
  set: (v: boolean) => emit('update:show', v),
})

const tab = ref<'link' | 'file'>('link')
const loading = ref(false)
const magnetLinks = ref('')
const fileList = ref<File[]>([])
const savePath = ref('')
const rename = ref('')
const category = ref('')
const tags = ref<string[]>([])
const skipChecking = ref(false)
const paused = ref(false)
const advancedOpen = ref(false)
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// 标签页配置
const tabItems = [
  { label: 'Magnet 链接', icon: 'i-lucide-link', value: 'link', slot: 'link' },
  { label: '种子文件', icon: 'i-lucide-cloud-upload', value: 'file', slot: 'file' },
]

// 分类下拉选项（从 store 获取已有分类）
const categoryItems = computed(() => [
  { label: '不指定分类', value: '' },
  ...store.categories.map((c) => ({ label: c.name, value: c.name })),
])

const canSubmit = computed(() => {
  if (tab.value === 'link') return magnetLinks.value.trim().length > 0
  return fileList.value.length > 0
})

function reset() {
  magnetLinks.value = ''
  fileList.value = []
  savePath.value = ''
  rename.value = ''
  category.value = ''
  tags.value = []
  skipChecking.value = false
  paused.value = false
  tab.value = 'link'
  advancedOpen.value = false
}

function close() {
  emit('update:show', false)
}

// 文件选择处理
function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    fileList.value.push(...Array.from(target.files))
  }
  target.value = ''
}

// 拖拽释放处理
function handleDrop(e: DragEvent) {
  isDragging.value = false
  if (e.dataTransfer?.files) {
    const torrents = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.endsWith('.torrent'),
    )
    fileList.value.push(...torrents)
  }
}

// 移除已选文件
function removeFile(index: number) {
  fileList.value.splice(index, 1)
}

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  try {
    if (tab.value === 'link') {
      const urls = magnetLinks.value
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .join('\n')
      await addTorrent({
        urls,
        savepath: savePath.value || undefined,
        name: rename.value || undefined,
        category: category.value || undefined,
        tags: tags.value.length ? tags.value.join(',') : undefined,
        skip_checking: skipChecking.value,
        paused: paused.value,
      })
    } else {
      if (!fileList.value.length) {
        toast.add({ title: '请选择 .torrent 文件', color: 'warning' })
        loading.value = false
        return
      }
      await addTorrent({
        torrents: fileList.value,
        savepath: savePath.value || undefined,
        name: rename.value || undefined,
        category: category.value || undefined,
        tags: tags.value.length ? tags.value.join(',') : undefined,
        skip_checking: skipChecking.value,
        paused: paused.value,
      })
    }
    toast.add({ title: '种子已添加', color: 'success' })
    reset()
    close()
    await store.fetchTorrents()
  } catch (err) {
    const e = err as { response?: { data?: string } }
    toast.add({ title: e?.response?.data || '添加失败', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="添加种子"
    :dismissible="false"
    :ui="{ content: 'w-[640px] max-w-full' }"
  >
    <template #body>
      <UTabs v-model="tab" :items="tabItems">
        <!-- Magnet 链接 -->
        <template #link>
          <UTextarea
            v-model="magnetLinks"
            :rows="6"
            placeholder="粘贴 Magnet 链接，每行一个"
            class="w-full"
          />
        </template>

        <!-- 文件上传 -->
        <template #file>
          <div
            class="border-2 border-dashed border-default rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            :class="{ 'border-primary bg-primary/5': isDragging }"
            @click="fileInput?.click()"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <UIcon name="i-lucide-cloud-upload" class="text-4xl text-muted mx-auto mb-2" />
            <p class="text-default">点击或拖拽 .torrent 文件到此处</p>
            <p class="text-xs text-muted mt-1">支持多文件选择</p>
            <input
              ref="fileInput"
              type="file"
              accept=".torrent"
              multiple
              class="hidden"
              @change="handleFileSelect"
            />
          </div>
          <!-- 已选文件列表 -->
          <div v-if="fileList.length" class="mt-3 flex flex-col gap-2">
            <div
              v-for="(file, i) in fileList"
              :key="i"
              class="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-elevated/50"
            >
              <div class="flex items-center gap-2 min-w-0">
                <UIcon name="i-lucide-file" class="size-4 text-muted shrink-0" />
                <span class="text-sm truncate">{{ file.name }}</span>
              </div>
              <UButton
                icon="i-lucide-x"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="removeFile(i)"
              />
            </div>
          </div>
        </template>
      </UTabs>

      <!-- 高级选项 -->
      <UCollapsible v-model:open="advancedOpen" class="mt-4">
        <UButton
          color="neutral"
          variant="ghost"
          class="w-full justify-start"
          :icon="advancedOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          label="高级选项"
        />
        <template #content>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-muted">保存路径</label>
              <UInput v-model="savePath" placeholder="留空使用默认路径" class="w-full" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-muted">重命名</label>
              <UInput v-model="rename" placeholder="可选" class="w-full" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-muted">分类</label>
              <USelect
                v-model="category"
                :items="categoryItems"
                placeholder="选择分类"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-muted">标签</label>
              <UInputTags v-model="tags" placeholder="输入后回车" class="w-full" />
            </div>
            <div class="flex items-center justify-between gap-3">
              <label class="text-xs text-muted">跳过哈希校验</label>
              <USwitch v-model="skipChecking" />
            </div>
            <div class="flex items-center justify-between gap-3">
              <label class="text-xs text-muted">暂停添加</label>
              <USwitch v-model="paused" />
            </div>
          </div>
        </template>
      </UCollapsible>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="close">取消</UButton>
        <UButton
          color="primary"
          icon="i-lucide-plus-circle"
          :loading="loading"
          :disabled="!canSubmit"
          @click="submit"
        >
          添加
        </UButton>
      </div>
    </template>
  </UModal>
</template>
