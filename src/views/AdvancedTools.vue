<script setup lang="ts">
defineOptions({ name: 'AdvancedToolsView' })

import { computed, onMounted, ref, watch } from 'vue'
import {
  getBuildInfo,
  getCookies,
  getDefaultSavePath,
  getDirectoryContent,
  getFreeSpaceAtPath,
  getNetworkInterfaceAddresses,
  getNetworkInterfaces,
  getProcessInfo,
  getWebApiVersion,
  setCookies,
} from '@/api/modules/app'
import { loadClientData, storeClientData } from '@/api/modules/clientData'
import {
  deleteTorrentCreatorTask,
  getCreatedTorrentFile,
  getTorrentCreatorTasks,
  addTorrentCreatorTask,
} from '@/api/modules/torrentCreator'
import {
  getAlternativeSpeedLimitsMode,
  getGlobalDownloadLimit,
  getGlobalUploadLimit,
  setAlternativeSpeedLimitsMode,
  setGlobalDownloadLimit,
  setGlobalUploadLimit,
} from '@/api/modules/transfer'
import {
  addPeers,
  addTorrentWebSeeds,
  editTorrentWebSeed,
  fetchTorrentMetadata,
  getTorrentPieceAvailability,
  getTorrentPieceHashes,
  getTorrentPieceStates,
  getTorrentProperties,
  getTorrentSSLParameters,
  getTorrentWebSeeds,
  getTorrentsDownloadLimit,
  getTorrentsUploadLimit,
  parseTorrentMetadata,
  removeTorrentWebSeeds,
  saveTorrentMetadata,
  setAutomaticTorrentManagement,
  setTorrentsComment,
  setTorrentsDownloadLimit,
  setTorrentsDownloadPath,
  setTorrentsSavePath,
  setTorrentsShareLimits,
  setTorrentsUploadLimit,
} from '@/api/modules/torrents'
import {
  cloneRssRule,
  getMatchingRssArticles,
  getRssRules,
  removeRssRule,
  renameRssRule,
  setRssRule,
} from '@/api/modules/rss'
import { useTorrentListStore } from '@/stores/torrentList'
import type {
  BuildInfo,
  DirectoryEntry,
  NetworkInterface,
  ProcessInfo,
  QbtCookie,
  RSSRule,
  SSLParameters,
  TorrentCreatorTask,
  TorrentProperties,
  TorrentWebSeed,
} from '@/types/qbittorrent'
import { formatSize, formatTimestamp } from '@/utils/format'

const toast = useToast()
const store = useTorrentListStore()
const activeTab = ref('system')
const tabs = [
  { label: '系统', icon: 'i-lucide-server', value: 'system', slot: 'system' },
  { label: '种子工具', icon: 'i-lucide-wrench', value: 'torrent', slot: 'torrent' },
  { label: '元数据', icon: 'i-lucide-file-json', value: 'metadata', slot: 'metadata' },
  { label: 'RSS 规则', icon: 'i-lucide-list-filter', value: 'rss', slot: 'rss' },
  { label: '制种', icon: 'i-lucide-package-plus', value: 'creator', slot: 'creator' },
  { label: '客户端数据', icon: 'i-lucide-database', value: 'client', slot: 'client' },
]

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function errorText(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response
  if (response?.status === 404) return '当前 qBittorrent 版本不支持此接口'
  if (typeof response?.data === 'string' && response.data.trim()) return response.data
  return error instanceof Error ? error.message : '请求失败'
}

// System
const systemLoading = ref(false)
const webApiVersion = ref('')
const buildInfo = ref<BuildInfo | null>(null)
const processInfo = ref<ProcessInfo | null>(null)
const defaultSavePath = ref('')
const directoryPath = ref('')
const directoryEntries = ref<DirectoryEntry[]>([])
const freeSpace = ref<number | null>(null)
const interfaces = ref<NetworkInterface[]>([])
const selectedInterface = ref('__all__')
const interfaceAddresses = ref<string[]>([])
const cookiesJson = ref('[]')
const globalDlKiB = ref(0)
const globalUpKiB = ref(0)
const altMode = ref(false)

const interfaceItems = computed(() => [
  { label: '全部接口', value: '__all__' },
  ...interfaces.value.map((item) => ({ label: item.name, value: item.value })),
])

