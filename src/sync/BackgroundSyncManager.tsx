import { useEffect, useRef } from 'react'

import { useAuth } from '../auth/AuthProvider'
import { useSync } from './SyncProvider'

const SERVICE_WORKER_PATH = '/sw.js'

export const BackgroundSyncManager = () => {
  const { ensureDriveAccess, user } = useAuth()
  const { pendingCount, triggerSync, isSyncing } = useSync()
  const lastSyncResult = useRef<'success' | 'error' | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(SERVICE_WORKER_PATH)
        .catch((error) => console.warn('Service worker registration failed', error))
    }
  }, [])

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        /* ignore */
      })
    }
  }, [])

  useEffect(() => {
    const handleOnline = async () => {
      if (!navigator.onLine || isSyncing || pendingCount === 0 || !user) return
      try {
        await ensureDriveAccess()
        await triggerSync()
        lastSyncResult.current = 'success'
        if (Notification.permission === 'granted') {
          new Notification('BookStore ERP', {
            body: 'Background sync completed successfully.',
          })
        }
      } catch (error) {
        lastSyncResult.current = 'error'
        console.warn('Background sync failed', error)
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [ensureDriveAccess, isSyncing, pendingCount, triggerSync, user])

  return null
}

