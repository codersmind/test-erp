import { NavLink, Outlet } from 'react-router-dom'

import { ManualSyncButton } from '../components/ManualSyncButton'
import { SyncStatus } from '../components/SyncStatus'
import { ThemeToggleButton } from '../components/ThemeToggleButton'
import { SettingsInitializer } from '../components/SettingsInitializer'
import { UpdateStatus } from '../components/UpdateStatus'
import { useAuth } from '../auth/AuthProvider'
import { BackgroundSyncManager } from '../sync/BackgroundSyncManager'
// import { getDesiredFolderName } from '../sync/googleDriveClient'

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
     <div className="flex min-h-screen bg-white transition-colors dark:bg-gray-950">
      <BackgroundSyncManager />

      {/* --- Left Side: Branding and Value Proposition (Visual Area) --- */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 bg-indigo-700 dark:bg-gray-900 relative overflow-hidden">
        {/* Subtle Background Pattern/Shape for Visual Interest */}
        <svg className="absolute inset-0 h-full w-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
            <pattern id="pattern-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 L 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-indigo-600 dark:text-gray-700" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#pattern-grid)" />
        </svg>

        {/* Content */}
        <div className="relative z-10 max-w-lg text-white">
          <h1 className="text-4xl font-extrabold tracking-tight">
            BookStore ERP: Inventory Simplified.
          </h1>
          <p className="mt-4 text-lg font-light opacity-80">
            Streamline your orders, track real-time stock levels, and automate your accounting—all in one place.
          </p>
          <ul className="mt-6 space-y-3 text-sm font-medium">
            <li className="flex items-center">
              <span className="text-yellow-300 mr-2">✓</span> Real-time Sync
            </li>
            <li className="flex items-center">
              <span className="text-yellow-300 mr-2">✓</span> Secure Drive Backups
            </li>
            <li className="flex items-center">
              <span className="text-yellow-300 mr-2">✓</span> Offline Access
            </li>
          </ul>
        </div>
      </div>
      
      {/* --- Right Side: Sign-In Form (Interaction Area) --- */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 lg:w-1/2">
        
        {/* Top Bar for Theme Toggle and Title on Mobile */}
        <div className="absolute top-0 right-0 p-4 flex items-center gap-4 w-full justify-between lg:justify-end">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white lg:hidden">BookStore ERP</h2>
            <ThemeToggleButton />
        </div>

        <div className="w-full max-w-sm">
          {/* Main Title (Visible on larger screens) */}
          <h2 className="hidden lg:block text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Sign In
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Access your complete book inventory management system.
          </p>
          
          <div className="mt-8 space-y-6">
            
            {/* The Main Action Button */}
            <button
              type="button"
              onClick={signIn}
              className="flex w-full items-center justify-center rounded-xl border border-blue-500 bg-blue-600 px-6 py-3 text-lg font-bold text-white shadow-xl transition duration-150 hover:bg-blue-500 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 dark:ring-offset-gray-950"
            >
              {/* Google Icon SVG Placeholder */}
              <svg className="mr-3 h-6 w-6" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">...</svg>
              Sign in with Google
            </button>

            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500 dark:bg-gray-950 dark:text-gray-400">
                  Secure access
                </span>
              </div>
            </div>
          </div>
          
          {/* Footer Notes */}
          <div className="mt-10 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              We use Firebase Auth and request Drive permissions only once for data backups.
            </p>
            {/* <p className="mt-2 text-xs text-red-500 dark:text-red-400">
              Dev Note: Add your Firebase keys and allowed origins to complete setup.
            </p> */}
          </div>
        </div>
      </div>
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
      <UpdateStatus />
    </div>
  )
}

