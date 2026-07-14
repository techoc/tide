import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

/**
 * qBittorrent Web API (v2) 基础封装。
 * 认证基于 Cookie（SID），因此需要 withCredentials。
 * baseURL 由 auth store 在登录时动态设置。
 */
const http: AxiosInstance = axios.create({
  baseURL: '/api/v2',
  withCredentials: true,
  timeout: 15000,
})

/** 设置后端基地址（用户登录页填写的 host:port） */
export function setBaseUrl(host: string) {
  const trimmed = host.replace(/\/+$/, '')
  http.defaults.baseURL = trimmed ? `${trimmed}/api/v2` : '/api/v2'
}

/** 获取当前基地址 */
export function getBaseUrl(): string {
  return http.defaults.baseURL ?? '/api/v2'
}

/** 使用 qBittorrent API Key 认证（Web API 2.11.3+）。 */
export function setApiKey(apiKey: string): void {
  const value = apiKey.trim()
  if (value) {
    http.defaults.headers.common.Authorization = `Bearer ${value}`
  } else {
    clearApiKey()
  }
}

/** 清除当前 API Key，恢复 Cookie（SID）认证。 */
export function clearApiKey(): void {
  delete http.defaults.headers.common.Authorization
}

/** 获取当前配置的 API Key；未配置时返回空字符串。 */
export function getApiKey(): string {
  const authorization = http.defaults.headers.common.Authorization
  if (typeof authorization !== 'string') return ''
  return authorization.replace(/^Bearer\s+/i, '')
}

// 响应拦截：统一错误处理
http.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    const requestUrl = String(error?.config?.url ?? '')
    const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/logout')
    if ((status === 401 || status === 403) && !isAuthRequest) {
      // 认证失效，触发登出（避免循环引用，通过事件通知）
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return Promise.reject(error)
  },
)

/**
 * 将对象转为 URLSearchParams（qBittorrent 的 POST 接口使用表单编码）。
 */
export function form(data: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue
    params.append(key, String(value))
  }
  return params
}

export type { AxiosRequestConfig }
export default http
