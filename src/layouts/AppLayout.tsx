import { NavLink, Outlet } from 'react-router-dom'

import { ManualSyncButton } from '../components/ManualSyncButton'
import { SyncStatus } from '../components/SyncStatus'
import { ThemeToggleButton } from '../components/ThemeToggleButton'
import { useAuth } from '../auth/AuthProvider'
import { BackgroundSyncManager } from '../sync/BackgroundSyncManager'

const navigation = [
  { to: '/', label: 'Dashboard' },
  { to: '/customers', label: 'Customers' },
  { to: '/products', label: 'Products' },
  { to: '/sales', label: 'Sales orders' },
  { to: '/purchases', label: 'Purchase orders' },
  { to: '/settings', label: 'Settings' },
]

export const AppLayout = () => {
  const { user, isLoading, signIn, signOut } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <p>Loading session…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50">
        <BackgroundSyncManager />
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-6 text-center">
            <h1 className="text-2xl font-semibold">BookStore ERP</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sign in with Google to unlock offline data sync and Drive backups.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={signIn}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                Sign in with Google
              </button>
              <ThemeToggleButton />
            </div>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-md space-y-4 text-center text-sm text-slate-600 dark:text-slate-300">
            <p>
              We use Firebase Auth to verify your Google account and request Drive permissions only once. Your offline
              data remains on this device until you trigger a manual sync.
            </p>
            <p className="text-xs text-slate-500">
              Add your Firebase keys and allowed localhost origins in the Firebase console to complete the setup.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50">
      <BackgroundSyncManager />
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">BookStore ERP</h1>
            <SyncStatus />
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <ManualSyncButton />
              <ThemeToggleButton />
            </div>
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900/70">
              {user ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="leading-tight">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={signIn}
                  className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Sign in with Google
                </button>
              )}
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4 pb-3 text-sm font-medium md:hidden">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-1 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-60 border-r border-slate-200 bg-white/60 px-3 py-6 dark:border-slate-800 dark:bg-slate-900/60 md:block">
          <nav className="space-y-1 text-sm font-medium">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

