import { AlertTriangle, X } from 'lucide-react'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmButtonColor?: 'red' | 'blue'
}

export const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Yes',
  cancelText = 'No',
  confirmButtonColor = 'red',
}: ConfirmationDialogProps) => {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const confirmButtonClass =
    confirmButtonColor === 'red'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'

  const headerBgClass =
    confirmButtonColor === 'red'
      ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
      : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'

  const iconBgClass =
    confirmButtonColor === 'red'
      ? 'bg-red-100 dark:bg-red-900/30'
      : 'bg-blue-100 dark:bg-blue-900/30'

  const iconColorClass =
    confirmButtonColor === 'red'
      ? 'text-red-600 dark:text-red-400'
      : 'text-blue-600 dark:text-blue-400'

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
          <div className={`${headerBgClass} px-6 py-5`}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBgClass}`}>
                  <AlertTriangle className={`h-6 w-6 ${iconColorClass}`} strokeWidth={2.5} />
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

          {/* Footer with buttons */}
          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-800"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 dark:focus:ring-offset-slate-800 ${confirmButtonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

