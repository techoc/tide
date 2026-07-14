import http, { form } from '@/api'
import type {
  AddTorrentParams,
  CategoryParams,
  Torrent,
  TorrentCategory,
  TorrentFile,
  TorrentFilter,
  TorrentHashes,
  TorrentPeers,
  TorrentPieceState,
  TorrentProperties,
  TorrentShareLimits,
  TorrentSort,
  TorrentTracker,
  TorrentWebSeed,
  SSLParameters,
} from '@/types/qbittorrent'

function encodeHashes(hashes: TorrentHashes): string {
  return Array.isArray(hashes) ? hashes.join('|') : hashes
}

/** 获取种子列表 */
export async function getTorrents(params: {
  filter?: TorrentFilter
  sort?: TorrentSort
  reverse?: boolean
  category?: string
  tag?: string
  hashes?: string
  private?: boolean
  includeFiles?: boolean
  includeTrackers?: boolean
  limit?: number
  offset?: number
} = {}): Promise<Torrent[]> {
  const res = await http.get<Torrent[]>('/torrents/info', { params })
  return res.data
}

/** 添加种子（支持 magnet/文件） */
export async function addTorrent(params: AddTorrentParams): Promise<void> {
  const fd = new FormData()
  if (params.urls) fd.append('urls', params.urls)
  if (params.torrents) {
    const files = Array.isArray(params.torrents) ? params.torrents : [params.torrents]
    for (const f of files) fd.append('torrents', f, f.name)
  }
  if (params.savepath) fd.append('savepath', params.savepath)
  if (params.downloadPath) fd.append('downloadPath', params.downloadPath)
  if (params.useDownloadPath !== undefined) fd.append('useDownloadPath', String(params.useDownloadPath))
  if (params.cookie) fd.append('cookie', params.cookie)
  if (params.name) fd.append('rename', params.name)
  if (params.category) fd.append('category', params.category)
  if (params.tags) fd.append('tags', params.tags)
  if (params.skip_checking) fd.append('skip_checking', 'true')
  if (params.paused || params.stopped) {
    fd.append('paused', 'true')
    fd.append('stopped', 'true')
  }
  if (params.forced) fd.append('forced', 'true')
  if (params.addToTopOfQueue !== undefined) fd.append('addToTopOfQueue', String(params.addToTopOfQueue))
  if (params.root_folder !== undefined) fd.append('root_folder', String(params.root_folder))
  if (params.downloadLimit != null) {
    fd.append('downloadLimit', String(params.downloadLimit))
    fd.append('dlLimit', String(params.downloadLimit))
  }
  if (params.uploadLimit != null) {
    fd.append('uploadLimit', String(params.uploadLimit))
    fd.append('upLimit', String(params.uploadLimit))
  }
  if (params.sequentialDownload) fd.append('sequentialDownload', 'true')
  if (params.firstLastPiecePrio) fd.append('firstLastPiecePrio', 'true')
  if (params.autoTMM !== undefined) fd.append('autoTMM', String(params.autoTMM))
  if (params.contentLayout) fd.append('contentLayout', params.contentLayout)
  if (params.stopCondition) fd.append('stopCondition', params.stopCondition)
  if (params.ratioLimit != null) fd.append('ratioLimit', String(params.ratioLimit))
  if (params.seedingTimeLimit != null) fd.append('seedingTimeLimit', String(params.seedingTimeLimit))
  if (params.inactiveSeedingTimeLimit != null) fd.append('inactiveSeedingTimeLimit', String(params.inactiveSeedingTimeLimit))
  if (params.shareLimitsMode) fd.append('shareLimitsMode', params.shareLimitsMode)
  if (params.shareLimitAction) fd.append('shareLimitAction', params.shareLimitAction)
  if (params.filePriorities?.length) fd.append('filePriorities', params.filePriorities.join(','))
  if (params.downloader) fd.append('downloader', params.downloader)
  if (params.ssl_certificate) fd.append('ssl_certificate', params.ssl_certificate)
  if (params.ssl_private_key) fd.append('ssl_private_key', params.ssl_private_key)
  if (params.ssl_dh_params) fd.append('ssl_dh_params', params.ssl_dh_params)

  await http.post('/torrents/add', fd)
}

