// composables/useTheme.ts
import { ref, computed, onMounted } from 'vue'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'go-theme'
const DEFAULT_THEME: Theme = 'light'

// Estado compartido (singleton pattern — fuera del composable)
const currentTheme = ref<Theme>(DEFAULT_THEME)

export function useTheme() {
  const isDark = computed(() => currentTheme.value === 'dark')
  const isLight = computed(() => currentTheme.value === 'light')

  function applyTheme(theme: Theme) {
    currentTheme.value = theme
    if (process.client) {
      document.documentElement.classList.toggle('light', theme === 'light')
      localStorage.setItem(STORAGE_KEY, theme)
    }
  }

  function toggle() {
    applyTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
  }

  onMounted(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    const systemPrefers = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved: Theme = saved ?? (systemPrefers ? 'dark' : 'light')
    applyTheme(resolved)
  })

  return { currentTheme, isDark, isLight, toggle, applyTheme }
}
