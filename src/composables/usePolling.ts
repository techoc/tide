import { onBeforeUnmount, onMounted, ref, shallowRef, watch, type Ref } from 'vue'

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
  const error = shallowRef<unknown>(null)

  async function tick() {
    if (running.value) return
    running.value = true
    try {
      await fn()
      error.value = null
    } catch (reason) {
      // 定时任务由计时器触发，错误不能继续向外抛出，否则会形成未处理的 Promise 拒绝。
      error.value = reason
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
    void tick()
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

  return { running, error, start, stop, restart }
}

/** 简单的只读 ref 标记，便于在模板中使用 */
export type { Ref }