/** 删除种子 */
export async function deleteTorrents(hashes: TorrentHashes, deleteFiles: boolean): Promise<void> {
  await http.post('/torrents/delete', form({ hashes: encodeHashes(hashes), deleteFiles }))
}

/** 暂停种子（qBittorrent v5: /torrents/stop，兼容 v4: /torrents/pause） */
export async function pauseTorrents(hashes: TorrentHashes): Promise<void> {
  try {
    await http.post('/torrents/stop', form({ hashes: encodeHashes(hashes) }))
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      await http.post('/torrents/pause', form({ hashes: encodeHashes(hashes) }))
    } else {
      throw err
    }
  }
}

/** 恢复种子（qBittorrent v5: /torrents/start，兼容 v4: /torrents/resume） */
export async function resumeTorrents(hashes: TorrentHashes): Promise<void> {
  try {
    await http.post('/torrents/start', form({ hashes: encodeHashes(hashes) }))
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      await http.post('/torrents/resume', form({ hashes: encodeHashes(hashes) }))
    } else {
      throw err
    }
  }
}

/** 强制恢复 */
export async function forceStartTorrents(hashes: TorrentHashes, value: boolean): Promise<void> {
  await http.post('/torrents/setForceStart', form({ hashes: encodeHashes(hashes), value }))
}

/** 重新校验种子数据 */
export async function recheckTorrents(hashes: TorrentHashes): Promise<void> {
  await http.post('/torrents/recheck', form({ hashes: encodeHashes(hashes) }))
}

/** 立即向 Tracker 重新汇报 */
export async function reannounceTorrents(hashes: TorrentHashes, urls?: string[]): Promise<void> {
  await http.post('/torrents/reannounce', form({ hashes: encodeHashes(hashes), urls: urls?.join('|') }))
}

/** 切换顺序下载 */
export async function toggleSequentialDownload(hashes: TorrentHashes): Promise<void> {
  await http.post('/torrents/toggleSequentialDownload', form({ hashes: encodeHashes(hashes) }))
}

/** 切换首尾块优先下载 */
export async function toggleFirstLastPiecePriority(hashes: TorrentHashes): Promise<void> {
  await http.post('/torrents/toggleFirstLastPiecePrio', form({ hashes: encodeHashes(hashes) }))
}

/** 添加标签 */
export async function addTags(hashes: TorrentHashes, tags: string): Promise<void> {
  await http.post('/torrents/addTags', form({ hashes: encodeHashes(hashes), tags }))
}

/** 移除标签 */
export async function removeTags(hashes: TorrentHashes, tags: string): Promise<void> {
  await http.post('/torrents/removeTags', form({ hashes: encodeHashes(hashes), tags }))
}

/** 获取所有标签 */
export async function getTags(): Promise<string[]> {
  const res = await http.get<string[]>('/torrents/tags')
  return res.data
}

/** 删除标签（从 qBittorrent 中移除标签定义） */
export async function deleteTags(tags: string[]): Promise<void> {
  await http.post('/torrents/deleteTags', form({ tags: tags.join(',') }))
}

/** 获取文件列表 */
export async function getTorrentFiles(hash: string, indexes?: number[]): Promise<TorrentFile[]> {
  const res = await http.get<TorrentFile[]>('/torrents/files', {
    params: { hash, indexes: indexes?.join('|') },
  })
  return res.data
}

/** 获取种子通用属性 */
export async function getTorrentProperties(hash: string): Promise<TorrentProperties> {
  const res = await http.get<TorrentProperties>('/torrents/properties', { params: { hash } })
  return res.data
}

