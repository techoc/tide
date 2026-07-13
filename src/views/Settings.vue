<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useColorMode } from '#imports'
import { getPreferences, setPreferences } from '@/api/modules/app'
import { useSettingsStore, type ListDensity } from '@/stores/settings'
import { useTorrentListStore } from '@/stores/torrentList'
import { formatSize, formatSpeed } from '@/utils/format'
import type { TorrentSort } from '@/types/qbittorrent'

const toast = useToast()
const settings = useSettingsStore()
const torrentStore = useTorrentListStore()
const colorMode = useColorMode()

const loading = ref(false)
const saving = ref(false)

const prefs = reactive({
  dl_limit: 0,
  up_limit: 0,
  save_path: '',
  listen_port: 0,
  alt_dl_limit: 0,
  alt_up_limit: 0,
  rss_enabled: false,
  scheduler_enabled: false,
  schedule_from_hour: 8,
  schedule_to_hour: 20,
  dht: false,
  pex: false,
  lsd: false,
})

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (val: boolean) => {
    colorMode.preference = val ? 'dark' : 'light'
  },
})

const languageItems = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' },
]

const languageValue = computed({
  get: () => settings.language,
  set: (val: string) => {
    if (val === 'zh' || val === 'en') settings.language = val
  },
})

/** 刷新间隔选项（毫秒） */
const refreshIntervalItems = [
  { label: '暂停', value: 0 },
  { label: '1 秒', value: 1000 },
  { label: '2 秒', value: 2000 },
  { label: '5 秒', value: 5000 },
  { label: '10 秒', value: 10000 },
  { label: '30 秒', value: 30000 },
]

const refreshIntervalValue = computed({
  get: () => settings.refreshInterval,
  set: (val: number) => {
    settings.refreshInterval = val
  },
})

/** 默认排序选项 */
const sortItems: { label: string; value: TorrentSort }[] = [
  { label: '添加时间', value: 'added_on' },
  { label: '名称', value: 'name' },
  { label: '大小', value: 'size' },
  { label: '进度', value: 'progress' },
  { label: '下载速度', value: 'dlspeed' },
  { label: '上传速度', value: 'upspeed' },
  { label: '剩余时间', value: 'eta' },
  { label: '比率', value: 'ratio' },
  { label: '状态', value: 'state' },
]

const sortValue = computed({
  get: () => settings.defaultSort,
  set: (val: TorrentSort) => {
    settings.defaultSort = val
  },
})

/** 列表密度选项 */
const densityItems: { label: string; value: ListDensity }[] = [
  { label: '紧凑', value: 'compact' },
  { label: '默认', value: 'default' },
  { label: '宽松', value: 'comfortable' },
]

const densityValue = computed({
  get: () => settings.listDensity,
  set: (val: ListDensity) => {
    settings.listDensity = val
  },
})

/** 会话统计 */
const sessionStats = computed(() => ({
  totalDownloaded: formatSize(torrentStore.transfer.dl_info_data),
  totalUploaded: formatSize(torrentStore.transfer.up_info_data),
  currentDlSpeed: formatSpeed(torrentStore.transfer.dl_info_speed),
  currentUpSpeed: formatSpeed(torrentStore.transfer.up_info_speed),
  torrentCount: torrentStore.torrents.length,
}))

onMounted(async () => {
  loading.value = true
  try {
    const data = await getPreferences()
    prefs.dl_limit = Number(data.dl_limit) || 0
    prefs.up_limit = Number(data.up_limit) || 0
    prefs.save_path = String(data.save_path ?? '')
    prefs.listen_port = Number(data.listen_port) || 0
    prefs.alt_dl_limit = Number(data.alt_dl_limit) || 0
    prefs.alt_up_limit = Number(data.alt_up_limit) || 0
    prefs.rss_enabled = Boolean(data.rss_enabled) || false
    prefs.scheduler_enabled = Boolean(data.scheduler_enabled) || false
    prefs.schedule_from_hour = Number(data.schedule_from_hour) || 8
    prefs.schedule_to_hour = Number(data.schedule_to_hour) || 20
    prefs.dht = Boolean(data.dht) || false
    prefs.pex = Boolean(data.pex) || false
    prefs.lsd = Boolean(data.lsd) || false
  } catch {
    toast.add({ title: '加载设置失败', color: 'error' })
  } finally {
    loading.value = false
  }
})

