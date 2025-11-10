import { useAuth } from '../auth/AuthProvider'
import { useSync } from '../sync/SyncProvider'

export const ManualSyncButton = () => {
  const { ensureDriveAccess } = useAuth()
  const { triggerSync, isSyncing, pendingCount } = useSync()

  const handleClick = async () => {
    try {
      await ensureDriveAccess()
      await triggerSync()
    } catch {
      // error surfaced via context state
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSyncing}
      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
    >
      <span>{isSyncing ? 'Syncing…' : 'Sync now'}</span>
      {pendingCount > 0 && (
        <span className="rounded-full bg-white/20 px-2 text-xs font-semibold">{pendingCount}</span>
      )}
    </button>
  )
}

