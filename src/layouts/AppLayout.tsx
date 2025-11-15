import { NavLink, Outlet } from 'react-router-dom'

import { ManualSyncButton } from '../components/ManualSyncButton'
import { SyncStatus } from '../components/SyncStatus'
import { ThemeToggleButton } from '../components/ThemeToggleButton'
import { SettingsInitializer } from '../components/SettingsInitializer'
import { useAuth } from '../auth/AuthProvider'
import { BackgroundSyncManager } from '../sync/BackgroundSyncManager'
import { getDesiredFolderName } from '../sync/googleDriveClient'

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
      <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-50">
      {/* BackgroundSyncManager placement might need adjustment based on where it truly belongs (it usually runs after sign-in) 
          For now, keeping it at the top level as in your original code. */}
      <BackgroundSyncManager /> 

      <header className="border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">{getDesiredFolderName()}</h1>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {/* The Sign-In Card */}
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-2xl transition dark:border-gray-800 dark:bg-gray-900/90 dark:shadow-2xl dark:shadow-indigo-900/20">
          <div className="text-center">
            {/* Logo/Icon placeholder can go here */}
            {/* <div className="mx-auto h-12 w-12 text-indigo-600 dark:text-indigo-400">
                <svg>...</svg>
            </div> */}
            
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to manage your inventory and sales.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Unlock offline data sync and secure Drive backups.
            </p>
            
            {/* Primary Sign-in Button */}
            <button
              type="button"
              onClick={signIn}
              className="flex w-full items-center justify-center rounded-lg border border-indigo-500 bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-lg transition duration-150 hover:bg-indigo-500 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:ring-offset-gray-950"
            >
              {/* Google Icon can be added here (e.g., using lucide-react or similar) */}
              <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">...</svg>
              Sign in with Google
            </button>

            {/* Theme Toggle is now less prominent, as it's a secondary action */}
            <div className="flex justify-center pt-2">
                <ThemeToggleButton />
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              We use secure Firebase Auth to verify your Google account and request Drive permissions only once for backups.
            </p>
            {/* <p className="mt-2 text-xs text-red-500 dark:text-red-400">
              * Remember to add your Firebase keys and allowed origins for proper setup.
            </p> */}
          </div>
        </div>
      </main>
    </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50">
      <BackgroundSyncManager />
      <SettingsInitializer />
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

