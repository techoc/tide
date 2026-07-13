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
  // 传 form({}) 以设置 application/x-www-form-urlencoded，否则 qBittorrent 返回 415
  await http.post('/auth/logout', form({}))
}