async function loadSystem() {
  systemLoading.value = true
  try {
    const [apiVersion, build, process, savePath, network, cookies, dl, up, mode] =
      await Promise.all([
        getWebApiVersion(),
        getBuildInfo(),
        getProcessInfo(),
        getDefaultSavePath(),
        getNetworkInterfaces(),
        getCookies(),
        getGlobalDownloadLimit(),
        getGlobalUploadLimit(),
        getAlternativeSpeedLimitsMode(),
      ])
    webApiVersion.value = apiVersion
    buildInfo.value = build
    processInfo.value = process
    defaultSavePath.value = savePath
    if (!directoryPath.value) directoryPath.value = savePath
    interfaces.value = network
    cookiesJson.value = JSON.stringify(cookies, null, 2)
    globalDlKiB.value = Math.round(dl / 1024)
    globalUpKiB.value = Math.round(up / 1024)
    altMode.value = mode
    await loadInterfaceAddresses()
  } catch (error) {
    toast.add({ title: '系统信息加载失败', description: errorText(error), color: 'error' })
  } finally {
    systemLoading.value = false
  }
}

async function browseDirectory() {
  const path = directoryPath.value.trim()
  if (!path) return
  try {
    directoryEntries.value = await getDirectoryContent(path, { withMetadata: true })
    try {
      freeSpace.value = await getFreeSpaceAtPath(path)
    } catch {
      freeSpace.value = null
    }
  } catch (error) {
    toast.add({ title: '目录读取失败', description: errorText(error), color: 'error' })
  }
}

async function loadInterfaceAddresses() {
  try {
    interfaceAddresses.value = await getNetworkInterfaceAddresses(
      selectedInterface.value === '__all__' ? '' : selectedInterface.value,
    )
  } catch (error) {
    toast.add({ title: '网络地址读取失败', description: errorText(error), color: 'error' })
  }
}

async function saveSystemControls() {
  try {
    await Promise.all([
      setGlobalDownloadLimit(globalDlKiB.value * 1024),
      setGlobalUploadLimit(globalUpKiB.value * 1024),
      setAlternativeSpeedLimitsMode(altMode.value),
      setCookies(JSON.parse(cookiesJson.value) as QbtCookie[]),
    ])
    toast.add({ title: '系统控制已保存', color: 'success' })
  } catch (error) {
    toast.add({ title: '保存失败', description: errorText(error), color: 'error' })
  }
}

// Torrent tools
const selectedHash = ref('')
const torrentLoading = ref(false)
const properties = ref<TorrentProperties | null>(null)
const webSeeds = ref<TorrentWebSeed[]>([])
const sslParameters = ref<SSLParameters | null>(null)
const pieceSummary = ref({ total: 0, downloaded: 0, available: 0, hashes: 0 })
const torrentForm = ref({
  comment: '',
  savePath: '',
  downloadPath: '',
  downloadLimitKiB: 0,
  uploadLimitKiB: 0,
  ratioLimit: -2,
  seedingTimeLimit: -2,
  inactiveSeedingTimeLimit: -2,
  autoManagement: false,
  peer: '',
  webSeed: '',
})
const editingWebSeed = ref('')

const torrentItems = computed(() =>
  store.torrents.map((torrent) => ({ label: torrent.name, value: torrent.hash })),
)

async function loadTorrentTools() {
  if (!selectedHash.value) return
  torrentLoading.value = true
  try {
    const [props, seeds, ssl, states, availability, hashes, dl, up] = await Promise.all([
      getTorrentProperties(selectedHash.value),
      getTorrentWebSeeds(selectedHash.value),
      getTorrentSSLParameters(selectedHash.value),
      getTorrentPieceStates(selectedHash.value),
      getTorrentPieceAvailability(selectedHash.value),
      getTorrentPieceHashes(selectedHash.value),
      getTorrentsDownloadLimit([selectedHash.value]),
      getTorrentsUploadLimit([selectedHash.value]),
    ])
    const torrent = store.torrents.find((item) => item.hash === selectedHash.value)
    properties.value = props
    webSeeds.value = seeds
    sslParameters.value = ssl
    pieceSummary.value = {
      total: states.length,
      downloaded: states.filter((state) => state === 2).length,
      available: availability.filter((count) => count > 0).length,
      hashes: hashes.length,
    }
    torrentForm.value.comment = props.comment ?? ''
    torrentForm.value.savePath = props.save_path ?? ''
    torrentForm.value.downloadPath = torrent?.download_path ?? ''
    torrentForm.value.downloadLimitKiB = Math.max(0, Math.round((dl[selectedHash.value] ?? 0) / 1024))
    torrentForm.value.uploadLimitKiB = Math.max(0, Math.round((up[selectedHash.value] ?? 0) / 1024))
    torrentForm.value.autoManagement = torrent?.auto_tmm ?? false
  } catch (error) {
    toast.add({ title: '种子工具加载失败', description: errorText(error), color: 'error' })
  } finally {
    torrentLoading.value = false
  }
}

