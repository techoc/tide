import type { TorrentState } from '@/types/qbittorrent'

export interface StateMeta {
  icon: string
  color: string
  label: string
}

/** 种子状态 -> 图标/颜色/文案 映射 */
const stateMap: Record<TorrentState, StateMeta> = {
  error: { icon: 'i-lucide-alert-circle', color: '#d03050', label: '错误' },
  missingFiles: { icon: 'i-lucide-alert-circle', color: '#d03050', label: '文件缺失' },
  uploading: { icon: 'i-lucide-arrow-up-circle', color: '#36ad6a', label: '做种中' },
  pausedUP: { icon: 'i-lucide-pause-circle', color: '#909399', label: '已完成暂停' },
  stoppedUP: { icon: 'i-lucide-pause-circle', color: '#909399', label: '已完成暂停' },
  queuedUP: { icon: 'i-lucide-hourglass', color: '#f0a020', label: '排队做种' },
  stalledUP: { icon: 'i-lucide-cloud-off', color: '#909399', label: '停滞做种' },
  checkingUP: { icon: 'i-lucide-refresh-cw', color: '#18a0fb', label: '校验中' },
  forcedUP: { icon: 'i-lucide-arrow-up-circle', color: '#36ad6a', label: '强制做种' },
  allocating: { icon: 'i-lucide-refresh-cw', color: '#18a0fb', label: '分配空间' },
  downloading: { icon: 'i-lucide-arrow-down-circle', color: '#18a0fb', label: '下载中' },
  metaDL: { icon: 'i-lucide-refresh-cw', color: '#18a0fb', label: '获取元数据' },
  pausedDL: { icon: 'i-lucide-pause-circle', color: '#909399', label: '已暂停' },
  stoppedDL: { icon: 'i-lucide-pause-circle', color: '#909399', label: '已暂停' },
  queuedDL: { icon: 'i-lucide-hourglass', color: '#f0a020', label: '排队下载' },
  stalledDL: { icon: 'i-lucide-cloud-off', color: '#909399', label: '停滞下载' },
  checkingDL: { icon: 'i-lucide-refresh-cw', color: '#18a0fb', label: '校验中' },
  forcedDL: { icon: 'i-lucide-arrow-down-circle', color: '#18a0fb', label: '强制下载' },
  checkingResumeData: { icon: 'i-lucide-refresh-cw', color: '#18a0fb', label: '校验恢复数据' },
  moving: { icon: 'i-lucide-refresh-cw', color: '#f0a020', label: '移动中' },
}

/** 获取状态元信息 */
export function getStateMeta(state: TorrentState): StateMeta {
  return stateMap[state] ?? { icon: 'i-lucide-alert-circle', color: '#909399', label: state }
}

/** 是否为下载中状态 */
export function isDownloading(state: TorrentState): boolean {
  return ['downloading', 'metaDL', 'forcedDL', 'stalledDL'].includes(state)
}

/** 是否为做种状态 */
export function isSeeding(state: TorrentState): boolean {
  return ['uploading', 'forcedUP', 'stalledUP'].includes(state)
}

/** 是否已暂停 */
export function isPaused(state: TorrentState): boolean {
  return state === 'pausedUP' || state === 'pausedDL' || state === 'stoppedUP' || state === 'stoppedDL'
}
