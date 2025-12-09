import { useState, useCallback, type ReactNode } from 'react'
import { X, Plus } from 'lucide-react'

export interface Tab {
  id: string
  label: string
  content: ReactNode
  isDirty?: boolean // Track if tab has unsaved changes
}

interface TabSystemProps {
  tabs: Tab[]
  onTabAdd: () => void
  onTabClose: (tabId: string) => void
  onTabChange?: (tabId: string) => void
  activeTabId?: string
  defaultLabel?: string
}

export const TabSystem = ({
  tabs,
  onTabAdd,
  onTabClose,
  onTabChange,
  activeTabId,
}: TabSystemProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState<string | null>(tabs[0]?.id || null)
  const activeId = activeTabId || internalActiveTab

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (tabId !== activeId) {
        setInternalActiveTab(tabId)
        onTabChange?.(tabId)
      }
    },
    [activeId, onTabChange],
  )

  const handleCloseTab = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation()
      if (tabs.length === 1) {
        // Don't allow closing the last tab
        return
      }
      const tabIndex = tabs.findIndex((t) => t.id === tabId)
      const isActiveTab = tabId === activeId

      onTabClose(tabId)

      // If we closed the active tab, switch to another tab
      if (isActiveTab && tabs.length > 1) {
        const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : 0
        const newActiveTab = tabs[newActiveIndex === tabIndex ? newActiveIndex + 1 : newActiveIndex]
        if (newActiveTab) {
          setInternalActiveTab(newActiveTab.id)
          onTabChange?.(newActiveTab.id)
        }
      }
    },
    [tabs, activeId, onTabClose, onTabChange],
  )

  const activeTab = tabs.find((t) => t.id === activeId) || tabs[0]

  return (
    <div className="flex h-full flex-col">
      {/* Tab Bar */}
      <div className="flex items-end overflow-x-auto border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex min-w-0 flex-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeId
            return (
              <div
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`group relative flex min-w-0 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'border-blue-600 bg-white text-blue-600 dark:border-blue-400 dark:bg-slate-900 dark:text-blue-400'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200'
                }`}
                style={{ maxWidth: '200px' }}
              >
                <span className="truncate">{tab.label}</span>
                {tab.isDirty && !isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className={`ml-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${
                      isActive
                        ? 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="Close tab"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {/* Add Tab Button */}
        <button
          onClick={onTabAdd}
          className="flex items-center gap-1 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          title="New tab"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">{activeTab?.content}</div>
    </div>
  )
}