async function saveTorrentTools() {
  if (!selectedHash.value) return
  const hashes = [selectedHash.value]
  try {
    await Promise.all([
      setTorrentsComment(hashes, torrentForm.value.comment),
      setTorrentsSavePath(hashes, torrentForm.value.savePath),
      setTorrentsDownloadPath(hashes, torrentForm.value.downloadPath),
      setTorrentsDownloadLimit(hashes, torrentForm.value.downloadLimitKiB * 1024),
      setTorrentsUploadLimit(hashes, torrentForm.value.uploadLimitKiB * 1024),
      setTorrentsShareLimits(hashes, {
        ratioLimit: torrentForm.value.ratioLimit,
        seedingTimeLimit: torrentForm.value.seedingTimeLimit,
        inactiveSeedingTimeLimit: torrentForm.value.inactiveSeedingTimeLimit,
      }),
      setAutomaticTorrentManagement(hashes, torrentForm.value.autoManagement),
    ])
    await store.fetchTorrents()
    await loadTorrentTools()
    toast.add({ title: '种子高级设置已保存', color: 'success' })
  } catch (error) {
    toast.add({ title: '保存失败', description: errorText(error), color: 'error' })
  }
}

async function addPeer() {
  const peer = torrentForm.value.peer.trim()
  if (!selectedHash.value || !peer) return
  try {
    await addPeers([selectedHash.value], [peer])
    torrentForm.value.peer = ''
    toast.add({ title: 'Peer 已提交', color: 'success' })
  } catch (error) {
    toast.add({ title: '添加 Peer 失败', description: errorText(error), color: 'error' })
  }
}

async function addWebSeed() {
  const url = torrentForm.value.webSeed.trim()
  if (!selectedHash.value || !url) return
  try {
    await addTorrentWebSeeds(selectedHash.value, [url])
    torrentForm.value.webSeed = ''
    await loadTorrentTools()
  } catch (error) {
    toast.add({ title: '添加 Web Seed 失败', description: errorText(error), color: 'error' })
  }
}

async function updateWebSeed(oldUrl: string) {
  const newUrl = editingWebSeed.value.trim()
  if (!selectedHash.value || !newUrl) return
  try {
    await editTorrentWebSeed(selectedHash.value, oldUrl, newUrl)
    editingWebSeed.value = ''
    await loadTorrentTools()
  } catch (error) {
    toast.add({ title: '修改 Web Seed 失败', description: errorText(error), color: 'error' })
  }
}

async function removeWebSeed(url: string) {
  if (!selectedHash.value) return
  try {
    await removeTorrentWebSeeds(selectedHash.value, [url])
    await loadTorrentTools()
  } catch (error) {
    toast.add({ title: '删除 Web Seed 失败', description: errorText(error), color: 'error' })
  }
}

// Metadata
const metadataSource = ref('')
const metadataResult = ref('')
const metadataFiles = ref<File[]>([])
const metadataLoading = ref(false)

function handleMetadataFiles(event: Event) {
  metadataFiles.value = Array.from((event.target as HTMLInputElement).files ?? [])
}

async function fetchMetadata() {
  if (!metadataSource.value.trim()) return
  metadataLoading.value = true
  try {
    const result = await fetchTorrentMetadata(metadataSource.value.trim())
    metadataResult.value = JSON.stringify(result, null, 2)
    toast.add({ title: '元数据请求已提交', color: 'success' })
  } catch (error) {
    toast.add({ title: '获取元数据失败', description: errorText(error), color: 'error' })
  } finally {
    metadataLoading.value = false
  }
}

async function parseMetadata() {
  if (!metadataFiles.value.length) return
  metadataLoading.value = true
  try {
    const result = await parseTorrentMetadata(metadataFiles.value)
    metadataResult.value = JSON.stringify(result, null, 2)
  } catch (error) {
    toast.add({ title: '解析失败', description: errorText(error), color: 'error' })
  } finally {
    metadataLoading.value = false
  }
}