/** 获取 Web Seeds */
export async function getTorrentWebSeeds(hash: string): Promise<TorrentWebSeed[]> {
  const res = await http.get<TorrentWebSeed[]>('/torrents/webseeds', { params: { hash } })
  return res.data
}

export async function addTorrentWebSeeds(hash: string, urls: string[]): Promise<void> {
  await http.post('/torrents/addWebSeeds', form({ hash, urls: urls.join('|') }))
}

export async function editTorrentWebSeed(hash: string, oldUrl: string, newUrl: string): Promise<void> {
  await http.post('/torrents/editWebSeed', form({ hash, origUrl: oldUrl, newUrl }))
}

export async function removeTorrentWebSeeds(hash: string, urls: string[]): Promise<void> {
  await http.post('/torrents/removeWebSeeds', form({ hash, urls: urls.join('|') }))
}

export async function getTorrentPieceStates(hash: string): Promise<TorrentPieceState[]> {
  const res = await http.get<TorrentPieceState[]>('/torrents/pieceStates', { params: { hash } })
  return res.data
}

export async function getTorrentPieceHashes(hash: string): Promise<string[]> {
  const res = await http.get<string[]>('/torrents/pieceHashes', { params: { hash } })
  return res.data
}

export async function getTorrentPieceAvailability(hash: string): Promise<number[]> {
  const res = await http.get<number[]>('/torrents/pieceAvailability', { params: { hash } })
  return res.data
}

/** 获取 Tracker 列表 */
export async function getTorrentTrackers(hash: string): Promise<TorrentTracker[]> {
  const res = await http.get<TorrentTracker[]>('/torrents/trackers', { params: { hash } })
  return res.data
}

/** 获取对等方（/sync/torrentPeers） */
export async function getTorrentPeers(hash: string): Promise<TorrentPeers> {
  const res = await http.get<TorrentPeers>('/sync/torrentPeers', { params: { hash } })
  return res.data
}

/** 设置文件优先级 (0=跳过, 1=普通, 6=高, 7=最高) */
export async function setFilePriority(
  hash: string,
  indexes: number[],
  priority: 0 | 1 | 6 | 7,
): Promise<void> {
  await http.post(
    '/torrents/filePrio',
    form({ hash, id: indexes.join('|'), priority }),
  )
}

/** 增量同步主数据 */
export async function getSyncMaindata(rid?: number): Promise<unknown> {
  const res = await http.get('/sync/maindata', { params: { rid } })
  return res.data
}

/** 获取符合筛选条件的种子数量（qBittorrent v5） */
export async function getTorrentCount(params: Record<string, unknown> = {}): Promise<number> {
  const res = await http.get<number>('/torrents/count', { params })
  return Number(res.data)
}

// ===== 分类管理 =====

/** 获取所有分类（返回对象，key 为分类名） */
export async function getCategories(): Promise<TorrentCategory[]> {
  return Object.values(await getCategoriesMap())
}

/** 获取分类原始映射，key 为分类名。 */
export async function getCategoriesMap(): Promise<Record<string, TorrentCategory>> {
  const res = await http.get<Record<string, TorrentCategory>>('/torrents/categories')
  return res.data
}

/** 创建分类 */
export async function createCategory(params: CategoryParams): Promise<void> {
  await http.post('/torrents/createCategory', form({
    category: params.category,
    savePath: params.savePath,
    downloadPath: params.downloadPath,
    downloadPathEnabled: params.enable,
  }))
}

/** 编辑分类 */
export async function editCategory(params: CategoryParams): Promise<void> {
  await http.post('/torrents/editCategory', form({
    category: params.category,
    savePath: params.savePath ?? '',
    downloadPath: params.downloadPath,
    downloadPathEnabled: params.enable,
  }))
}

