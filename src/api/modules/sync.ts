import http from '@/api'
import type { SyncMainData, TorrentPeers } from '@/types/qbittorrent'

export async function getMainData(rid = 0): Promise<SyncMainData> {
  const res = await http.get<SyncMainData>('/sync/maindata', { params: { rid } })
  return res.data
}

export async function getTorrentPeersData(hash: string, rid = 0): Promise<TorrentPeers> {
  const res = await http.get<TorrentPeers>('/sync/torrentPeers', { params: { hash, rid } })
  return res.data
}
