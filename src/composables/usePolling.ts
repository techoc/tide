import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * 通用轮询 composable：定时执行任务，组件卸载时自动停止。
 * @param fn 要轮询执行的函数
 * @param interval 轮询间隔（毫秒）
 */
export function usePolling(fn: () => Promise<void> | void, interval: number) {
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

  function start() {
    if (timer) return
    // 立即执行一次
    tick()
    timer = setInterval(tick, interval)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onMounted(start)
  onBeforeUnmount(stop)

  return { running, start, stop }
}

/** 简单的只读 ref 标记，便于在模板中使用 */
export type { Ref }