async function saveMetadata() {
  if (!metadataSource.value.trim()) return
  try {
    const blob = await saveTorrentMetadata(metadataSource.value.trim())
    downloadBlob(blob, 'metadata.torrent')
  } catch (error) {
    toast.add({ title: '保存元数据失败', description: errorText(error), color: 'error' })
  }
}

// RSS rules
const rssRules = ref<Record<string, RSSRule>>({})
const selectedRule = ref('__new__')
const rssRuleForm = ref({
  name: '',
  enabled: false,
  mustContain: '',
  mustNotContain: '',
  useRegex: false,
  addPaused: false,
  assignCategory: '',
  savePath: '',
  feeds: '',
})
const matchingArticles = ref<Record<string, string[]>>({})

const rssRuleItems = computed(() => [
  { label: '新建规则', value: '__new__' },
  ...Object.keys(rssRules.value).map((name) => ({ label: name, value: name })),
])

async function loadRssRules() {
  try {
    rssRules.value = await getRssRules()
  } catch (error) {
    toast.add({ title: 'RSS 规则加载失败', description: errorText(error), color: 'error' })
  }
}

function populateRule() {
  const ruleName = selectedRule.value === '__new__' ? '' : selectedRule.value
  const rule = rssRules.value[ruleName]
  rssRuleForm.value = {
    name: ruleName,
    enabled: rule?.enabled ?? false,
    mustContain: rule?.mustContain ?? '',
    mustNotContain: rule?.mustNotContain ?? '',
    useRegex: rule?.useRegex ?? false,
    addPaused: rule?.addPaused ?? false,
    assignCategory: rule?.assignCategory ?? '',
    savePath: rule?.savePath ?? '',
    feeds: (rule?.affectedFeeds ?? []).join('\n'),
  }
  matchingArticles.value = {}
}

async function saveRule() {
  const name = rssRuleForm.value.name.trim()
  if (!name) return
  try {
    const definition: RSSRule = {
      enabled: rssRuleForm.value.enabled,
      mustContain: rssRuleForm.value.mustContain,
      mustNotContain: rssRuleForm.value.mustNotContain,
      useRegex: rssRuleForm.value.useRegex,
      addPaused: rssRuleForm.value.addPaused,
      assignCategory: rssRuleForm.value.assignCategory,
      savePath: rssRuleForm.value.savePath,
      affectedFeeds: rssRuleForm.value.feeds.split('\n').map((item) => item.trim()).filter(Boolean),
    }
    await setRssRule(name, definition)
    if (selectedRule.value !== '__new__' && selectedRule.value !== name) {
      await renameRssRule(selectedRule.value, name)
    }
    selectedRule.value = name
    await loadRssRules()
    toast.add({ title: 'RSS 规则已保存', color: 'success' })
  } catch (error) {
    toast.add({ title: '规则保存失败', description: errorText(error), color: 'error' })
  }
}

async function cloneRule() {
  const source = selectedRule.value
  const cloneName = `${source}-副本`
  if (source === '__new__') return
  try {
    await cloneRssRule(source, cloneName)
    await loadRssRules()
    selectedRule.value = cloneName
    populateRule()
  } catch (error) {
    toast.add({ title: '克隆失败', description: errorText(error), color: 'error' })
  }
}

async function deleteRule() {
  if (selectedRule.value === '__new__') return
  try {
    await removeRssRule(selectedRule.value)
    selectedRule.value = '__new__'
    populateRule()
    await loadRssRules()
  } catch (error) {
    toast.add({ title: '删除失败', description: errorText(error), color: 'error' })
  }
}

async function previewRule() {
  if (selectedRule.value === '__new__') return
  try {
    matchingArticles.value = await getMatchingRssArticles(selectedRule.value)
  } catch (error) {
    toast.add({ title: '匹配预览失败', description: errorText(error), color: 'error' })
  }
}

// Torrent creator
const creatorForm = ref({
  sourcePath: '',
  torrentFilePath: '',
  comment: '',
  trackers: '',
  urlSeeds: '',
  pieceSize: 0,
  private: false,
  ignoreDotFiles: true,
  startSeeding: false,
  format: 'v1' as 'v1' | 'v2' | 'hybrid',
})
const creatorTasks = ref<TorrentCreatorTask[]>([])
const creatorLoading = ref(false)

