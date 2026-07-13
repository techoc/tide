import { ref } from 'vue'

/**
 * 全局添加种子弹窗状态（单例）。
 * 让顶部操作栏与各视图都能触发同一弹窗。
 */
const show = ref(false)

export function useAddTorrentModal() {
  function open() {
    show.value = true
  }
  function close() {
    show.value = false
  }
  return { show, open, close }
}
