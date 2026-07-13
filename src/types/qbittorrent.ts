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
  seq_dl: boolean
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
  downloadPath?: string
  useDownloadPath?: boolean
  cookie?: string
  name?: string
  category?: string
  tags?: string
  skip_checking?: boolean
  paused?: boolean
  stopped?: boolean
  forced?: boolean
  addToTopOfQueue?: boolean
  root_folder?: boolean
  downloadLimit?: number
  uploadLimit?: number
  sequentialDownload?: boolean
  firstLastPiecePrio?: boolean
  autoTMM?: boolean
  contentLayout?: 'Original' | 'Subfolder' | 'NoSubfolder'
  stopCondition?: 'None' | 'MetadataReceived' | 'FilesChecked'
  ratioLimit?: number
  seedingTimeLimit?: number
  inactiveSeedingTimeLimit?: number
  shareLimitsMode?: string
  shareLimitAction?: string
  filePriorities?: number[]
  downloader?: string
  ssl_certificate?: string
  ssl_private_key?: string
  ssl_dh_params?: string
}

/** 分类信息（/torrents/categories 返回项） */
export interface TorrentCategory {
  name: string
  savePath: string
  downloadPath?: string
  download_path?: string
  download_path_enabled?: boolean
}

/** 创建/编辑分类参数 */
export interface CategoryParams {
  category: string
  savePath?: string
  downloadPath?: string
  enable?: boolean
}

export interface TorrentProperties {
  save_path: string
  creation_date: number
  piece_size: number
  comment: string
  total_wasted: number
  total_uploaded: number
  total_uploaded_session: number
  total_downloaded: number
  total_downloaded_session: number
  up_limit: number
  dl_limit: number
  time_elapsed: number
  seeding_time: number
  nb_connections: number
  nb_connections_limit: number
  share_ratio: number
  addition_date: number
  completion_date: number
  created_by: string
  dl_speed_avg: number
  dl_speed: number
  eta: number
  last_seen: number
  peers: number
  peers_total: number
  pieces_have: number
  pieces_num: number
  reannounce: number
  seeds: number
  seeds_total: number
  total_size: number
  up_speed_avg: number
  up_speed: number
  is_private: boolean
}

export interface TorrentWebSeed {
  url: string
}

export type TorrentPieceState = 0 | 1 | 2

export interface TorrentShareLimits {
  ratioLimit?: number
  seedingTimeLimit?: number
  inactiveSeedingTimeLimit?: number
}

export interface SSLParameters {
  ssl_certificate: string
  ssl_private_key: string
  ssl_dh_params: string
}

export interface TransferInfo {
  dl_info_speed: number
  dl_info_data: number
  up_info_speed: number
  up_info_data: number
  dl_rate_limit: number
  up_rate_limit: number
  dht_nodes: number
  connection_status: 'connected' | 'firewalled' | 'disconnected'
  last_external_address_v4?: string
  last_external_address_v6?: string
}

export interface TransferSpeedLimits {
  up_limit: number
  dl_limit: number
  alt_up_limit: number
  alt_dl_limit: number
}

export interface BuildInfo {
  qt: string
  libtorrent: string
  boost: string
  openssl: string
  bitness: number
  [key: string]: string | number
}

export interface ProcessInfo {
  launch_time: number
  [key: string]: number
}

export interface DirectoryEntry {
  name: string
  type: 'file' | 'dir'
  size?: number
  creation_date: number
  last_access_date: number
  last_modification_date: number
}

export interface QbtCookie {
  name: string
  domain: string
  path: string
  value: string
  expirationDate: number
}

export interface NetworkInterface {
  name: string
  value: string
}

export interface LogEntry {
  id: number
  message: string
  timestamp: number
  type: number
}

export interface PeerLogEntry {
  id: number
  ip: string
  timestamp: number
  blocked: boolean
  reason: string
}

export interface SyncMainData {
  rid: number
  full_update: boolean
  torrents?: Record<string, Torrent>
  torrents_removed?: string[]
  categories?: Record<string, TorrentCategory>
  categories_removed?: string[]
  tags?: string[]
  tags_removed?: string[]
  trackers?: Record<string, string[]>
  trackers_removed?: string[]
  server_state?: Record<string, unknown>
}

export interface SearchStatus {
  id: number
  status: 'Running' | 'Stopped'
  total: number
}

export interface SearchResult {
  descrLink: string
  fileName: string
  fileSize: number
  fileUrl: string
  engineName: string
  nbLeechers: number
  nbSeeders: number
  siteUrl: string
  pubDate?: number
}

export interface SearchResults {
  results: SearchResult[]
  status: 'Running' | 'Stopped'
  total: number
}

export interface SearchPlugin {
  enabled: boolean
  fullName: string
  name: string
  supportedCategories: Array<{ id: string; name: string }>
  url: string
  version: string
}

export interface RSSArticle {
  id?: string
  title?: string
  date?: string
  description?: string
  link?: string
  torrentURL?: string
  isRead?: boolean
  [key: string]: unknown
}

export interface RSSItem {
  uid?: string
  url?: string
  title?: string
  articles?: RSSArticle[]
  children?: Record<string, RSSItem>
  [key: string]: unknown
}

export interface RSSRule {
  enabled?: boolean
  mustContain?: string
  mustNotContain?: string
  useRegex?: boolean
  episodeFilter?: string
  smartFilter?: boolean
  previouslyMatchedEpisodes?: string[]
  affectedFeeds?: string[]
  ignoreDays?: number
  lastMatch?: string
  addPaused?: boolean
  assignCategory?: string
  savePath?: string
  [key: string]: unknown
}

export interface TorrentCreatorParams {
  sourcePath: string
  torrentFilePath?: string
  comment?: string
  source?: string
  trackers?: string[]
  urlSeeds?: string[]
  pieceSize?: number
  private?: boolean
  ignoreDotFiles?: boolean
  startSeeding?: boolean
  format?: 'v1' | 'v2' | 'hybrid'
  optimizeAlignment?: boolean
  paddedFileSizeLimit?: number
}

export interface TorrentCreatorTask {
  taskID: string
  sourcePath: string
  status: string
  progress?: number
  errorMessage?: string
  timeAdded: number
  timeStarted?: number
  timeFinished?: number
  pieceSize: number
  [key: string]: unknown
}
