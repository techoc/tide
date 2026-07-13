import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import ui from '@nuxt/ui/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 可选：通过 .env 中的 VITE_QB_HOST 配置开发代理，避免 CORS 问题
  // 例：VITE_QB_HOST=http://127.0.0.1:8080
  const proxyTarget = env.VITE_QB_HOST

  return {
    plugins: [vue(), vueJsx(), vueDevTools(), tailwindcss(), ui()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: proxyTarget
      ? {
          proxy: {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
              // qBittorrent v5 启用 CSRF Origin 校验，需重写 Origin 与 Host 为目标地址
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq, req) => {
                  const targetUrl = new URL(proxyTarget as string)
                  proxyReq.setHeader('origin', targetUrl.origin)
                  proxyReq.setHeader('host', targetUrl.host)
                  // 移除可能导致校验失败的 referer
                  if (req.headers.referer) {
                    proxyReq.setHeader('referer', targetUrl.origin + '/')
                  }
                })
              },
            },
          },
        }
      : undefined,
  }
})
