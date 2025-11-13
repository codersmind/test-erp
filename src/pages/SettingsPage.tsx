import { useEffect, useState } from 'react'

import { db } from '../db/database'
import { useSync } from '../sync/SyncProvider'
import { getTaxRate, setTaxRate } from '../utils/taxSettings'

export const SettingsPage = () => {
  const { lastSyncedAt, pendingCount } = useSync()
  const [isResetting, setIsResetting] = useState(false)
  const [taxRate, setTaxRateState] = useState(0)
  const [isSavingTax, setIsSavingTax] = useState(false)

  useEffect(() => {
    getTaxRate().then((rate) => {
      setTaxRateState(rate)
    })
  }, [])

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

  const handleTaxRateChange = async (newRate: number) => {
    setTaxRateState(newRate)
    setIsSavingTax(true)
    try {
      await setTaxRate(newRate)
    } finally {
      setIsSavingTax(false)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold">Tax settings</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Set the default sales tax rate (percentage). This rate will be applied to all new sales orders.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Tax Rate (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(event) => handleTaxRateChange(Number.parseFloat(event.target.value) || 0)}
              className="w-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            />
          </label>
          {isSavingTax && <span className="text-xs text-slate-500">Saving...</span>}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Example: 10% tax rate means $100 subtotal = $10 tax = $110 total
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
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

      <section className="rounded-xl border border-red-200 bg-white p-4 shadow-sm dark:border-red-800/60 dark:bg-slate-900 sm:p-6">
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
