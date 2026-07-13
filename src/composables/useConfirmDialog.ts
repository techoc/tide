import { ref } from 'vue'

interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'error'
}

export function useConfirmDialog() {
  const isOpen = ref(false)
  const options = ref<ConfirmOptions>({ title: '' })
  let resolveFn: ((value: boolean) => void) | null = null

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = opts
    isOpen.value = true
    return new Promise((resolve) => {
      resolveFn = resolve
    })
  }

  function handleConfirm() {
    isOpen.value = false
    resolveFn?.(true)
    resolveFn = null
  }

  function handleCancel() {
    isOpen.value = false
    resolveFn?.(false)
    resolveFn = null
  }

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
