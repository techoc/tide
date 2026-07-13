<script setup lang="ts">
defineOptions({ name: 'SettingsView' })

import { computed, onMounted, reactive, ref } from 'vue'
import { useColorMode } from '#imports'
import { getPreferences, setPreferences } from '@/api/modules/app'
import { useSettingsStore, type ListDensity } from '@/stores/settings'
import { useTorrentListStore } from '@/stores/torrentList'
import { formatSize, formatSpeed } from '@/utils/format'
import type { TorrentSort } from '@/types/qbittorrent'

type PreferenceValue = string | number | boolean

const toast = useToast()
const settings = useSettingsStore()
const torrentStore = useTorrentListStore()
const colorMode = useColorMode()

const loading = ref(false)
const saving = ref(false)
const advancedOpen = ref(false)

const prefs = reactive({
  dl_limit: 0,
  up_limit: 0,
  alt_dl_limit: 0,
  alt_up_limit: 0,
  save_path: '',
  temp_path_enabled: false,
  temp_path: '',
  create_subfolder_enabled: true,
  start_paused_enabled: false,
  preallocate_all: false,
  incomplete_files_ext: false,
  auto_tmm_enabled: false,
  listen_port: 0,
  upnp: false,
  random_port: false,
  max_connec: 500,
  max_connec_per_torrent: 100,
  max_uploads: -1,
  max_uploads_per_torrent: 4,
  dht: false,
  pex: false,
  lsd: false,
  encryption: 0,
  anonymous_mode: false,
  queueing_enabled: false,
  max_active_downloads: 3,
  max_active_uploads: 3,
  max_active_torrents: 5,
  dont_count_slow_torrents: false,
  rss_enabled: false,
  scheduler_enabled: false,
  schedule_from_hour: 8,
  schedule_from_min: 0,
  schedule_to_hour: 20,
  schedule_to_min: 0,
  scheduler_days: 0,
  proxy_type: 0,
  proxy_ip: '',
  proxy_port: 8080,
  proxy_auth_enabled: false,
  proxy_username: '',
  proxy_password: '',
  proxy_peer_connections: false,
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

const encryptionItems = [
  { label: '允许加密', value: 0 },
  { label: '强制加密', value: 1 },
  { label: '禁用加密', value: 2 },
]

const schedulerDayItems = [
  { label: '每天', value: 0 },
  { label: '工作日', value: 1 },
  { label: '周末', value: 2 },
  { label: '周一', value: 3 },
  { label: '周二', value: 4 },
  { label: '周三', value: 5 },
  { label: '周四', value: 6 },
  { label: '周五', value: 7 },
  { label: '周六', value: 8 },
  { label: '周日', value: 9 },
]

const proxyTypeItems = [
  { label: '不使用代理', value: 0 },
  { label: 'SOCKS4', value: 1 },
  { label: 'SOCKS5', value: 2 },
  { label: 'HTTP', value: 3 },
]

const sessionStats = computed(() => ({
  totalDownloaded: formatSize(torrentStore.transfer.dl_info_data),
  totalUploaded: formatSize(torrentStore.transfer.up_info_data),
  currentDlSpeed: formatSpeed(torrentStore.transfer.dl_info_speed),
  currentUpSpeed: formatSpeed(torrentStore.transfer.up_info_speed),
  torrentCount: torrentStore.torrents.length,
}))

function bytesToKiB(value: unknown): number {
  const bytes = Number(value) || 0
  return bytes > 0 ? Math.round(bytes / 1024) : 0
}

function kiBToBytes(value: number): number {
  return value > 0 ? Math.round(value * 1024) : 0
}

function readNumber(data: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(data[key])
  return Number.isFinite(value) ? value : fallback
}

function readBoolean(data: Record<string, unknown>, key: string, fallback: boolean): boolean {
  return typeof data[key] === 'boolean' ? data[key] : fallback
}

function readString(data: Record<string, unknown>, key: string, fallback = ''): string {
  return typeof data[key] === 'string' ? data[key] : fallback
}

async function loadPreferences() {
  loading.value = true
  try {
    const data = await getPreferences()
    prefs.dl_limit = bytesToKiB(data.dl_limit)
    prefs.up_limit = bytesToKiB(data.up_limit)
    prefs.alt_dl_limit = bytesToKiB(data.alt_dl_limit)
    prefs.alt_up_limit = bytesToKiB(data.alt_up_limit)

    for (const key of ['save_path', 'temp_path', 'proxy_ip', 'proxy_username', 'proxy_password'] as const) {
      prefs[key] = readString(data, key, prefs[key])
    }

    for (const key of [
      'temp_path_enabled',
      'create_subfolder_enabled',
      'start_paused_enabled',
      'preallocate_all',
      'incomplete_files_ext',
      'auto_tmm_enabled',
      'upnp',
      'random_port',
      'dht',
      'pex',
      'lsd',
      'anonymous_mode',
      'queueing_enabled',
      'dont_count_slow_torrents',
      'rss_enabled',
      'scheduler_enabled',
      'proxy_auth_enabled',
      'proxy_peer_connections',
    ] as const) {
      prefs[key] = readBoolean(data, key, prefs[key])
    }

    for (const key of [
      'listen_port',
      'max_connec',
      'max_connec_per_torrent',
      'max_uploads',
      'max_uploads_per_torrent',
      'encryption',
      'max_active_downloads',
      'max_active_uploads',
      'max_active_torrents',
      'schedule_from_hour',
      'schedule_from_min',
      'schedule_to_hour',
      'schedule_to_min',
      'scheduler_days',
      'proxy_type',
      'proxy_port',
    ] as const) {
      prefs[key] = readNumber(data, key, prefs[key])
    }
  } catch {
    toast.add({ title: '加载设置失败', description: '请确认 qBittorrent 连接正常', color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(loadPreferences)

async function handleSave() {
  saving.value = true
  try {
    const payload: Record<string, PreferenceValue> = { ...prefs }
    payload.dl_limit = kiBToBytes(prefs.dl_limit)
    payload.up_limit = kiBToBytes(prefs.up_limit)
    payload.alt_dl_limit = kiBToBytes(prefs.alt_dl_limit)
    payload.alt_up_limit = kiBToBytes(prefs.alt_up_limit)
    await setPreferences(payload)
    await loadPreferences()
    toast.add({ title: '设置已保存', description: 'qBittorrent 配置已同步', color: 'success' })
  } catch {
    toast.add({ title: '保存失败', description: '部分参数可能不受当前 qBittorrent 版本支持', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto w-full max-w-6xl px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="m-0 text-xl font-bold text-default">设置</h2>
          <p class="m-0 mt-1 text-sm text-muted">界面偏好与 qBittorrent 全局配置</p>
        </div>
        <UButton
          variant="soft"
          color="neutral"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="loadPreferences"
        >
          重新读取
        </UButton>
      </div>

      <div v-if="loading" class="grid gap-4 lg:grid-cols-2">
        <USkeleton v-for="index in 6" :key="index" class="h-64 rounded-xl" />
      </div>

      <template v-else>
        <div class="grid items-start gap-4 lg:grid-cols-2">
          <div class="flex flex-col gap-4">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-base font-semibold text-default">界面与行为</h3>
                    <p class="mt-0.5 text-xs text-muted">仅保存在当前浏览器</p>
                  </div>
                  <UIcon name="i-lucide-monitor-cog" class="size-4 text-muted" />
                </div>
              </template>
              <div class="settings-grid">
                <UFormField label="深色模式"><USwitch v-model="isDark" /></UFormField>
                <UFormField label="界面语言"><USelect v-model="languageValue" :items="languageItems" class="w-full" /></UFormField>
                <UFormField label="列表密度"><USelect v-model="densityValue" :items="densityItems" class="w-full" /></UFormField>
                <UFormField label="自动刷新"><USelect v-model="refreshIntervalValue" :items="refreshIntervalItems" class="w-full" /></UFormField>
                <UFormField label="默认排序"><USelect v-model="sortValue" :items="sortItems" class="w-full" /></UFormField>
                <UFormField label="默认倒序"><USwitch v-model="settings.defaultReverse" /></UFormField>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-base font-semibold text-default">下载</h3>
                    <p class="mt-0.5 text-xs text-muted">保存路径与添加种子时的默认行为</p>
                  </div>
                  <UIcon name="i-lucide-folder-down" class="size-4 text-muted" />
                </div>
              </template>
              <div class="flex flex-col gap-4">
                <UFormField label="默认保存路径"><UInput v-model="prefs.save_path" class="w-full" /></UFormField>
                <UFormField label="未完成文件路径">
                  <div class="flex flex-col gap-2 sm:flex-row">
                    <USwitch v-model="prefs.temp_path_enabled" class="mt-2 shrink-0" />
                    <UInput v-model="prefs.temp_path" :disabled="!prefs.temp_path_enabled" placeholder="临时下载目录" class="w-full" />
                  </div>
                </UFormField>
                <USeparator />
                <div class="settings-grid">
                  <UFormField label="创建种子子文件夹"><USwitch v-model="prefs.create_subfolder_enabled" /></UFormField>
                  <UFormField label="添加后停止"><USwitch v-model="prefs.start_paused_enabled" /></UFormField>
                  <UFormField label="预分配磁盘空间"><USwitch v-model="prefs.preallocate_all" /></UFormField>
                  <UFormField label="未完成文件加 .!qB"><USwitch v-model="prefs.incomplete_files_ext" /></UFormField>
                  <UFormField label="自动种子管理"><USwitch v-model="prefs.auto_tmm_enabled" /></UFormField>
                </div>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-base font-semibold text-default">队列</h3>
                    <p class="mt-0.5 text-xs text-muted">控制同时活动的任务数量</p>
                  </div>
                  <USwitch v-model="prefs.queueing_enabled" />
                </div>
              </template>
              <div class="settings-grid" :class="{ 'opacity-50': !prefs.queueing_enabled }">
                <UFormField label="活动下载上限"><UInputNumber v-model="prefs.max_active_downloads" :min="-1" :disabled="!prefs.queueing_enabled" class="w-full" /></UFormField>
                <UFormField label="活动上传上限"><UInputNumber v-model="prefs.max_active_uploads" :min="-1" :disabled="!prefs.queueing_enabled" class="w-full" /></UFormField>
                <UFormField label="活动任务上限"><UInputNumber v-model="prefs.max_active_torrents" :min="-1" :disabled="!prefs.queueing_enabled" class="w-full" /></UFormField>
                <UFormField label="慢速任务不计入"><USwitch v-model="prefs.dont_count_slow_torrents" :disabled="!prefs.queueing_enabled" /></UFormField>
              </div>
            </UCard>
          </div>

          <div class="flex flex-col gap-4">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-base font-semibold text-default">速度限制</h3>
                    <p class="mt-0.5 text-xs text-muted">0 表示不限速，单位 KiB/s</p>
                  </div>
                  <UIcon name="i-lucide-gauge" class="size-4 text-muted" />
                </div>
              </template>
              <div class="settings-grid">
                <UFormField label="下载限速"><UInputNumber v-model="prefs.dl_limit" :min="0" class="w-full" /></UFormField>
                <UFormField label="上传限速"><UInputNumber v-model="prefs.up_limit" :min="0" class="w-full" /></UFormField>
                <UFormField label="备用下载限速"><UInputNumber v-model="prefs.alt_dl_limit" :min="0" class="w-full" /></UFormField>
                <UFormField label="备用上传限速"><UInputNumber v-model="prefs.alt_up_limit" :min="0" class="w-full" /></UFormField>
              </div>
              <USeparator class="my-4" />
              <UFormField label="速度调度器" description="在指定时段自动启用备用限速">
                <USwitch v-model="prefs.scheduler_enabled" />
              </UFormField>
              <div v-if="prefs.scheduler_enabled" class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <UFormField label="生效日期"><USelect v-model="prefs.scheduler_days" :items="schedulerDayItems" class="w-full" /></UFormField>
                <UFormField label="开始时间">
                  <div class="flex items-center gap-1"><UInputNumber v-model="prefs.schedule_from_hour" :min="0" :max="23" class="min-w-0 flex-1" /><span>:</span><UInputNumber v-model="prefs.schedule_from_min" :min="0" :max="59" class="min-w-0 flex-1" /></div>
                </UFormField>
                <UFormField label="结束时间" class="col-span-2 sm:col-span-1">
                  <div class="flex items-center gap-1"><UInputNumber v-model="prefs.schedule_to_hour" :min="0" :max="23" class="min-w-0 flex-1" /><span>:</span><UInputNumber v-model="prefs.schedule_to_min" :min="0" :max="59" class="min-w-0 flex-1" /></div>
                </UFormField>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-base font-semibold text-default">连接</h3>
                    <p class="mt-0.5 text-xs text-muted">监听端口、连接上限与节点发现</p>
                  </div>
                  <UIcon name="i-lucide-network" class="size-4 text-muted" />
                </div>
              </template>
              <div class="settings-grid">
                <UFormField label="监听端口"><UInputNumber v-model="prefs.listen_port" :min="1" :max="65535" :disabled="prefs.random_port" class="w-full" /></UFormField>
                <UFormField label="启动时随机端口"><USwitch v-model="prefs.random_port" /></UFormField>
                <UFormField label="UPnP / NAT-PMP"><USwitch v-model="prefs.upnp" /></UFormField>
                <UFormField label="传输加密"><USelect v-model="prefs.encryption" :items="encryptionItems" class="w-full" /></UFormField>
                <UFormField label="全局连接上限"><UInputNumber v-model="prefs.max_connec" :min="-1" class="w-full" /></UFormField>
                <UFormField label="单任务连接上限"><UInputNumber v-model="prefs.max_connec_per_torrent" :min="-1" class="w-full" /></UFormField>
                <UFormField label="全局上传槽位"><UInputNumber v-model="prefs.max_uploads" :min="-1" class="w-full" /></UFormField>
                <UFormField label="单任务上传槽位"><UInputNumber v-model="prefs.max_uploads_per_torrent" :min="-1" class="w-full" /></UFormField>
              </div>
              <USeparator class="my-4" />
              <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <UFormField label="DHT"><USwitch v-model="prefs.dht" /></UFormField>
                <UFormField label="PeX"><USwitch v-model="prefs.pex" /></UFormField>
                <UFormField label="LSD"><USwitch v-model="prefs.lsd" /></UFormField>
                <UFormField label="匿名模式"><USwitch v-model="prefs.anonymous_mode" /></UFormField>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-base font-semibold text-default">RSS</h3>
                    <p class="mt-0.5 text-xs text-muted">控制 qBittorrent 内置 RSS 服务</p>
                  </div>
                  <USwitch v-model="prefs.rss_enabled" />
                </div>
              </template>
              <p class="m-0 text-sm text-muted">启用后可在侧边栏的 RSS 页面管理订阅与自动下载规则。</p>
            </UCard>
          </div>
        </div>

        <UCollapsible v-model:open="advancedOpen" class="mt-4">
          <UButton
            block
            color="neutral"
            variant="soft"
            :icon="advancedOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            label="高级网络设置"
          />
          <template #content>
            <UForm :state="prefs" class="mt-4">
              <UCard>
                <template #header>
                  <div>
                    <h3 class="text-base font-semibold text-default">代理服务器</h3>
                    <p class="mt-0.5 text-xs text-muted">代理参数会直接写入 qBittorrent，修改后可能影响全部连接</p>
                  </div>
                </template>
                <div class="settings-grid lg:grid-cols-3">
                  <UFormField label="代理类型"><USelect v-model="prefs.proxy_type" :items="proxyTypeItems" class="w-full" /></UFormField>
                  <UFormField label="服务器"><UInput v-model="prefs.proxy_ip" :disabled="prefs.proxy_type === 0" class="w-full" /></UFormField>
                  <UFormField label="端口"><UInputNumber v-model="prefs.proxy_port" :min="1" :max="65535" :disabled="prefs.proxy_type === 0" class="w-full" /></UFormField>
                  <UFormField label="需要认证"><USwitch v-model="prefs.proxy_auth_enabled" :disabled="prefs.proxy_type === 0" /></UFormField>
                  <UFormField label="用户名"><UInput v-model="prefs.proxy_username" autocomplete="username" :disabled="prefs.proxy_type === 0 || !prefs.proxy_auth_enabled" class="w-full" /></UFormField>
                  <UFormField label="密码"><UInput v-model="prefs.proxy_password" type="password" autocomplete="current-password" :disabled="prefs.proxy_type === 0 || !prefs.proxy_auth_enabled" class="w-full" /></UFormField>
                  <UFormField label="代理节点连接"><USwitch v-model="prefs.proxy_peer_connections" :disabled="prefs.proxy_type === 0" /></UFormField>
                </div>
              </UCard>
            </UForm>
          </template>
        </UCollapsible>

        <UCard class="mt-4">
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div><span class="text-xs text-muted">本次下载</span><p class="m-0 mt-1 font-semibold text-blue-500">{{ sessionStats.totalDownloaded }}</p></div>
            <div><span class="text-xs text-muted">本次上传</span><p class="m-0 mt-1 font-semibold text-emerald-500">{{ sessionStats.totalUploaded }}</p></div>
            <div><span class="text-xs text-muted">当前下载</span><p class="m-0 mt-1 font-semibold text-blue-500">{{ sessionStats.currentDlSpeed }}</p></div>
            <div><span class="text-xs text-muted">当前上传</span><p class="m-0 mt-1 font-semibold text-emerald-500">{{ sessionStats.currentUpSpeed }}</p></div>
            <div><span class="text-xs text-muted">种子总数</span><p class="m-0 mt-1 font-semibold text-default">{{ sessionStats.torrentCount }}</p></div>
          </div>
        </UCard>
      </template>
    </div>

    <div class="pointer-events-none sticky bottom-0 z-20 flex justify-end border-t border-default bg-default/90 px-4 py-3 backdrop-blur sm:px-6">
      <UButton
        class="pointer-events-auto"
        color="primary"
        size="lg"
        icon="i-lucide-save"
        :loading="saving"
        :disabled="loading"
        @click="handleSave"
      >
        保存 qBittorrent 设置
      </UButton>
    </div>
  </div>
</template>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

@media (max-width: 639px) {
  .settings-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
