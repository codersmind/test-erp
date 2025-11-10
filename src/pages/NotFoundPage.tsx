import { Link } from 'react-router-dom'

export const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center text-slate-700 dark:bg-slate-950 dark:text-slate-200">
      <p className="text-sm uppercase tracking-widest text-slate-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        The page you&apos;re looking for is not available. Return to the dashboard to continue working offline.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
      >
        Go to dashboard
      </Link>
    </div>
  )
}

