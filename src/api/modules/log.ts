import http from '@/api'
import type { LogEntry, PeerLogEntry } from '@/types/qbittorrent'

export async function getMainLog(params: {
  normal?: boolean
  info?: boolean
  warning?: boolean
  critical?: boolean
  lastKnownId?: number
} = {}): Promise<LogEntry[]> {
  const { lastKnownId, ...filters } = params
  const res = await http.get<LogEntry[]>('/log/main', {
    params: { ...filters, last_known_id: lastKnownId },
  })
  return res.data
}

export async function getPeerLog(lastKnownId?: number): Promise<PeerLogEntry[]> {
  const res = await http.get<PeerLogEntry[]>('/log/peers', { params: { last_known_id: lastKnownId } })
  return res.data
}
