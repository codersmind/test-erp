import { AlertCircle, X } from 'lucide-react'

interface ErrorDialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
}

export const ErrorDialog = ({
  isOpen,
  onClose,
  title = 'Error',
  message,
}: ErrorDialogProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Dialog */}
        <div className="relative z-50 w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all dark:bg-slate-800">
          {/* Header with icon */}
          <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-5 dark:from-red-900/20 dark:to-red-800/20">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/50 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-slate-500 dark:hover:bg-slate-700/50 dark:hover:text-slate-300"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Message content */}
          <div className="px-6 py-5">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
          </div>

          {/* Footer with button */}
          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:scale-95 dark:focus:ring-offset-slate-800"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