/** 删除分类（removeCategories 接收逗号分隔的分类名） */
export async function removeCategories(categories: string[]): Promise<void> {
  await http.post('/torrents/removeCategories', form({ categories: categories.join('\n') }))
}

/** 设置种子的分类 */
export async function setTorrentsCategory(hashes: TorrentHashes, category: string): Promise<void> {
  await http.post('/torrents/setCategory', form({ hashes: encodeHashes(hashes), category }))
}

// ===== 限速与位置 =====

/** 设置种子下载限速（单位 bytes/s，0 表示不限速） */
export async function setTorrentsDownloadLimit(hashes: TorrentHashes, limit: number): Promise<void> {
  await http.post('/torrents/setDownloadLimit', form({ hashes: encodeHashes(hashes), limit }))
}

/** 设置种子上传限速（单位 bytes/s，0 表示不限速） */
export async function setTorrentsUploadLimit(hashes: TorrentHashes, limit: number): Promise<void> {
  await http.post('/torrents/setUploadLimit', form({ hashes: encodeHashes(hashes), limit }))
}

export async function getTorrentsDownloadLimit(hashes: TorrentHashes): Promise<Record<string, number>> {
  const res = await http.get<Record<string, number>>('/torrents/downloadLimit', {
    params: { hashes: encodeHashes(hashes) },
  })
  return res.data
}

export async function getTorrentsUploadLimit(hashes: TorrentHashes): Promise<Record<string, number>> {
  const res = await http.get<Record<string, number>>('/torrents/uploadLimit', {
    params: { hashes: encodeHashes(hashes) },
  })
  return res.data
}

export async function setTorrentsShareLimits(
  hashes: TorrentHashes,
  limits: TorrentShareLimits & { shareLimitsMode?: string; shareLimitAction?: string },
): Promise<void> {
  await http.post('/torrents/setShareLimits', form({
    hashes: encodeHashes(hashes),
    ratioLimit: limits.ratioLimit ?? -2,
    seedingTimeLimit: limits.seedingTimeLimit ?? -2,
    inactiveSeedingTimeLimit: limits.inactiveSeedingTimeLimit ?? -2,
    shareLimitsMode: limits.shareLimitsMode ?? 'Default',
    shareLimitAction: limits.shareLimitAction ?? 'Default',
  }))
}

/** 设置种子保存路径（move 操作） */
export async function setTorrentsLocation(hashes: TorrentHashes, location: string): Promise<void> {
  await http.post('/torrents/setLocation', form({ hashes: encodeHashes(hashes), location }))
}

export async function setTorrentsSavePath(hashes: TorrentHashes, path: string): Promise<void> {
  await http.post('/torrents/setSavePath', form({ id: encodeHashes(hashes), path }))
}

export async function setTorrentsDownloadPath(hashes: TorrentHashes, path: string): Promise<void> {
  await http.post('/torrents/setDownloadPath', form({ id: encodeHashes(hashes), path }))
}

export async function setTorrentsComment(hashes: TorrentHashes, comment: string): Promise<void> {
  await http.post('/torrents/setComment', form({ hashes: encodeHashes(hashes), comment }))
}

export async function setAutomaticTorrentManagement(hashes: TorrentHashes, enable: boolean): Promise<void> {
  await http.post('/torrents/setAutoManagement', form({ hashes: encodeHashes(hashes), enable }))
}

export async function setSuperSeeding(hashes: TorrentHashes, value: boolean): Promise<void> {
  await http.post('/torrents/setSuperSeeding', form({ hashes: encodeHashes(hashes), value }))
}

async function changeQueuePriority(endpoint: string, hashes: TorrentHashes): Promise<void> {
  await http.post(`/torrents/${endpoint}`, form({ hashes: encodeHashes(hashes) }))
}

