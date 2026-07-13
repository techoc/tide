/**
 * qBittorrent Web API 类型定义
 */

/** 种子状态枚举（含 qBittorrent v5 的 stoppedDL/stoppedUP） */
export type TorrentState =
  | 'error'
  | 'missingFiles'
  | 'uploading'
  | 'pausedUP'
  | 'stoppedUP'
  | 'queuedUP'
  | 'stalledUP'
  | 'checkingUP'
  | 'forcedUP'
  | 'allocating'
  | 'downloading'
  | 'metaDL'
  | 'pausedDL'
  | 'stoppedDL'
  | 'queuedDL'
  | 'stalledDL'
  | 'checkingDL'
  | 'forcedDL'
  | 'checkingResumeData'
  | 'moving'

/** 种子列表筛选器 */
export type TorrentFilter =
  | 'all'
  | 'downloading'
  | 'seeding'
  | 'completed'
  | 'paused'
  | 'active'
  | 'inactive'
  | 'resumed'
  | 'stalled'
  | 'stalled_uploading'
  | 'stalled_downloading'

/** 种子排序字段 */
export type TorrentSort =
  | 'name'
  | 'size'
  | 'progress'
  | 'dlspeed'
  | 'upspeed'
  | 'eta'
  | 'ratio'
  | 'added_on'
  | 'state'

/** 种子信息（/torrents/info 返回项） */
export interface Torrent {
  added_on: number
  amount_left: number
  auto_tmm: boolean
  availability: number
  category: string
  completed: number
  completion_on: number
  content_path: string
  dl_limit: number
  dlspeed: number
  downloaded: number
  downloaded_session: number
  eta: number
  f_l_piece_prio: boolean
  force_start: boolean
  hash: string
  last_activity: number
  magnet_uri: string
  max_ratio: number
  max_seeding_time: number
  name: string
  num_complete: number
  num_incomplete: number
  num_leechs: number
  num_seeds: number
  priority: number
  progress: number
  ratio: number
  ratio_limit: number
  save_path: string
  seeding_time: number
  seeding_time_limit: number
  seen_complete: number
  size: number
  state: TorrentState
  super_seeding: boolean
  tags: string
  time_active: number
  total_size: number
  tracker: string
  up_limit: number
  uploaded: number
  uploaded_session: number
  upspeed: number
}

/** 文件信息（/torrents/files 返回项） */
export interface TorrentFile {
  index: number
  name: string
  size: number
  progress: number
  priority: number
  is_seed: boolean
  availability: number
}

/** Tracker 信息（/torrents/trackers 返回项） */
export interface TorrentTracker {
  url: string
  status: number
  tier: number
  num_peers: number
  num_seeds: number
  num_leeches: number
  num_downloaded: number
  msg: string
}

/** 对等方信息（/torrents/peers 返回） */
export interface TorrentPeers {
  full_update: boolean
  peers: Record<
    string,
    {
      ip: string
      port: number
      client: string
      progress: number
      dl_speed: number
      up_speed: number
      flags: string
      connection: string
      country: string
      country_code: string
    }
  >
}

/** 添加种子参数 */
export interface AddTorrentParams {
  urls?: string
  torrents?: File | File[]
  savepath?: string
  cookie?: string
  name?: string
  category?: string
  tags?: string
  skip_checking?: boolean
  paused?: boolean
  root_folder?: boolean
  downloadLimit?: number
  uploadLimit?: number
  sequentialDownload?: boolean
  firstLastPiecePrio?: boolean
}
