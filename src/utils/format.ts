/**
 * 格式化工具函数
 */

/** 字节数 -> 人类可读大小，如 1.5 GiB */
export function formatSize(bytes: number | undefined | null): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return '--'
  if (bytes === 0) return '0 B'
  const k = 1024
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1)
  const val = bytes / Math.pow(k, i)
  return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

/** 字节数/秒 -> 速度，如 1.2 MiB/s */
export function formatSpeed(bytesPerSec: number | undefined | null): string {
  if (bytesPerSec == null || bytesPerSec <= 0) return '0 B/s'
  return `${formatSize(bytesPerSec)}/s`
}

/** 秒数 -> 剩余时间，如 2h 30m */
export function formatEta(seconds: number | undefined | null): string {
  if (seconds == null || seconds < 0 || seconds === 8640000) return '∞'
  if (seconds === 0) return '0s'
  const s = Math.floor(seconds)
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (mins) parts.push(`${days ? '' : ''}${mins}m`)
  if (!days && !hours) parts.push(`${secs}s`)
  return parts.join(' ')
}

/** Unix 时间戳(秒) -> 本地时间字符串 */
export function formatTimestamp(ts: number | undefined | null): string {
  if (!ts || ts <= 0) return '--'
  return new Date(ts * 1000).toLocaleString()
}

/** 秒数 -> 活跃时长，如 1d 2h */
export function formatDuration(seconds: number | undefined | null): string {
  if (!seconds || seconds <= 0) return '--'
  return formatEta(seconds)
}

/** 比例，如 2.345 */
export function formatRatio(ratio: number | undefined | null): string {
  if (ratio == null || ratio < 0) return '--'
  return ratio.toFixed(3)
}

/** 百分比(0-1) -> 整数百分比 */
export function formatProgress(progress: number | undefined | null): number {
  if (progress == null || Number.isNaN(progress)) return 0
  return Math.round(progress * 100)
}

/** 将多个 hash 合并为 qBittorrent 接口所需的 `hash1|hash2` 格式 */
export function joinHashes(hashes: string[]): string {
  return hashes.join('|')
}
