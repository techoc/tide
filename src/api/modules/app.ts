import http, { form } from '@/api'

/** 全局传输信息（下载/上传速度等） */
export interface TransferInfo {
  dl_info_speed: number
  dl_info_data: number
  up_info_speed: number
  up_info_data: number
}

/** 获取全局传输信息 */
export async function getTransferInfo(): Promise<TransferInfo> {
  const res = await http.get<TransferInfo>('/transfer/info')
  return res.data
}

/** 获取全局设置 */
export async function getPreferences(): Promise<Record<string, unknown>> {
  const res = await http.get('/app/preferences')
  return res.data
}

/** 修改全局设置 */
export async function setPreferences(prefs: Record<string, unknown>): Promise<void> {
  await http.post('/app/setPreferences', form({ json: JSON.stringify(prefs) }))
}

/** 切换备选速度限制（开/关） */
export async function toggleAlternativeSpeedLimits(): Promise<void> {
  // qBittorrent v5 将端点从 /app/toggleAlternativeSpeedLimits 迁移至 /transfer/toggleSpeedLimitsMode
  await http.post('/transfer/toggleSpeedLimitsMode', form({}))
}

/** 获取备选速度限制状态（true 表示已启用） */
export async function getAlternativeSpeedLimitsMode(): Promise<boolean> {
  // qBittorrent v5 将端点从 /app/alternativeSpeedLimitsEnabled 迁移至 /transfer/speedLimitsMode
  const res = await http.get<string>('/transfer/speedLimitsMode')
  // 返回 "1"/"0"，但 axios 默认 transformResponse 会 JSON.parse 成数字 1/0，需统一为字符串比较
  return String(res.data) === '1'
}