export const increaseTorrentPriority = (hashes: TorrentHashes) => changeQueuePriority('increasePrio', hashes)
export const decreaseTorrentPriority = (hashes: TorrentHashes) => changeQueuePriority('decreasePrio', hashes)
export const setTorrentTopPriority = (hashes: TorrentHashes) => changeQueuePriority('topPrio', hashes)
export const setTorrentBottomPriority = (hashes: TorrentHashes) => changeQueuePriority('bottomPrio', hashes)

// ===== 导出与重命名 =====

/** 导出 .torrent 文件（返回 Blob） */
export async function exportTorrent(hash: string): Promise<Blob> {
  const res = await http.get('/torrents/export', {
    params: { hash },
    responseType: 'blob',
  })
  return res.data as unknown as Blob
}

/** 重命名种子 */
export async function renameTorrent(hash: string, name: string): Promise<void> {
  await http.post('/torrents/rename', form({ hash, name }))
}

// ===== Tracker 管理 =====

/** 添加 Tracker */
export async function addTrackers(hash: string, urls: string): Promise<void> {
  await http.post('/torrents/addTrackers', form({ hash, urls }))
}

/** 删除 Tracker */
export async function removeTrackers(hash: string, urls: string): Promise<void> {
  await http.post('/torrents/removeTrackers', form({ hash, urls }))
}

/** 修改 Tracker URL */
export async function editTracker(hash: string, oldUrl: string, newUrl?: string, tier?: number): Promise<void> {
  await http.post('/torrents/editTracker', form({ hash, url: oldUrl, origUrl: oldUrl, newUrl, tier }))
}

export async function addPeers(hashes: TorrentHashes, peers: string[]): Promise<void> {
  await http.post('/torrents/addPeers', form({ hashes: encodeHashes(hashes), peers: peers.join('|') }))
}

export async function createTags(tags: string[]): Promise<void> {
  await http.post('/torrents/createTags', form({ tags: tags.join(',') }))
}

export async function setTags(hashes: TorrentHashes, tags: string[]): Promise<void> {
  await http.post('/torrents/setTags', form({ hashes: encodeHashes(hashes), tags: tags.join(',') }))
}

/** 重命名种子文件 */
export async function renameFile(hash: string, oldPath: string, newPath: string): Promise<void> {
  await http.post('/torrents/renameFile', form({ hash, oldPath, newPath }))
}

export async function renameFolder(hash: string, oldPath: string, newPath: string): Promise<void> {
  await http.post('/torrents/renameFolder', form({ hash, oldPath, newPath }))
}

export async function getTorrentSSLParameters(hash: string): Promise<SSLParameters> {
  const res = await http.get<SSLParameters>('/torrents/SSLParameters', { params: { hash } })
  return res.data
}

export async function setTorrentSSLParameters(hash: string, params: SSLParameters): Promise<void> {
  await http.post('/torrents/setSSLParameters', form({
    hash,
    ssl_certificate: params.ssl_certificate,
    ssl_private_key: params.ssl_private_key,
    ssl_dh_params: params.ssl_dh_params,
  }))
}

export async function fetchTorrentMetadata(source: string, downloader?: string): Promise<Record<string, unknown>> {
  const res = await http.post<Record<string, unknown>>('/torrents/fetchMetadata', form({ source, downloader }))
  return res.data
}

export async function parseTorrentMetadata(files: File[]): Promise<Array<Record<string, unknown>>> {
  const data = new FormData()
  for (const file of files) data.append('torrents', file, file.name)
  const res = await http.post<Array<Record<string, unknown>>>('/torrents/parseMetadata', data)
  return res.data
}

export async function saveTorrentMetadata(source: string): Promise<Blob> {
  const res = await http.get<Blob>('/torrents/saveMetadata', { params: { source }, responseType: 'blob' })
  return res.data
}

export async function downloadTorrentFile(hash: string, file: number | string): Promise<Blob> {
  const res = await http.get<Blob>('/torrents/downloadFile', {
    params: { hash, file },
    responseType: 'blob',
  })
  return res.data
}
