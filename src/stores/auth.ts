import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, logout as apiLogout, getAppVersion } from '@/api/modules/auth'
import { setBaseUrl } from '@/api'

export const useAuthStore = defineStore(
  'auth',
  () => {
    /** 后端地址，如 http://127.0.0.1:8080 */
    const host = ref('')
    const username = ref('')
    const isAuthenticated = ref(false)
    /** qBittorrent 版本号 */
    const version = ref('')

    const displayHost = computed(() => host.value || '未连接')

    /** 登录 */
    async function login(addr: string, user: string, pass: string): Promise<void> {
      // 地址留空时走相对路径（开发环境由 Vite 代理转发到本地 qBittorrent）
      const trimmed = addr.trim()
      if (trimmed) {
        let fullHost = trimmed
        if (!/^https?:\/\//i.test(fullHost)) {
          fullHost = `http://${fullHost}`
        }
        setBaseUrl(fullHost)
        host.value = fullHost
      } else {
        // 代理模式：baseURL 保持默认 /api/v2
        host.value = ''
      }
      const ok = await apiLogin(user, pass)
      if (!ok) {
        throw new Error('用户名或密码错误')
      }
      username.value = user
      isAuthenticated.value = true
      // 登录成功后获取版本号（非阻塞）
      getAppVersion()
        .then((v) => (version.value = v))
        .catch(() => {})
    }

    /** 登出 */
    async function logout(): Promise<void> {
      try {
        await apiLogout()
      } catch {
        // 忽略登出接口错误
      }
      isAuthenticated.value = false
      host.value = ''
      username.value = ''
      version.value = ''
    }

    /** 应用启动时根据持久化的 host 恢复 baseURL */
    function restoreBaseUrl(): void {
      if (host.value) setBaseUrl(host.value)
    }

    return {
      host,
      username,
      isAuthenticated,
      version,
      displayHost,
      login,
      logout,
      restoreBaseUrl,
    }
  },
  {
    persist: {
      // 仅持久化连接信息，不持久化密码
      pick: ['host', 'username', 'isAuthenticated', 'version'],
    },
  },
)
