import http, { form } from '@/api'

/**
 * 登录。
 * qBittorrent v4 登录成功返回 "Ok."，v5 成功返回空 body + 204；
 * 失败则返回 "Fails." 或 403。此处统一返回布尔结果。
 */
export async function login(username: string, password: string): Promise<boolean> {
  const res = await http.post<string>(
    '/auth/login',
    form({ username, password }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      validateStatus: (s) => s === 200 || s === 204,
    },
  )
  // 204 或空 body 或 "Ok." 都视为成功；"Fails." 视为失败
  const data = res.data
  return !data || data === 'Ok.'
}

/** 登出 */
export async function logout(): Promise<void> {
  await http.post('/auth/logout')
}

/** 获取 qBittorrent 版本号（可用于校验连接是否正常） */
export async function getAppVersion(): Promise<string> {
  const res = await http.get<string>('/app/version')
  return res.data
}

/** 获取 Web API 版本 */
export async function getWebApiVersion(): Promise<string> {
  const res = await http.get<string>('/app/webapiVersion')
  return res.data
}