async function handleSave() {
  saving.value = true
  try {
    await setPreferences({
      dl_limit: prefs.dl_limit,
      up_limit: prefs.up_limit,
      save_path: prefs.save_path,
      alt_dl_limit: prefs.alt_dl_limit,
      alt_up_limit: prefs.alt_up_limit,
      rss_enabled: prefs.rss_enabled,
      scheduler_enabled: prefs.scheduler_enabled,
      schedule_from_hour: prefs.schedule_from_hour,
      schedule_to_hour: prefs.schedule_to_hour,
      dht: prefs.dht,
      pex: prefs.pex,
      lsd: prefs.lsd,
    })
    toast.add({ title: '设置已保存', color: 'success' })
  } catch {
    toast.add({ title: '保存失败', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-5 pb-20">
    <!-- 页头 -->
    <div class="mb-5">
      <h2 class="m-0 text-xl font-bold text-default">设置</h2>
      <p class="m-0 mt-1 text-sm text-muted">配置 qBittorrent 全局参数与界面偏好</p>
    </div>

    <!-- 界面偏好 -->
    <UCard class="mb-4">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-default">界面</h3>
          <UIcon name="i-lucide-globe" class="size-4 text-muted" />
        </div>
      </template>

      <div class="flex flex-col gap-4">
        <UFormField label="深色模式">
          <USwitch v-model="isDark" />
        </UFormField>
        <UFormField label="界面语言">
          <USelect
            v-model="languageValue"
            :items="languageItems"
            class="max-w-[280px]"
          />
        </UFormField>
        <UFormField label="列表密度" description="控制表格行高">
          <USelect
            v-model="densityValue"
            :items="densityItems"
            class="max-w-[280px]"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- 行为设置 -->
    <UCard class="mb-4">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-default">行为</h3>
          <UIcon name="i-lucide-settings-2" class="size-4 text-muted" />
        </div>
      </template>

      <div class="flex flex-col gap-4">
        <UFormField label="自动刷新间隔" description="种子列表和速度的轮询间隔">
          <USelect
            v-model="refreshIntervalValue"
            :items="refreshIntervalItems"
            class="max-w-[280px]"
          />
        </UFormField>
        <UFormField label="默认排序字段">
          <USelect
            v-model="sortValue"
            :items="sortItems"
            class="max-w-[280px]"
          />
        </UFormField>
        <UFormField label="默认倒序">
          <USwitch v-model="settings.defaultReverse" />
        </UFormField>
      </div>
    </UCard>

    <!-- 会话统计 -->
    <UCard class="mb-4">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-default">会话统计</h3>
          <UIcon name="i-lucide-bar-chart-3" class="size-4 text-muted" />
        </div>
      </template>

      <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted">本次下载</span>
          <span class="text-lg font-semibold tabular-nums text-blue-500">{{ sessionStats.totalDownloaded }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted">本次上传</span>
          <span class="text-lg font-semibold tabular-nums text-emerald-500">{{ sessionStats.totalUploaded }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted">当前下载</span>
          <span class="text-lg font-semibold tabular-nums text-blue-500">{{ sessionStats.currentDlSpeed }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted">当前上传</span>
          <span class="text-lg font-semibold tabular-nums text-emerald-500">{{ sessionStats.currentUpSpeed }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted">种子总数</span>
          <span class="text-lg font-semibold tabular-nums text-default">{{ sessionStats.torrentCount }}</span>
        </div>
      </div>
    </UCard>

    <!-- 速度限制 -->
    <UCard class="mb-4">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-default">速度限制</h3>
          <UIcon name="i-lucide-gauge" class="size-4 text-muted" />
        </div>
      </template>

      <UForm :state="prefs" class="flex flex-col gap-4">
        <UFormField label="下载限速 (KiB/s)">
          <UInputNumber
            v-model="prefs.dl_limit"
            :min="0"
            placeholder="0 表示不限速"
            class="max-w-[280px]"
          />
        </UFormField>
        <UFormField label="上传限速 (KiB/s)">
          <UInputNumber
            v-model="prefs.up_limit"
            :min="0"
            placeholder="0 表示不限速"
            class="max-w-[280px]"
          />
        </UFormField>
        <USeparator />
        <UFormField label="备用下载限速">
          <UInputNumber
            v-model="prefs.alt_dl_limit"
            :min="0"
            class="max-w-[280px]"
          />
        </UFormField>
        <UFormField label="备用上传限速">
          <UInputNumber
            v-model="prefs.alt_up_limit"
            :min="0"
            class="max-w-[280px]"
          />
        </UFormField>
      </UForm>
    </UCard>

    <!-- 下载与连接 -->
    <UCard class="mb-4">
      <template #header>
        <h3 class="text-base font-semibold text-default">下载与连接</h3>
      </template>

      <UForm :state="prefs" class="flex flex-col gap-4">
        <UFormField label="默认保存路径">
          <UInput
            v-model="prefs.save_path"
            placeholder="默认下载路径"
            class="w-full"
          />
        </UFormField>
        <UFormField label="监听端口">
          <UInputNumber
            v-model="prefs.listen_port"
            disabled
            class="max-w-[280px]"
          />
        </UFormField>
        <USeparator />
        <UFormField label="DHT（分布式哈希表）" description="启用后可通过 DHT 发现更多节点">
          <USwitch v-model="prefs.dht" />
        </UFormField>
        <UFormField label="PeX（节点交换）" description="启用后可与连接的节点交换节点列表">
          <USwitch v-model="prefs.pex" />
        </UFormField>
        <UFormField label="LSD（本地服务发现）" description="启用后可自动发现本地网络中的 BT 客户端">
          <USwitch v-model="prefs.lsd" />
        </UFormField>
      </UForm>
    </UCard>

    <!-- RSS 与调度器 -->
    <UCard class="mb-4">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-default">RSS 与调度器</h3>
          <UIcon name="i-lucide-rss" class="size-4 text-muted" />
        </div>
      </template>

      <div class="flex flex-col gap-4">
        <UFormField label="RSS 阅读器" description="启用 qBittorrent 内置 RSS 订阅功能">
          <USwitch v-model="prefs.rss_enabled" />
        </UFormField>
        <USeparator />
        <UFormField label="速度调度器" description="在指定时间段内自动切换到备选限速">
          <USwitch v-model="prefs.scheduler_enabled" />
        </UFormField>
        <div v-if="prefs.scheduler_enabled" class="flex items-center gap-3 pl-1">
          <span class="text-xs text-muted whitespace-nowrap">从</span>
          <UInputNumber
            v-model="prefs.schedule_from_hour"
            :min="0"
            :max="23"
            class="w-24"
          />
          <span class="text-xs text-muted">时</span>
          <span class="text-xs text-muted whitespace-nowrap">到</span>
          <UInputNumber
            v-model="prefs.schedule_to_hour"
            :min="0"
            :max="23"
            class="w-24"
          />
          <span class="text-xs text-muted">时</span>
        </div>
      </div>
    </UCard>

    <!-- 保存按钮 -->
    <div class="sticky bottom-0 flex justify-end py-4">
      <UButton
        color="primary"
        size="lg"
        icon="i-lucide-save"
        :loading="saving"
        :disabled="loading"
        @click="handleSave"
      >
        保存设置
      </UButton>
    </div>
  </div>
</template>
