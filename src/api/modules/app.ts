import http, { form } from '@/api'
import type {
  BuildInfo,
  DirectoryEntry,
  NetworkInterface,
  ProcessInfo,
  QbtCookie,
} from '@/types/qbittorrent'

export async function getAppVersion(): Promise<string> {
  const res = await http.get<string>('/app/version')
  return res.data
}

export async function getWebApiVersion(): Promise<string> {
  const res = await http.get<string>('/app/webapiVersion')
  return res.data
}

export async function getBuildInfo(): Promise<BuildInfo> {
  const res = await http.get<BuildInfo>('/app/buildInfo')
  return res.data
}

export async function getProcessInfo(): Promise<ProcessInfo> {
  const res = await http.get<ProcessInfo>('/app/processInfo')
  return res.data
}

export async function shutdownApplication(): Promise<void> {
  await http.post('/app/shutdown', form({}))
}

export async function getPreferences<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T> {
  const res = await http.get<T>('/app/preferences')
  return res.data
}

export async function setPreferences(prefs: Record<string, unknown>): Promise<void> {
  await http.post('/app/setPreferences', form({ json: JSON.stringify(prefs) }))
}

export async function getDefaultSavePath(): Promise<string> {
  const res = await http.get<string>('/app/defaultSavePath')
  return res.data
}

export async function sendTestEmail(): Promise<void> {
  await http.post('/app/sendTestEmail', form({}))
}

export async function getDirectoryContent(
  dirPath: string,
  options?: { mode?: 'all' | 'dirs' | 'files'; withMetadata?: false },
): Promise<string[]>
export async function getDirectoryContent(
  dirPath: string,
  options: { mode?: 'all' | 'dirs' | 'files'; withMetadata: true },
): Promise<DirectoryEntry[]>
export async function getDirectoryContent(
  dirPath: string,
  options: { mode?: 'all' | 'dirs' | 'files'; withMetadata?: boolean } = {},
): Promise<string[] | DirectoryEntry[]> {
  const res = await http.get<string[] | DirectoryEntry[]>('/app/getDirectoryContent', {
    params: { dirPath, ...options },
  })
  return res.data
}

export async function getFreeSpaceAtPath(path: string): Promise<number> {
  const res = await http.get<string | number>('/app/getFreeSpaceAtPath', { params: { path } })
  return Number(res.data)
}

export async function getCookies(): Promise<QbtCookie[]> {
  const res = await http.get<QbtCookie[]>('/app/cookies')
  return res.data
}

export async function setCookies(cookies: QbtCookie[]): Promise<void> {
  await http.post('/app/setCookies', form({ cookies: JSON.stringify(cookies) }))
}

export async function rotateApiKey(): Promise<string> {
  const res = await http.post<{ apiKey: string }>('/app/rotateAPIKey', form({}))
  return res.data.apiKey
}

export async function deleteApiKey(): Promise<void> {
  await http.post('/app/deleteAPIKey', form({}))
}

export async function getNetworkInterfaces(): Promise<NetworkInterface[]> {
  const res = await http.get<NetworkInterface[]>('/app/networkInterfaceList')
  return res.data
}

export async function getNetworkInterfaceAddresses(iface = ''): Promise<string[]> {
  const res = await http.get<string[]>('/app/networkInterfaceAddressList', { params: { iface } })
  return res.data
}

// 保留旧导入路径，避免现有 store/组件迁移时破坏兼容性。
export {
  getTransferInfo,
  getAlternativeSpeedLimitsMode,
  toggleAlternativeSpeedLimits,
} from './transfer'
export type { TransferInfo } from '@/types/qbittorrent'
