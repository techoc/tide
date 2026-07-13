<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

// 监听认证失效事件
function onAuthExpired() {
  auth.logout().finally(() => {
    router.replace({ name: 'login' })
  })
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
