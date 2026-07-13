<script setup lang="ts">
defineOptions({ name: 'StatsView' })

import StatsOverview from '@/components/torrent/StatsOverview.vue'
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
    <!-- 页头 -->
    <div class="mb-5 flex items-center gap-3">
      <div class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <UIcon name="i-lucide-chart-no-axes-combined" class="size-5" />
      </div>
      <div>
        <h1 class="m-0 text-xl font-bold tracking-tight sm:text-2xl">统计概览</h1>
        <p class="m-0 mt-0.5 text-sm text-muted">查看全局速度、分类分布与存储概览</p>
      </div>
    </div>

    <!-- 统计概览组件 -->
    <StatsOverview />
    </div>
  </div>
</template>