async function loadCreatorTasks() {
  try {
    creatorTasks.value = await getTorrentCreatorTasks()
  } catch (error) {
    toast.add({ title: '制种任务加载失败', description: errorText(error), color: 'error' })
  }
}

async function createTorrentTask() {
  if (!creatorForm.value.sourcePath.trim()) return
  creatorLoading.value = true
  try {
    await addTorrentCreatorTask({
      sourcePath: creatorForm.value.sourcePath.trim(),
      torrentFilePath: creatorForm.value.torrentFilePath.trim() || undefined,
      comment: creatorForm.value.comment,
      trackers: creatorForm.value.trackers.split('\n').map((item) => item.trim()).filter(Boolean),
      urlSeeds: creatorForm.value.urlSeeds.split('\n').map((item) => item.trim()).filter(Boolean),
      pieceSize: creatorForm.value.pieceSize || undefined,
      private: creatorForm.value.private,
      ignoreDotFiles: creatorForm.value.ignoreDotFiles,
      startSeeding: creatorForm.value.startSeeding,
      format: creatorForm.value.format,
    })
    await loadCreatorTasks()
    toast.add({ title: '制种任务已创建', color: 'success' })
  } catch (error) {
    toast.add({ title: '创建失败', description: errorText(error), color: 'error' })
  } finally {
    creatorLoading.value = false
  }
}

async function downloadCreatedTorrent(task: TorrentCreatorTask) {
  try {
    const blob = await getCreatedTorrentFile(task.taskID)
    downloadBlob(blob, `${task.sourcePath.split(/[\\/]/).pop() || 'created'}.torrent`)
  } catch (error) {
    toast.add({ title: '下载失败', description: errorText(error), color: 'error' })
  }
}

async function deleteCreatorTask(taskID: string) {
  try {
    await deleteTorrentCreatorTask(taskID)
    await loadCreatorTasks()
  } catch (error) {
    toast.add({ title: '删除失败', description: errorText(error), color: 'error' })
  }
}

// Client data
const clientKeys = ref('')
const clientDataJson = ref('{}')

async function loadStoredClientData() {
  try {
    const keys = clientKeys.value.split(',').map((item) => item.trim()).filter(Boolean)
    const data = await loadClientData(keys.length ? keys : undefined)
    clientDataJson.value = JSON.stringify(data, null, 2)
  } catch (error) {
    toast.add({ title: '客户端数据加载失败', description: errorText(error), color: 'error' })
  }
}

async function saveStoredClientData() {
  try {
    await storeClientData(JSON.parse(clientDataJson.value) as Record<string, unknown>)
    toast.add({ title: '客户端数据已保存', color: 'success' })
  } catch (error) {
    toast.add({ title: '保存失败', description: errorText(error), color: 'error' })
  }
}

watch(selectedInterface, () => void loadInterfaceAddresses())
watch(selectedHash, () => void loadTorrentTools())
watch(selectedRule, populateRule)

onMounted(async () => {
  await Promise.all([store.fetchTorrents(), loadSystem(), loadRssRules(), loadCreatorTasks()])
  if (!selectedHash.value && store.torrents.length) selectedHash.value = store.torrents[0]!.hash
})
</script>

