<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const auth = useAuthStore()

const loading = ref(false)

const form = reactive({
  address: '',
  username: 'admin',
  password: 'adminadmin',
  remember: true,
})

function validate(state: typeof form) {
  const errors: { name: string; message: string }[] = []
  if (!state.username) errors.push({ name: 'username', message: '请输入用户名' })
  if (!state.password) errors.push({ name: 'password', message: '请输入密码' })
  return errors
}

async function handleLogin() {
  loading.value = true
  try {
    await auth.login(form.address, form.username, form.password)
    toast.add({ title: '登录成功', color: 'success' })
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  } catch (err) {
    const e = err as { response?: { data?: string }; message?: string }
    const msg = e?.response?.data || e?.message || '连接失败，请检查地址与凭据'
    toast.add({
      title: '登录失败',
      description: typeof msg === 'string' ? msg : '连接失败',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 dark:from-[#0a0e1a] dark:via-[#0f1b2e] dark:to-[#07090f]"
  >
    <!-- 背景层：渐变光晕 -->
    <div class="bg-glow bg-glow--1"></div>
    <div class="bg-glow bg-glow--2"></div>
    <div class="bg-glow bg-glow--3"></div>
    <div class="bg-grid"></div>

    <!-- 底部波浪 -->
    <svg
      class="wave fill-slate-200/60 dark:fill-[#0d1626]"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
    >
      <path
        d="M0,160 C240,260 480,60 720,140 C960,220 1200,100 1440,180 L1440,320 L0,320 Z"
      />
      <path
        d="M0,200 C240,280 480,120 720,200 C960,280 1200,160 1440,220 L1440,320 L0,320 Z"
        opacity="0.5"
      />
    </svg>

    <!-- 登录卡片 -->
    <div
      class="login-card relative z-10 w-[400px] max-w-[calc(100vw-32px)] rounded-2xl border border-black/5 bg-white/70 p-10 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(18,24,38,0.72)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.5)]"
    >
      <!-- 品牌 -->
      <div class="mb-8 flex items-center gap-3.5">
        <div
          class="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#18a0fb] to-[#00d4c8] text-white shadow-lg shadow-blue-500/40"
        >
          <UIcon name="i-lucide-waves" class="text-[34px]" />
        </div>
        <div>
          <h1
            class="m-0 text-2xl font-bold tracking-tight text-slate-800 dark:text-[#f5f7fa]"
          >
            Tide
          </h1>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-white/50">
            现代化 qBittorrent 下载管理
          </p>
        </div>
      </div>

      <UForm :state="form" :validate="validate" @submit="handleLogin" class="space-y-4">
        <UFormField name="address">
          <UInput
            v-model="form.address"
            icon="i-lucide-server"
            placeholder="服务器地址（留空使用本地代理）"
            autocomplete="address"
            size="xl"
            class="w-full"
          />
        </UFormField>

        <UFormField name="username">
          <UInput
            v-model="form.username"
            icon="i-lucide-user"
            placeholder="用户名"
            autocomplete="username"
            size="xl"
            class="w-full"
          />
        </UFormField>

        <UFormField name="password">
          <UInput
            v-model="form.password"
            type="password"
            icon="i-lucide-lock"
            placeholder="密码"
            autocomplete="current-password"
            size="xl"
            class="w-full"
          />
        </UFormField>

        <div class="flex items-center justify-between">
          <UCheckbox v-model="form.remember" label="记住连接" />
        </div>

        <UButton
          type="submit"
          block
          size="xl"
          :loading="loading"
          trailing-icon="i-lucide-arrow-right"
          class="submit-btn"
        >
          连接到 qBittorrent
        </UButton>
      </UForm>

      <p
        class="mt-5 text-center text-xs leading-relaxed text-slate-400 dark:text-white/35"
      >
        本地开发已配置代理连接 qBittorrent，地址留空即可直接登录
      </p>
    </div>
  </div>
</template>

<style scoped>
/* 渐变光晕 */
.bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.3;
  animation: float 14s ease-in-out infinite;
}
:where(.dark) .bg-glow {
  opacity: 0.55;
}
.bg-glow--1 {
  width: 480px;
  height: 480px;
  background: #18a0fb;
  top: -120px;
  left: -80px;
}
.bg-glow--2 {
  width: 420px;
  height: 420px;
  background: #00d4c8;
  bottom: -140px;
  right: -60px;
  animation-delay: -4s;
}
.bg-glow--3 {
  width: 360px;
  height: 360px;
  background: #6366f1;
  top: 40%;
  left: 55%;
  opacity: 0.2;
  animation-delay: -8s;
}
:where(.dark) .bg-glow--3 {
  opacity: 0.35;
}

@keyframes float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(40px, -30px) scale(1.08);
  }
  66% {
    transform: translate(-30px, 40px) scale(0.95);
  }
}

/* 网格叠加 */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at center, #000 30%, transparent 75%);
}
:where(.dark) .bg-grid {
  background-image: linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
}

/* 底部波浪 */
.wave {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 240px;
  z-index: 1;
}

/* 卡片入场动画 */
.login-card {
  animation: cardIn 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
  }
}

/* 提交按钮渐变 */
.submit-btn {
  background: linear-gradient(135deg, #18a0fb 0%, #00b8d9 100%) !important;
  border: none !important;
  box-shadow: 0 8px 20px rgba(24, 160, 251, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(24, 160, 251, 0.45);
}

/* 响应式 */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px 24px;
  }
  .wave {
    height: 160px;
  }
}
</style>
