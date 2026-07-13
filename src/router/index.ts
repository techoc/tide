import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  // 使用 Hash 模式，便于部署到 qBittorrent 或任意静态服务器
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true, title: '登录' },
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '种子列表' },
        },
        {
          path: 'stats',
          name: 'stats',
          component: () => import('@/views/Stats.vue'),
          meta: { title: '统计概览' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/Settings.vue'),
          meta: { title: '设置' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// 全局前置守卫：未登录跳转登录页
router.beforeEach((to) => {
  const auth = useAuthStore()
  // 恢复 baseURL（持久化后首次导航）
  auth.restoreBaseUrl()

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // 已登录访问登录页则回首页
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
