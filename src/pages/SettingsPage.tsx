import { useState } from 'react'

import { db } from '../db/database'
import { useSync } from '../sync/SyncProvider'

export const SettingsPage = () => {
  const { lastSyncedAt, pendingCount } = useSync()
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    if (!window.confirm('Clear all local data? This cannot be undone.')) return
    setIsResetting(true)
    try {
      await db.delete()
      window.location.reload()
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Google integration</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This starter keeps data offline in IndexedDB. Replace the stub in <code>sync/googleDriveClient.ts</code> with a
          call to the Google Drive API. Store the OAuth token securely and reuse it for manual sync.
        </p>
        <div className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
          <p>Pending sync items: {pendingCount}</p>
          <p>Last synced at: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}</p>
        </div>
      </section>
      <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-800/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger zone</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Clear all offline data if you need a fresh start. Any unsynced records will be lost.
        </p>
        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting}
          className="mt-4 inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-400"
        >
          {isResetting ? 'Clearing…' : 'Clear local data'}
        </button>
      </section>
    </div>
  )
}

