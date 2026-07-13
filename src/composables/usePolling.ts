import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

/**
 * 通用轮询 composable：定时执行任务，组件卸载时自动停止。
 * @param fn 要轮询执行的函数
 * @param interval 轮询间隔（毫秒），支持数字或响应式 Ref
 */
export function usePolling(
  fn: () => Promise<void> | void,
  interval: number | Ref<number>,
) {
  let timer: ReturnType<typeof setInterval> | null = null
  const running = ref(false)

  async function tick() {
    if (running.value) return
    running.value = true
    try {
      await fn()
    } finally {
      running.value = false
    }
  }

  function getInterval(): number {
    return typeof interval === 'number' ? interval : interval.value
  }

  function start() {
    if (timer) return
    const ms = getInterval()
    if (ms <= 0) return
    // 立即执行一次
    tick()
    timer = setInterval(tick, ms)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  /** 重启定时器（interval 变化时调用） */
  function restart() {
    stop()
    start()
  }

  onMounted(start)
  onBeforeUnmount(stop)

  // 如果 interval 是响应式 Ref，监听变化并重启
  if (typeof interval !== 'number') {
    watch(interval, () => restart())
  }

  return { running, start, stop, restart }
}

/** 简单的只读 ref 标记，便于在模板中使用 */
export type { Ref }

