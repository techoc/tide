import { readonly, ref } from 'vue'

/**
 * 速度历史采样点。
 * @property dl 下载速度（bytes/s）
 * @property up 上传速度（bytes/s）
 * @property ts 采样时间戳（毫秒）
 */
export interface SpeedSample {
  dl: number
  up: number
  ts: number
}

/** 环形缓冲最大保留的采样点数量 */
const MAX_SAMPLES = 60

// 模块级变量：保证 useSpeedHistory 作为全局单例，多次调用共享同一份数据
const samples = ref<SpeedSample[]>([])

/**
 * 速度历史记录 composable：用于统计概览面板的速度曲线图。
 * 通过模块级变量实现单例，所有调用方共享同一份采样数据。
 */
export function useSpeedHistory() {
  /**
   * 追加一个速度采样点。
   * 超过上限时按 FIFO 移除最旧的点。
   * @param dl 下载速度（bytes/s）
   * @param up 上传速度（bytes/s）
   */
  function push(dl: number, up: number) {
    samples.value.push({ dl, up, ts: Date.now() })
    if (samples.value.length > MAX_SAMPLES) {
      samples.value.shift()
    }
  }

  /** 清空所有历史采样点 */
  function clear() {
    samples.value = []
  }

  return {
    history: readonly(samples),
    push,
    clear,
  }
}
