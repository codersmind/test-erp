
import { Keyboard, X } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

export const KeyboardShortcutsHelp = ({ isOpen, onClose }: KeyboardShortcutsHelpProps) => {
  // Close on Escape
  useHotkeys('escape', () => {
    if (isOpen) {
      onClose()
    }
  }, { enableOnFormTags: false }, [isOpen, onClose])

  if (!isOpen) return null

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['Ctrl', '1'], description: 'Go to Dashboard' },
        { keys: ['Ctrl', '2'], description: 'Go to Customers' },
        { keys: ['Ctrl', '3'], description: 'Go to Products' },
        { keys: ['Ctrl', '4'], description: 'Go to Sales Orders' },
        { keys: ['Ctrl', '5'], description: 'Go to Purchase Orders' },
        { keys: ['Ctrl', '6'], description: 'Go to Import/Export' },
        { keys: ['Ctrl', '7'], description: 'Go to Settings' },
      ],
    },
    {
      category: 'Tabs',
      items: [
        { keys: ['Ctrl', 'T'], description: 'New Tab' },
        { keys: ['Ctrl', 'W'], description: 'Close Current Tab' },
        { keys: ['Ctrl', 'Tab'], description: 'Next Tab' },
        { keys: ['Ctrl', 'Shift', 'Tab'], description: 'Previous Tab' },
      ],
    },
    {
      category: 'Sales/Purchase Forms',
      items: [
        { keys: ['Ctrl', 'S'], description: 'Save Order' },
        { keys: ['Ctrl', 'N'], description: 'Add New Item' },
        { keys: ['Ctrl', 'Shift', 'C'], description: 'Quick Create Customer/Supplier' },
        { keys: ['Ctrl', 'Shift', 'P'], description: 'Quick Create Product' },
      ],
    },
    {
      category: 'General',
      items: [
        { keys: ['Esc'], description: 'Close Dialog/Modal' },
        { keys: ['?'], description: 'Show Keyboard Shortcuts' },
      ],
    },
  ]

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
        <div className="relative z-50 w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all dark:bg-slate-800">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Keyboard className="h-6 w-6 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Keyboard Shortcuts</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/50 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-500 dark:hover:bg-slate-700/50 dark:hover:text-slate-300"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <div className="space-y-6">
              {shortcuts.map((category) => (
                <div key={category.category}>
                  <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {category.category}
                  </h4>
                  <div className="space-y-2">
                    {category.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/50"
                      >
                        <span className="text-sm text-slate-600 dark:text-slate-400">{item.description}</span>
                        <div className="flex items-center gap-1.5">
                          {item.keys.map((key, keyIndex) => (
                            <span key={keyIndex}>
                              <kbd className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {key}
                              </kbd>
                              {keyIndex < item.keys.length - 1 && (
                                <span className="mx-1 text-xs text-slate-400">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 dark:focus:ring-offset-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

