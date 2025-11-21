import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react'
import type { DateFilter } from '../utils/exportUtils'
import Datepicker from 'react-tailwindcss-datepicker'

interface ExportDropdownProps {
  onExportExcel: (dateFilter?: DateFilter) => Promise<void>
  onExportCSV: (dateFilter?: DateFilter) => Promise<void>
  onExportBoth?: (dateFilter?: DateFilter) => Promise<void>
  label?: string
}

export const ExportDropdown = ({
  onExportExcel,
  onExportCSV,
  onExportBoth,
  label = 'Export',
}: ExportDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>({})
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowDateFilter(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = async (exportFn: (dateFilter?: DateFilter) => Promise<void>, withDateFilter: boolean) => {
    if (withDateFilter) {
      setShowDateFilter(true)
      setIsOpen(false)
      return
    }
    await exportFn()
    setIsOpen(false)
  }

  const handleExportWithFilter = async (exportFn: (dateFilter?: DateFilter) => Promise<void>) => {
    const filter = dateFilter.startDate || dateFilter.endDate ? dateFilter : undefined
    await exportFn(filter)
    setShowDateFilter(false)
    setDateFilter({})
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-800">
          <div className="py-1">
            <button
              onClick={() => handleExport(onExportExcel, false)}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </button>
            <button
              onClick={() => handleExport(onExportCSV, false)}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <FileText className="h-4 w-4" />
              Export to CSV
            </button>
            {onExportBoth && (
              <button
                onClick={() => handleExport(onExportBoth, false)}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Download className="h-4 w-4" />
                Export Both (Excel + CSV)
              </button>
            )}
            <div className="border-t border-slate-200 dark:border-slate-700" />
            <button
              onClick={() => handleExport(onExportExcel, true)}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel (with Date Filter)
            </button>
            <button
              onClick={() => handleExport(onExportCSV, true)}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <FileText className="h-4 w-4" />
              Export CSV (with Date Filter)
            </button>
          </div>
        </div>
      )}

      {showDateFilter && (
        <div className="absolute right-0 z-20 mt-2 w-80 origin-top-right rounded-md border border-slate-200 bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Select Date Range</h3>
          <div className="mb-3">
            <Datepicker
              value={{
                startDate: dateFilter.startDate ? new Date(dateFilter.startDate) : null,
                endDate: dateFilter.endDate ? new Date(dateFilter.endDate) : null,
              }}
              onChange={(value) => {
                setDateFilter({
                  startDate: value?.startDate ? new Date(value.startDate).toISOString().split('T')[0] : undefined,
                  endDate: value?.endDate ? new Date(value.endDate).toISOString().split('T')[0] : undefined,
                })
              }}
              useRange={true}
              displayFormat="MMM DD, YYYY"
              inputClassName="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              containerClassName="relative"
              placeholder="Select date range"
              showShortcuts={true}
              primaryColor="blue"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowDateFilter(false)
                setDateFilter({})
              }}
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => handleExportWithFilter(onExportExcel)}
              className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500"
            >
              Export Excel
            </button>
            <button
              onClick={() => handleExportWithFilter(onExportCSV)}
              className="flex-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-500"
            >
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

