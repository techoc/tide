<script setup lang="ts">
import type { Torrent } from '@/types/qbittorrent'
import { useTorrentListStore } from '@/stores/torrentList'
import { formatSize, formatSpeed, formatEta, formatRatio, formatProgress } from '@/utils/format'
import { getStateMeta } from '@/utils/state'

const props = defineProps<{
  showDetail?: (hash: string) => void
}>()

const store = useTorrentListStore()

function progressColor(progress: number): 'success' | 'primary' | 'warning' | 'error' {
  if (progress >= 1) return 'success'
  if (progress >= 0.5) return 'primary'
  if (progress >= 0.1) return 'warning'
  return 'error'
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="torrent in store.sortedTorrents"
      :key="torrent.hash"
      class="p-3 rounded-lg border bg-elevated cursor-pointer transition-colors active:bg-primary/10"
      :class="store.selectedHashes.has(torrent.hash) ? 'border-primary/50 bg-primary/5' : 'border-default'"
      @click="props.showDetail?.(torrent.hash)"
    >
      <!-- 顶部：勾选 + 名称 + 状态图标 -->
      <div class="flex items-start gap-2 mb-2.5">
        <UCheckbox
          :model-value="store.selectedHashes.has(torrent.hash)"
          @update:model-value="(v: boolean | 'indeterminate') => { if (v !== 'indeterminate') store.toggleSelect(torrent.hash, v) }"
          @click.stop
        />
        <div class="flex-1 text-sm font-medium leading-snug line-clamp-2">
          {{ torrent.name }}
        </div>
        <div class="shrink-0 grid place-items-center">
          <UIcon
            :name="getStateMeta(torrent.state).icon"
            class="size-5"
            :style="{ color: getStateMeta(torrent.state).color }"
          />
        </div>
      </div>

      <!-- 进度条 -->
      <div class="mb-2.5">
        <UProgress
          :model-value="formatProgress(torrent.progress)"
          :color="progressColor(torrent.progress)"
          size="sm"
        />
        <div class="flex justify-between mt-1 text-xs text-muted tabular-nums">
          <span>{{ formatProgress(torrent.progress) }}%</span>
          <span>{{ formatSize(torrent.size) }}</span>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="grid grid-cols-4 gap-1">
        <div class="flex flex-col gap-0.5">
          <span class="text-[11px] text-muted">↓</span>
          <span
            class="text-xs tabular-nums"
            :class="torrent.dlspeed > 0 ? 'text-primary' : 'text-toned'"
          >
            {{ torrent.dlspeed > 0 ? formatSpeed(torrent.dlspeed) : '—' }}
          </span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-[11px] text-muted">↑</span>
          <span
            class="text-xs tabular-nums"
            :class="torrent.upspeed > 0 ? 'text-primary' : 'text-toned'"
          >
            {{ torrent.upspeed > 0 ? formatSpeed(torrent.upspeed) : '—' }}
          </span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-[11px] text-muted">剩余</span>
          <span class="text-xs tabular-nums text-toned">
            {{ torrent.eta > 0 ? formatEta(torrent.eta) : '∞' }}
          </span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-[11px] text-muted">比率</span>
          <span class="text-xs tabular-nums text-toned">
            {{ formatRatio(torrent.ratio) }}
          </span>
        </div>
      </div>

      <!-- 标签 -->
      <div
        v-if="torrent.tags"
        class="flex flex-wrap gap-1 mt-2"
      >
        <UBadge
          v-for="tag in torrent.tags.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3)"
          :key="tag"
          :label="tag"
          color="primary"
          variant="subtle"
          size="sm"
        />
      </div>
    </div>
  </div>
</template>
