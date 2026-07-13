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
