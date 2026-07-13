/// <reference types="vite/client" />

declare module '#imports' {
  export const useColorMode: () => {
    preference: 'dark' | 'light' | 'system'
    readonly value: 'dark' | 'light'
    forced: boolean
  }
}
