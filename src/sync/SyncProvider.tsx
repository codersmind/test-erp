import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { useAuth } from '../auth/AuthProvider'
import { listPendingSyncRecords, markRecordsSynced } from '../db/localDataService'
import { db } from '../db/database'
import { nowIso } from '../db/utils'
import { buildLocalSnapshot, downloadSnapshotFromDrive, uploadSnapshotToDrive } from './googleDriveClient'
import { applySnapshotToLocal, mergeSnapshots } from './snapshotMerge'

interface SyncContextValue {
  pendingCount: number
  lastSyncedAt: string | null
  isSyncing: boolean
  syncError: string | null
  triggerSync: () => Promise<void>
}

export const SyncContext = createContext<SyncContextValue | undefined>(undefined)

const LAST_SYNC_KEY = 'erp:lastSyncedAt'

export const SyncProvider = ({ children }: PropsWithChildren) => {
  const { ensureDriveAccess } = useAuth()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => localStorage.getItem(LAST_SYNC_KEY))
  const [syncError, setSyncError] = useState<string | null>(null)

  const pendingRecords = useLiveQuery(
    async () => {
      const records = await db.syncQueue.filter((record) => !record.syncedAt).toArray()
      return records.length
    },
    [],
    0,
  )

  const triggerSync = useCallback(async () => {
    if (isSyncing) return

    setIsSyncing(true)
    setSyncError(null)

    try {
      const accessToken = await ensureDriveAccess()
      if (!accessToken) {
        throw new Error('Drive access token unavailable')
      }

      const pending = await listPendingSyncRecords()
      const localSnapshot = await buildLocalSnapshot()
      const remoteSnapshot = await downloadSnapshotFromDrive(accessToken)
      const mergedSnapshot = remoteSnapshot ? mergeSnapshots(localSnapshot, remoteSnapshot) : localSnapshot

      await applySnapshotToLocal(mergedSnapshot)

      await uploadSnapshotToDrive(accessToken, mergedSnapshot)

      if (pending.length > 0) {
        await markRecordsSynced(pending.map((record) => record.id))
      }

      const completedAt = nowIso()
      setLastSyncedAt(completedAt)
      localStorage.setItem(LAST_SYNC_KEY, completedAt)
    } catch (error) {
      console.error('Manual sync failed', error)
      setSyncError(error instanceof Error ? error.message : 'Unknown sync failure')
      throw error
    } finally {
      setIsSyncing(false)
    }
  }, [ensureDriveAccess, isSyncing])

  const value = useMemo<SyncContextValue>(
    () => ({
      pendingCount: pendingRecords ?? 0,
      lastSyncedAt,
      isSyncing,
      syncError,
      triggerSync,
    }),
    [pendingRecords, lastSyncedAt, isSyncing, syncError, triggerSync],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

