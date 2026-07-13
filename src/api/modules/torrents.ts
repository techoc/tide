import http, { form } from '@/api'
import type {
  AddTorrentParams,
  Torrent,
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
