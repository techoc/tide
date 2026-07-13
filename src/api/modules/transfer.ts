import http, { form } from '@/api'
import type { TransferInfo, TransferSpeedLimits } from '@/types/qbittorrent'

export async function getTransferInfo(): Promise<TransferInfo> {
  const res = await http.get<TransferInfo>('/transfer/info')
  return res.data
}

export async function getAlternativeSpeedLimitsMode(): Promise<boolean> {
  const res = await http.get<string | number>('/transfer/speedLimitsMode')
  return Number(res.data) !== 0
}

export async function setAlternativeSpeedLimitsMode(enabled: boolean): Promise<void> {
  await http.post('/transfer/setSpeedLimitsMode', form({ mode: enabled ? 1 : 0 }))
}

export async function toggleAlternativeSpeedLimits(): Promise<void> {
  await http.post('/transfer/toggleSpeedLimitsMode', form({}))
}

export async function getGlobalDownloadLimit(): Promise<number> {
  const res = await http.get<string | number>('/transfer/downloadLimit')
  return Number(res.data)
}

export async function setGlobalDownloadLimit(limit: number): Promise<void> {
  await http.post('/transfer/setDownloadLimit', form({ limit }))
}

export async function getGlobalUploadLimit(): Promise<number> {
  const res = await http.get<string | number>('/transfer/uploadLimit')
  return Number(res.data)
}

export async function setGlobalUploadLimit(limit: number): Promise<void> {
  await http.post('/transfer/setUploadLimit', form({ limit }))
}

export async function getSpeedLimits(): Promise<TransferSpeedLimits> {
  const res = await http.get<TransferSpeedLimits>('/transfer/getSpeedLimits')
  return res.data
}

export async function setSpeedLimits(limits: TransferSpeedLimits): Promise<void> {
  await http.post('/transfer/setSpeedLimits', form(limits as unknown as Record<string, unknown>))
}

export async function banPeers(peers: string[]): Promise<void> {
  await http.post('/transfer/banPeers', form({ peers: peers.join('|') }))
}
