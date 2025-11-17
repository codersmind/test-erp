import { useEffect, useState } from 'react'

interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseNotes?: string
}

interface DownloadProgress {
  percent: number
  transferred: number
  total: number
}

declare global {
  interface Window {
    electronUpdater?: {
      checkForUpdates: () => Promise<{ success: boolean; error?: string }>
      restartApp: () => Promise<void>
      getVersion: () => Promise<string>
      onUpdateChecking: (callback: () => void) => () => void
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
      onUpdateNotAvailable: (callback: (info: { version: string }) => void) => () => void
      onUpdateError: (callback: (error: { message: string }) => void) => () => void
      onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void
      onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void
    }
  }
}

export const UpdateStatus = () => {
  const [isChecking, setIsChecking] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState<UpdateInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!window.electronUpdater) return

    // Set up event listeners
    const cleanupChecking = window.electronUpdater.onUpdateChecking(() => {
      setIsChecking(true)
      setError(null)
    })

    const cleanupAvailable = window.electronUpdater.onUpdateAvailable((info) => {
      setUpdateAvailable(info)
      setIsChecking(false)
      setIsDownloading(true)
      setError(null)
    })

    const cleanupNotAvailable = window.electronUpdater.onUpdateNotAvailable(() => {
      setIsChecking(false)
      setError(null)
    })

    const cleanupError = window.electronUpdater.onUpdateError((err) => {
      setError(err.message)
      setIsChecking(false)
      setIsDownloading(false)
    })

    const cleanupProgress = window.electronUpdater.onDownloadProgress((progress) => {
      setDownloadProgress(progress)
    })

    const cleanupDownloaded = window.electronUpdater.onUpdateDownloaded((info) => {
      setUpdateDownloaded(info)
      setIsDownloading(false)
      setDownloadProgress(null)
    })

    return () => {
      cleanupChecking()
      cleanupAvailable()
      cleanupNotAvailable()
      cleanupError()
      cleanupProgress()
      cleanupDownloaded()
    }
  }, [])

  const handleRestart = async () => {
    if (window.electronUpdater) {
      await window.electronUpdater.restartApp()
    }
  }

  const handleCheckForUpdates = async () => {
    if (!window.electronUpdater) return
    setError(null)
    setUpdateAvailable(null)
    setUpdateDownloaded(null)
    setDownloadProgress(null)
    const result = await window.electronUpdater.checkForUpdates()
    if (!result.success && result.error) {
      setError(result.error)
    }
  }

  // Don't show anything if not in Electron or no updates
  if (!window.electronUpdater) return null

  // Show update downloaded prompt
  if (updateDownloaded) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border border-green-200 bg-green-50 p-4 shadow-lg dark:border-green-800 dark:bg-green-900/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-green-900 dark:text-green-300">Update Ready</h3>
            <p className="mt-1 text-xs text-green-700 dark:text-green-400">
              Version {updateDownloaded.version} has been downloaded and is ready to install.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleRestart}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              >
                Restart Now
              </button>
              <button
                onClick={() => setUpdateDownloaded(null)}
                className="rounded-md border border-green-300 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-50 dark:border-green-700 dark:bg-slate-800 dark:text-green-300 dark:hover:bg-slate-700"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show downloading progress
  if (isDownloading && downloadProgress) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-lg dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Downloading Update</h3>
            {updateAvailable && (
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                Downloading version {updateAvailable.version}...
              </p>
            )}
            <div className="mt-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 dark:bg-blue-400"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">{downloadProgress.percent}%</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show update available
  if (updateAvailable && !isDownloading) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-lg dark:border-yellow-800 dark:bg-yellow-900/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">Update Available</h3>
            <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
              Version {updateAvailable.version} is available. Download will start automatically...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show checking status
  if (isChecking) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 animate-spin text-slate-600 dark:text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-sm text-slate-700 dark:text-slate-300">Checking for updates...</p>
        </div>
      </div>
    )
  }

  // Show error
  if (error) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border border-red-200 bg-red-50 p-4 shadow-lg dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-300">Update Error</h3>
            <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={handleCheckForUpdates}
              className="mt-2 text-xs font-semibold text-red-600 underline hover:text-red-700 dark:text-red-400"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

