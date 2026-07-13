import http, { form } from '@/api'
import type {
  AddTorrentParams,
  CategoryParams,
  Torrent,
  TorrentCategory,
  TorrentFile,
  TorrentFilter,
  TorrentPeers,
  TorrentSort,
  TorrentTracker,
} from '@/types/qbittorrent'

/** 获取种子列表 */
export async function getTorrents(params: {
  filter?: TorrentFilter
  sort?: TorrentSort
  reverse?: boolean
  category?: string
  tag?: string
  hashes?: string
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
  if (params.cookie) fd.append('cookie', params.cookie)
  if (params.name) fd.append('rename', params.name)
  if (params.category) fd.append('category', params.category)
  if (params.tags) fd.append('tags', params.tags)
  if (params.skip_checking) fd.append('skip_checking', 'true')
  if (params.paused) fd.append('paused', 'true')
  if (params.root_folder !== undefined) fd.append('root_folder', String(params.root_folder))
  if (params.downloadLimit != null) fd.append('downloadLimit', String(params.downloadLimit))
  if (params.uploadLimit != null) fd.append('uploadLimit', String(params.uploadLimit))
  if (params.sequentialDownload) fd.append('sequentialDownload', 'true')
  if (params.firstLastPiecePrio) fd.append('firstLastPiecePrio', 'true')

  await http.post('/torrents/add', fd)
}

/** 删除种子 */
export async function deleteTorrents(hashes: string[], deleteFiles: boolean): Promise<void> {
  await http.post('/torrents/delete', form({ hashes: hashes.join('|'), deleteFiles }))
}

/** 暂停种子（qBittorrent v5: /torrents/stop，兼容 v4: /torrents/pause） */
export async function pauseTorrents(hashes: string[]): Promise<void> {
  try {
    await http.post('/torrents/stop', form({ hashes: hashes.join('|') }))
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      await http.post('/torrents/pause', form({ hashes: hashes.join('|') }))
    } else {
      throw err
    }
  }
}

/** 恢复种子（qBittorrent v5: /torrents/start，兼容 v4: /torrents/resume） */
export async function resumeTorrents(hashes: string[]): Promise<void> {
  try {
    await http.post('/torrents/start', form({ hashes: hashes.join('|') }))
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      await http.post('/torrents/resume', form({ hashes: hashes.join('|') }))
    } else {
      throw err
    }
  }
}

/** 强制恢复 */
export async function forceStartTorrents(hashes: string[], value: boolean): Promise<void> {
  await http.post('/torrents/setForceStart', form({ hashes: hashes.join('|'), value }))
}

/** 添加标签 */
export async function addTags(hashes: string[], tags: string): Promise<void> {
  await http.post('/torrents/addTags', form({ hashes: hashes.join('|'), tags }))
}

/** 移除标签 */
export async function removeTags(hashes: string[], tags: string): Promise<void> {
  await http.post('/torrents/removeTags', form({ hashes: hashes.join('|'), tags }))
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
export async function getTorrentFiles(hash: string): Promise<TorrentFile[]> {
  const res = await http.get<TorrentFile[]>('/torrents/files', { params: { hash } })
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

// ===== 分类管理 =====

/** 获取所有分类（返回对象，key 为分类名） */
export async function getCategories(): Promise<TorrentCategory[]> {
  const res = await http.get<Record<string, TorrentCategory>>('/torrents/categories')
  return Object.values(res.data)
}

/** 创建分类 */
export async function createCategory(params: CategoryParams): Promise<void> {
  await http.post('/torrents/createCategory', form({ category: params.category, savePath: params.savePath }))
}

/** 编辑分类 */
export async function editCategory(params: CategoryParams): Promise<void> {
  await http.post('/torrents/editCategory', form({ category: params.category, savePath: params.savePath }))
}

/** 删除分类（removeCategories 接收逗号分隔的分类名） */
export async function removeCategories(categories: string[]): Promise<void> {
  await http.post('/torrents/removeCategories', form({ categories: categories.join(',') }))
}

/** 设置种子的分类 */
export async function setTorrentsCategory(hashes: string[], category: string): Promise<void> {
  await http.post('/torrents/setCategory', form({ hashes: hashes.join('|'), category }))
}

// ===== 限速与位置 =====

/** 设置种子下载限速（单位 bytes/s，0 表示不限速） */
export async function setTorrentsDownloadLimit(hashes: string[], limit: number): Promise<void> {
  await http.post('/torrents/setDownloadLimit', form({ hashes: hashes.join('|'), limit }))
}

/** 设置种子上传限速（单位 bytes/s，0 表示不限速） */
export async function setTorrentsUploadLimit(hashes: string[], limit: number): Promise<void> {
  await http.post('/torrents/setUploadLimit', form({ hashes: hashes.join('|'), limit }))
}

/** 设置种子保存路径（move 操作） */
export async function setTorrentsLocation(hashes: string[], location: string): Promise<void> {
  await http.post('/torrents/setLocation', form({ hashes: hashes.join('|'), location }))
}

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

/** 重命名种子文件 */
export async function renameFile(hash: string, oldPath: string, newPath: string): Promise<void> {
  await http.post('/torrents/renameFile', form({ hash, oldPath, newPath }))
}
