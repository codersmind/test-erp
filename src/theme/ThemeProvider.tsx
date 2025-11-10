import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'erp:theme'

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  return mediaQuery.matches ? 'dark' : 'light'
}

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = (value: Theme) => setThemeState(value)
  const toggleTheme = () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'))

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme,
      setTheme,
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

