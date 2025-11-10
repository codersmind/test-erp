import { useTheme } from '../theme/ThemeProvider'

export const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border border-slate-400/30 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  )
}

