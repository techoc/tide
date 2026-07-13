<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTorrentListStore } from '@/stores/torrentList'
import { useSpeedHistory } from '@/composables/useSpeedHistory'
import { formatSize, formatSpeed } from '@/utils/format'

const store = useTorrentListStore()
const { history } = useSpeedHistory()

/** localStorage 持久化 key */
const COLLAPSE_KEY = 'tide.stats.collapsed'
/** 折叠状态：从 localStorage 读取初始值 */
const collapsed = ref(
  typeof window !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === 'true',
)

/** 切换折叠/展开，并持久化 */
function toggleCollapse() {
  collapsed.value = !collapsed.value
  if (typeof window !== 'undefined') {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed.value))
  }
}

/** SVG 视口尺寸 */
const SVG_WIDTH = 600
const SVG_HEIGHT = 120
const PADDING = 4
const CHART_HEIGHT = SVG_HEIGHT - PADDING * 2

/** Y 轴最大值：取所有采样点 dl/up 的最大值，最小 1 避免除零 */
const yMax = computed(() => {
  let max = 0
  for (const s of history.value) {
    if (s.dl > max) max = s.dl
    if (s.up > max) max = s.up
  }
  return Math.max(max, 1)
})

/** 根据 key 构造 polyline 的 points 字符串 */
function buildPoints(key: 'dl' | 'up'): string {
  const data = history.value
  const n = data.length
  if (n === 0) return ''
  return data
    .map((s, i) => {
      // X 轴：采样点均匀分布
      const x = n === 1 ? 0 : (i / (n - 1)) * SVG_WIDTH
      // Y 轴：值越大越靠上
      const y = PADDING + CHART_HEIGHT - (s[key] / yMax.value) * CHART_HEIGHT
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

/** 下载速度折线 points */
const dlPoints = computed(() => buildPoints('dl'))
/** 上传速度折线 points */
const upPoints = computed(() => buildPoints('up'))
/** 是否有速度数据 */
const hasSpeedData = computed(() => history.value.length > 0)

/** 分类卡片配置 */
const categoryCards = computed(() => [
  {
    label: '下载中',
    icon: 'i-lucide-download',
    color: 'text-blue-500',
    count: store.downloadingCount,
  },
  {
    label: '做种',
    icon: 'i-lucide-upload',
    color: 'text-emerald-500',
    count: store.seedingCount,
  },
  {
    label: '暂停',
    icon: 'i-lucide-pause',
    color: 'text-amber-500',
    count: store.pausedCount,
  },
  {
    label: '已完成',
    icon: 'i-lucide-check-circle',
    color: 'text-emerald-500',
    count: store.completedCount,
  },
])

/** 存储概览 */
const totalSize = computed(() => store.totalSize)
const totalDownloaded = computed(() => store.totalDownloaded)
const remaining = computed(() => Math.max(0, totalSize.value - totalDownloaded.value))
const downloadPercent = computed(() => {
  if (totalSize.value === 0) return 0
  return Math.min(100, (totalDownloaded.value / totalSize.value) * 100)
})

/** 种子总数 */
const totalCount = computed(() => store.torrents.length)
</script>

<template>
  <div class="stats-overview bg-default border border-default rounded-lg p-4">
    <div class="relative">
      <!-- 折叠/展开按钮 -->
      <UButton
        :icon="collapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
        color="neutral"
        variant="ghost"
        size="sm"
        class="absolute right-0 top-0"
        :aria-label="collapsed ? '展开' : '折叠'"
        @click="toggleCollapse"
      />

      <!-- 折叠时：一行摘要 -->
      <div
        v-if="collapsed"
        class="flex flex-wrap items-center gap-x-6 gap-y-2 pr-10"
      >
        <div class="flex items-center gap-1.5 text-sm">
          <UIcon name="i-lucide-arrow-down" class="size-4 text-blue-500" />
          <span class="text-muted">下载</span>
          <span class="font-medium tabular-nums text-blue-500">{{ formatSpeed(store.dlSpeed) }}</span>
        </div>
        <div class="flex items-center gap-1.5 text-sm">
          <UIcon name="i-lucide-arrow-up" class="size-4 text-emerald-500" />
          <span class="text-muted">上传</span>
          <span class="font-medium tabular-nums text-emerald-500">{{ formatSpeed(store.upSpeed) }}</span>
        </div>
        <div class="flex items-center gap-1.5 text-sm">
          <UIcon name="i-lucide-files" class="size-4 text-muted" />
          <span class="text-muted">种子总数</span>
          <span class="font-medium tabular-nums text-default">{{ totalCount }}</span>
        </div>
      </div>

      <!-- 展开时：完整面板 -->
      <div v-else class="flex flex-col gap-4 pr-8">
        <!-- 标题 -->
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-activity" class="size-4 text-primary" />
          <h3 class="m-0 text-sm font-semibold text-default">统计概览</h3>
        </div>

        <!-- 速度曲线 SVG -->
        <div class="flex flex-col gap-2">
          <div class="relative">
            <svg
              v-if="hasSpeedData"
              :viewBox="`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`"
              preserveAspectRatio="none"
              class="w-full h-[120px] bg-elevated/50 rounded-md border border-default"
              role="img"
              aria-label="速度历史曲线"
            >
              <!-- 网格线 -->
              <line
                v-for="i in 3"
                :key="i"
                :x1="0"
                :x2="SVG_WIDTH"
                :y1="(SVG_HEIGHT / 4) * i"
                :y2="(SVG_HEIGHT / 4) * i"
                stroke="currentColor"
                stroke-opacity="0.08"
                stroke-width="1"
              />
              <!-- 下载速度折线 -->
              <polyline
                :points="dlPoints"
                fill="none"
                stroke="#3b82f6"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
              <!-- 上传速度折线 -->
              <polyline
                :points="upPoints"
                fill="none"
                stroke="#10b981"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
            </svg>
            <!-- 无数据占位 -->
            <div
              v-else
              class="flex items-center justify-center w-full h-[120px] bg-elevated/50 rounded-md border border-default text-sm text-muted"
            >
              暂无速度数据
            </div>
          </div>
          <!-- 图例：下载 / 上传 + 当前速度值 -->
          <div class="flex items-center gap-4 text-xs">
            <div class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-0.5 rounded bg-blue-500" />
              <span class="text-muted">下载</span>
              <span class="font-medium tabular-nums text-blue-500">{{ formatSpeed(store.dlSpeed) }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-0.5 rounded bg-emerald-500" />
              <span class="text-muted">上传</span>
              <span class="font-medium tabular-nums text-emerald-500">{{ formatSpeed(store.upSpeed) }}</span>
            </div>
          </div>
        </div>

        <!-- 分类分布卡片 -->
        <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div
            v-for="card in categoryCards"
            :key="card.label"
            class="flex items-center gap-2 bg-elevated/50 rounded-lg p-3 border border-default"
          >
            <UIcon :name="card.icon" class="size-5 shrink-0" :class="card.color" />
            <div class="flex flex-col min-w-0">
              <span class="text-lg font-semibold tabular-nums text-default leading-tight">{{ card.count }}</span>
              <span class="text-xs text-muted truncate">{{ card.label }}</span>
            </div>
          </div>
        </div>

        <!-- 存储概览 -->
        <div class="flex flex-col gap-2 bg-elevated/50 rounded-lg p-3 border border-default">
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted">存储概览</span>
            <span class="tabular-nums text-default">{{ downloadPercent.toFixed(1) }}%</span>
          </div>
          <!-- 进度条 -->
          <div class="h-2 w-full rounded-full bg-default overflow-hidden">
            <div
              class="h-full rounded-full bg-primary transition-all duration-300"
              :style="{ width: `${downloadPercent}%` }"
            />
          </div>
          <!-- 3 个指标：总大小 / 已下载 / 剩余 -->
          <div class="grid grid-cols-3 gap-2 mt-1 text-xs">
            <div class="flex flex-col">
              <span class="text-muted">总大小</span>
              <span class="font-medium tabular-nums text-default">{{ formatSize(totalSize) }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-muted">已下载</span>
              <span class="font-medium tabular-nums text-emerald-500">{{ formatSize(totalDownloaded) }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-muted">剩余</span>
              <span class="font-medium tabular-nums text-default">{{ formatSize(remaining) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
