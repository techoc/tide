<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useColorMode } from '#imports'
import { getPreferences, setPreferences } from '@/api/modules/app'
import { useSettingsStore } from '@/stores/settings'

const toast = useToast()
const settings = useSettingsStore()
const colorMode = useColorMode()

const loading = ref(false)
const saving = ref(false)

const prefs = reactive({
  dl_limit: 0,
  up_limit: 0,
  save_path: '',
  listen_port: 0,
  alt_dl_limit: 0,
  alt_up_limit: 0,
})

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (val: boolean) => {
    colorMode.preference = val ? 'dark' : 'light'
  },
})

const languageItems = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' },
]

const languageValue = computed({
  get: () => settings.language,
  set: (val: string) => {
    if (val === 'zh' || val === 'en') settings.language = val
  },
})

onMounted(async () => {
  loading.value = true
  try {
    const data = await getPreferences()
    prefs.dl_limit = Number(data.dl_limit) || 0
    prefs.up_limit = Number(data.up_limit) || 0
    prefs.save_path = String(data.save_path ?? '')
    prefs.listen_port = Number(data.listen_port) || 0
    prefs.alt_dl_limit = Number(data.alt_dl_limit) || 0
    prefs.alt_up_limit = Number(data.alt_up_limit) || 0
  } catch {
    toast.add({ title: '加载设置失败', color: 'error' })
  } finally {
    loading.value = false
  }
})

async function handleSave() {
  saving.value = true
  try {
    await setPreferences({
      dl_limit: prefs.dl_limit,
      up_limit: prefs.up_limit,
      save_path: prefs.save_path,
      alt_dl_limit: prefs.alt_dl_limit,
      alt_up_limit: prefs.alt_up_limit,
    })
    toast.add({ title: '设置已保存', color: 'success' })
  } catch {
    toast.add({ title: '保存失败', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-5 pb-20">
    <!-- 页头 -->
    <div class="mb-5">
      <h2 class="m-0 text-xl font-bold text-default">设置</h2>
      <p class="m-0 mt-1 text-sm text-muted">配置 qBittorrent 全局参数与界面偏好</p>
    </div>

    <!-- 界面偏好 -->
    <UCard class="mb-4">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-default">界面</h3>
          <UIcon name="i-lucide-globe" class="size-4 text-muted" />
        </div>
      </template>

      <div class="flex flex-col gap-4">
        <UFormField label="深色模式">
          <USwitch v-model="isDark" />
        </UFormField>
        <UFormField label="界面语言">
          <USelect
            v-model="languageValue"
            :items="languageItems"
            class="max-w-[280px]"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- 速度限制 -->
    <UCard class="mb-4">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-default">速度限制</h3>
          <UIcon name="i-lucide-gauge" class="size-4 text-muted" />
        </div>
      </template>

      <UForm :state="prefs" class="flex flex-col gap-4">
        <UFormField label="下载限速 (KiB/s)">
          <UInputNumber
            v-model="prefs.dl_limit"
            :min="0"
            placeholder="0 表示不限速"
            class="max-w-[280px]"
          />
        </UFormField>
        <UFormField label="上传限速 (KiB/s)">
          <UInputNumber
            v-model="prefs.up_limit"
            :min="0"
            placeholder="0 表示不限速"
            class="max-w-[280px]"
          />
        </UFormField>
        <USeparator />
        <UFormField label="备用下载限速">
          <UInputNumber
            v-model="prefs.alt_dl_limit"
            :min="0"
            class="max-w-[280px]"
          />
        </UFormField>
        <UFormField label="备用上传限速">
          <UInputNumber
            v-model="prefs.alt_up_limit"
            :min="0"
            class="max-w-[280px]"
          />
        </UFormField>
      </UForm>
    </UCard>

    <!-- 下载与连接 -->
    <UCard class="mb-4">
      <template #header>
        <h3 class="text-base font-semibold text-default">下载与连接</h3>
      </template>

      <UForm :state="prefs" class="flex flex-col gap-4">
        <UFormField label="默认保存路径">
          <UInput
            v-model="prefs.save_path"
            placeholder="默认下载路径"
            class="w-full"
          />
        </UFormField>
        <UFormField label="监听端口">
          <UInputNumber
            v-model="prefs.listen_port"
            disabled
            class="max-w-[280px]"
          />
        </UFormField>
      </UForm>
    </UCard>

    <!-- 保存按钮 -->
    <div class="sticky bottom-0 flex justify-end py-4">
      <UButton
        color="primary"
        size="lg"
        icon="i-lucide-save"
        :loading="saving"
        :disabled="loading"
        @click="handleSave"
      >
        保存设置
      </UButton>
    </div>
  </div>
</template>
