import { useSync } from '../sync/useSync'
import { formatDistanceToNowStrict } from '../utils/time'

export const SyncStatus = () => {
  const { lastSyncedAt, syncError } = useSync()

  return (
    <div className="text-xs text-slate-500 dark:text-slate-400">
      {syncError ? (
        <span className="text-red-500">Sync failed: {syncError}</span>
      ) : lastSyncedAt ? (
        <span>Last sync {formatDistanceToNowStrict(lastSyncedAt)} ago</span>
      ) : (
        <span>No sync history</span>
      )}
    </div>
  )
}

