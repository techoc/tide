<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

// 监听认证失效事件
function onAuthExpired() {
  // 登录阶段的会话校验也可能返回 403，此时仍停留在登录页，无需重复跳转。
  if (!auth.isAuthenticated) return

  const redirect = router.currentRoute.value.fullPath
  auth.clearSession()
  router.replace({ name: 'login', query: { redirect } })
}

onMounted(() => {
  window.addEventListener('auth:expired', onAuthExpired)
  auth.restoreBaseUrl()
})
onUnmounted(() => window.removeEventListener('auth:expired', onAuthExpired))
</script>

<template>
  <UApp>
    <RouterView />
  </UApp>
</template>

<style>
html,
body,
#app {
  height: 100%;
}
</style>