<template>
  <div class="mx-auto h-full max-w-[1500px] overflow-y-auto px-4 py-5 sm:px-7">
    <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">高级工具</h1>
        <p class="mt-1 text-sm text-muted">管理 qBittorrent 的高级任务与诊断数据</p>
      </div>
      <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" @click="loadSystem">
        刷新系统信息
      </UButton>
    </div>

    <UTabs v-model="activeTab" :items="tabs" class="w-full">
      <template #system>
        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <UCard>
            <template #header><h2 class="font-semibold">运行环境</h2></template>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><span class="text-muted">Web API</span><p>{{ webApiVersion || '-' }}</p></div>
              <div><span class="text-muted">启动时间</span><p>{{ processInfo ? formatTimestamp(processInfo.launch_time) : '-' }}</p></div>
              <div v-for="(value, key) in buildInfo" :key="key">
                <span class="text-muted">{{ key }}</span><p>{{ value }}</p>
              </div>
            </div>
          </UCard>
          <UCard>
            <template #header><h2 class="font-semibold">全局传输</h2></template>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="下载限速（KiB/s）"><UInputNumber v-model="globalDlKiB" :min="0" class="w-full" /></UFormField>
              <UFormField label="上传限速（KiB/s）"><UInputNumber v-model="globalUpKiB" :min="0" class="w-full" /></UFormField>
              <UFormField label="备用限速"><USwitch v-model="altMode" /></UFormField>
            </div>
          </UCard>
          <UCard class="lg:col-span-2">
            <template #header><h2 class="font-semibold">目录浏览</h2></template>
            <div class="flex gap-2">
              <UInput v-model="directoryPath" :placeholder="defaultSavePath" class="min-w-0 flex-1" />
              <UButton icon="i-lucide-folder-open" @click="browseDirectory">读取</UButton>
            </div>
            <p class="mt-2 text-xs text-muted">可用空间：{{ freeSpace == null ? '接口不可用' : formatSize(freeSpace) }}</p>
            <div class="mt-3 max-h-64 overflow-auto rounded-md border border-default">
              <div v-for="entry in directoryEntries" :key="entry.name" class="flex items-center gap-2 border-b border-default px-3 py-2 text-sm last:border-0">
                <UIcon :name="entry.type === 'dir' ? 'i-lucide-folder' : 'i-lucide-file'" class="size-4 text-muted" />
                <span class="min-w-0 flex-1 truncate">{{ entry.name }}</span>
                <span v-if="entry.size != null" class="text-xs text-muted">{{ formatSize(entry.size) }}</span>
              </div>
            </div>
          </UCard>
          <UCard>
            <template #header><h2 class="font-semibold">网络接口</h2></template>
            <USelect v-model="selectedInterface" :items="interfaceItems" class="w-full" />
            <div class="mt-3 flex flex-wrap gap-2">
              <UBadge v-for="address in interfaceAddresses" :key="address" color="neutral" variant="soft">{{ address }}</UBadge>
            </div>
          </UCard>
          <UCard>
            <template #header><h2 class="font-semibold">下载 Cookie</h2></template>
            <UTextarea v-model="cookiesJson" :rows="8" class="w-full font-mono text-xs" />
          </UCard>
          <div class="flex justify-end lg:col-span-2">
            <UButton icon="i-lucide-save" :loading="systemLoading" @click="saveSystemControls">保存系统控制</UButton>
          </div>
        </div>
      </template>

      <template #torrent>
        <div class="mt-4 space-y-4">
          <USelect v-model="selectedHash" :items="torrentItems" placeholder="选择种子" class="w-full max-w-xl" />
          <template v-if="selectedHash">
            <div class="grid gap-4 lg:grid-cols-2">
              <UCard>
                <template #header><h2 class="font-semibold">路径与行为</h2></template>
                <div class="space-y-4">
                  <UFormField label="保存路径"><UInput v-model="torrentForm.savePath" class="w-full" /></UFormField>
                  <UFormField label="下载路径"><UInput v-model="torrentForm.downloadPath" class="w-full" /></UFormField>
                  <UFormField label="评论"><UTextarea v-model="torrentForm.comment" :rows="3" class="w-full" /></UFormField>
                  <UFormField label="自动种子管理"><USwitch v-model="torrentForm.autoManagement" /></UFormField>
                </div>
              </UCard>
              <UCard>
                <template #header><h2 class="font-semibold">限速与分享</h2></template>
                <div class="grid gap-4 sm:grid-cols-2">
                  <UFormField label="下载限速（KiB/s）"><UInputNumber v-model="torrentForm.downloadLimitKiB" :min="0" class="w-full" /></UFormField>
                  <UFormField label="上传限速（KiB/s）"><UInputNumber v-model="torrentForm.uploadLimitKiB" :min="0" class="w-full" /></UFormField>
                  <UFormField label="分享率限制"><UInputNumber v-model="torrentForm.ratioLimit" :step="0.1" class="w-full" /></UFormField>
                  <UFormField label="做种分钟"><UInputNumber v-model="torrentForm.seedingTimeLimit" class="w-full" /></UFormField>
                  <UFormField label="不活跃分钟"><UInputNumber v-model="torrentForm.inactiveSeedingTimeLimit" class="w-full" /></UFormField>
                </div>
              </UCard>
            </div>
            <div class="grid gap-4 lg:grid-cols-3">
              <UCard>
                <template #header><h2 class="font-semibold">分片</h2></template>
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div><span class="text-muted">总数</span><p>{{ pieceSummary.total }}</p></div>
                  <div><span class="text-muted">已下载</span><p>{{ pieceSummary.downloaded }}</p></div>
                  <div><span class="text-muted">可获取</span><p>{{ pieceSummary.available }}</p></div>
                  <div><span class="text-muted">Hash</span><p>{{ pieceSummary.hashes }}</p></div>
                </div>
              </UCard>
              <UCard>
                <template #header><h2 class="font-semibold">添加 Peer</h2></template>
                <div class="flex gap-2"><UInput v-model="torrentForm.peer" placeholder="IP:端口" class="min-w-0 flex-1" /><UButton icon="i-lucide-plus" @click="addPeer" /></div>
              </UCard>
              <UCard>
                <template #header><h2 class="font-semibold">SSL</h2></template>
                <div class="text-sm text-muted">
                  <p>证书：{{ sslParameters?.ssl_certificate ? '已配置' : '未配置' }}</p>
                  <p>私钥：{{ sslParameters?.ssl_private_key ? '已配置' : '未配置' }}</p>
                  <p>DH 参数：{{ sslParameters?.ssl_dh_params ? '已配置' : '未配置' }}</p>
                </div>
              </UCard>
            </div>
            <UCard>
              <template #header><h2 class="font-semibold">Web Seed</h2></template>
              <div class="mb-3 flex gap-2"><UInput v-model="torrentForm.webSeed" placeholder="https://example.com/content" class="min-w-0 flex-1" /><UButton icon="i-lucide-plus" @click="addWebSeed">添加</UButton></div>
              <div v-for="seed in webSeeds" :key="seed.url" class="flex items-center gap-2 border-t border-default py-2">
                <UInput v-if="editingWebSeed === seed.url" v-model="torrentForm.webSeed" class="min-w-0 flex-1" />
                <span v-else class="min-w-0 flex-1 truncate text-sm">{{ seed.url }}</span>
                <UButton v-if="editingWebSeed === seed.url" icon="i-lucide-check" color="success" variant="ghost" @click="updateWebSeed(seed.url)" />
                <UButton v-else icon="i-lucide-pencil" color="neutral" variant="ghost" @click="editingWebSeed = seed.url; torrentForm.webSeed = seed.url" />
                <UButton icon="i-lucide-trash" color="error" variant="ghost" @click="removeWebSeed(seed.url)" />
              </div>
            </UCard>
            <div class="flex justify-end"><UButton icon="i-lucide-save" :loading="torrentLoading" @click="saveTorrentTools">保存种子设置</UButton></div>
          </template>
        </div>
      </template>

      <template #metadata>
        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <UCard>
            <template #header><h2 class="font-semibold">远程元数据</h2></template>
            <UInput v-model="metadataSource" placeholder="Magnet 或 .torrent URL" class="w-full" />
            <div class="mt-3 flex gap-2"><UButton :loading="metadataLoading" @click="fetchMetadata">获取</UButton><UButton color="neutral" variant="soft" @click="saveMetadata">下载 .torrent</UButton></div>
          </UCard>
          <UCard>
            <template #header><h2 class="font-semibold">本地解析</h2></template>
            <input type="file" accept=".torrent,application/x-bittorrent" multiple class="block w-full text-sm" @change="handleMetadataFiles" />
            <UButton class="mt-3" :disabled="!metadataFiles.length" :loading="metadataLoading" @click="parseMetadata">解析文件</UButton>
          </UCard>
          <UCard class="lg:col-span-2"><UTextarea v-model="metadataResult" :rows="18" readonly class="w-full font-mono text-xs" /></UCard>
        </div>
      </template>

      <template #rss>
        <div class="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
          <UCard>
            <USelect v-model="selectedRule" :items="rssRuleItems" class="w-full" />
            <div class="mt-3 flex gap-2"><UButton color="neutral" variant="soft" :disabled="selectedRule === '__new__'" @click="cloneRule">克隆</UButton><UButton color="error" variant="soft" :disabled="selectedRule === '__new__'" @click="deleteRule">删除</UButton></div>
          </UCard>
          <UCard>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="规则名称"><UInput v-model="rssRuleForm.name" class="w-full" /></UFormField>
              <UFormField label="启用"><USwitch v-model="rssRuleForm.enabled" /></UFormField>
              <UFormField label="必须包含"><UInput v-model="rssRuleForm.mustContain" class="w-full" /></UFormField>
              <UFormField label="不得包含"><UInput v-model="rssRuleForm.mustNotContain" class="w-full" /></UFormField>
              <UFormField label="正则表达式"><USwitch v-model="rssRuleForm.useRegex" /></UFormField>
              <UFormField label="添加后停止"><USwitch v-model="rssRuleForm.addPaused" /></UFormField>
              <UFormField label="分类"><UInput v-model="rssRuleForm.assignCategory" class="w-full" /></UFormField>
              <UFormField label="保存路径"><UInput v-model="rssRuleForm.savePath" class="w-full" /></UFormField>
              <UFormField label="Feed URL（每行一个）" class="sm:col-span-2"><UTextarea v-model="rssRuleForm.feeds" :rows="4" class="w-full" /></UFormField>
            </div>
            <div class="mt-4 flex justify-end gap-2"><UButton color="neutral" variant="soft" :disabled="selectedRule === '__new__'" @click="previewRule">匹配预览</UButton><UButton icon="i-lucide-save" @click="saveRule">保存规则</UButton></div>
          </UCard>
          <UCard v-if="Object.keys(matchingArticles).length" class="lg:col-start-2">
            <div v-for="(articles, feed) in matchingArticles" :key="feed" class="mb-3 last:mb-0"><h3 class="font-medium">{{ feed }}</h3><p v-for="article in articles" :key="article" class="mt-1 text-sm text-muted">{{ article }}</p></div>
          </UCard>
        </div>
      </template>

      <template #creator>
        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <UCard>
            <div class="space-y-4">
              <UFormField label="源文件或目录"><UInput v-model="creatorForm.sourcePath" class="w-full" /></UFormField>
              <UFormField label="输出 .torrent 路径"><UInput v-model="creatorForm.torrentFilePath" class="w-full" /></UFormField>
              <UFormField label="Tracker（每行一个）"><UTextarea v-model="creatorForm.trackers" :rows="3" class="w-full" /></UFormField>
              <UFormField label="Web Seed（每行一个）"><UTextarea v-model="creatorForm.urlSeeds" :rows="3" class="w-full" /></UFormField>
              <div class="grid gap-4 sm:grid-cols-2">
                <UFormField label="格式"><USelect v-model="creatorForm.format" :items="[{ label: 'v1', value: 'v1' }, { label: 'v2', value: 'v2' }, { label: 'Hybrid', value: 'hybrid' }]" class="w-full" /></UFormField>
                <UFormField label="分片大小"><UInputNumber v-model="creatorForm.pieceSize" :min="0" class="w-full" /></UFormField>
                <UFormField label="私有种子"><USwitch v-model="creatorForm.private" /></UFormField>
                <UFormField label="忽略隐藏文件"><USwitch v-model="creatorForm.ignoreDotFiles" /></UFormField>
                <UFormField label="完成后做种"><USwitch v-model="creatorForm.startSeeding" /></UFormField>
              </div>
              <UButton block icon="i-lucide-package-plus" :loading="creatorLoading" @click="createTorrentTask">创建任务</UButton>
            </div>
          </UCard>
          <UCard>
            <template #header><div class="flex items-center justify-between"><h2 class="font-semibold">任务</h2><UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" @click="loadCreatorTasks" /></div></template>
            <div v-for="task in creatorTasks" :key="task.taskID" class="border-b border-default py-3 last:border-0">
              <div class="flex items-start gap-2"><div class="min-w-0 flex-1"><p class="truncate font-medium">{{ task.sourcePath }}</p><p class="text-xs text-muted">{{ task.status }} · {{ Math.round((task.progress ?? 0) * 100) }}%</p></div><UButton icon="i-lucide-download" color="neutral" variant="ghost" @click="downloadCreatedTorrent(task)" /><UButton icon="i-lucide-trash" color="error" variant="ghost" @click="deleteCreatorTask(task.taskID)" /></div>
            </div>
            <UEmpty v-if="!creatorTasks.length" icon="i-lucide-package-open" description="暂无制种任务" />
          </UCard>
        </div>
      </template>

      <template #client>
        <div class="mt-4 mx-auto max-w-3xl space-y-4">
          <UFormField label="读取键（逗号分隔）"><UInput v-model="clientKeys" class="w-full" /></UFormField>
          <UTextarea v-model="clientDataJson" :rows="18" class="w-full font-mono text-xs" />
          <div class="flex justify-end gap-2"><UButton color="neutral" variant="soft" @click="loadStoredClientData">读取</UButton><UButton icon="i-lucide-save" @click="saveStoredClientData">保存</UButton></div>
        </div>
      </template>
    </UTabs>
  </div>
</template>
