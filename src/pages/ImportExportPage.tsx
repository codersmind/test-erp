import { useState } from 'react'
import { Upload, Download, FileSpreadsheet, FileText, Users, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { importCustomers, importProducts, importFromVyapar, type ImportResult } from '../utils/importUtils'
import { exportCustomersToExcel, exportCustomersToCSV, exportProductsToExcel, exportProductsToCSV } from '../utils/exportUtils'
import { listCustomers, listProducts } from '../db/localDataService'
import { ErrorDialog } from '../components/ErrorDialog'

type ImportType = 'customer' | 'product'
type ImportSource = 'excel' | 'csv' | 'vyapar' | 'other'

export const ImportExportPage = () => {
  const [importType, setImportType] = useState<ImportType>('customer')
  const [importSource, setImportSource] = useState<ImportSource>('excel')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      setErrorMessage('Please select a file to import')
      setShowErrorDialog(true)
      return
    }

    setIsImporting(true)
    setImportProgress({ current: 0, total: 0 })
    setImportResult(null)

    try {
      let result: ImportResult

      if (importSource === 'vyapar') {
        result = await importFromVyapar(
          importFile,
          importType,
          (current, total) => setImportProgress({ current, total })
        )
      } else if (importType === 'customer') {
        result = await importCustomers(
          importFile,
          'customer',
          (current, total) => setImportProgress({ current, total })
        )
      } else {
        result = await importProducts(
          importFile,
          (current, total) => setImportProgress({ current, total })
        )
      }

      setImportResult(result)
      setImportFile(null)
      // Reset file input
      const fileInput = document.getElementById('import-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import file')
      setShowErrorDialog(true)
    } finally {
      setIsImporting(false)
      setImportProgress({ current: 0, total: 0 })
    }
  }

  const handleExport = async (type: 'customer' | 'product', format: 'excel' | 'csv') => {
    setIsExporting(true)
    try {
      if (type === 'customer') {
        const customers = await listCustomers()
        if (format === 'excel') {
          await exportCustomersToExcel(customers, 'customers')
        } else {
          await exportCustomersToCSV(customers, 'customers')
        }
      } else {
        const products = await listProducts()
        if (format === 'excel') {
          await exportProductsToExcel(products, 'products')
        } else {
          await exportProductsToCSV(products, 'products')
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export')
      setShowErrorDialog(true)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Import & Export</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Import customers and products from Excel, CSV or other inventory systems. Export your data in various formats.
        </p>
      </div>

      {/* Import Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Import Data</h2>
        </div>

        <div className="space-y-4">
          {/* Import Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Import Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setImportType('customer')
                  setImportResult(null)
                }}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                  importType === 'customer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Users className="h-4 w-4" />
                Customers
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportType('product')
                  setImportResult(null)
                }}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                  importType === 'product'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Package className="h-4 w-4" />
                Products
              </button>
            </div>
          </div>

          {/* Import Source Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Source Format
            </label>
            <select
              value={importSource}
              onChange={(e) => {
                setImportSource(e.target.value as ImportSource)
                setImportResult(null)
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            >
              <option value="excel">Excel (.xlsx, .xls)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="other">Other Inventory System</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {importSource === 'vyapar'
                ? 'Supports Vyapar export formats. Column names will be automatically mapped.'
                : importSource === 'other'
                  ? 'Supports common inventory system formats. Column names will be automatically mapped to match our system.'
                  : 'Select the file format you want to import from.'}
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Select File
            </label>
            <input
              id="import-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-300"
            />
            {importFile && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Selected: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Import Progress */}
          {isImporting && importProgress.total > 0 && (
            <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  Importing... {importProgress.current} / {importProgress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 dark:bg-blue-800">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 dark:bg-blue-400"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div
              className={`rounded-md p-4 ${
                importResult.failed === 0
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-yellow-50 dark:bg-yellow-900/20'
              }`}
            >
              <div className="flex items-start gap-2">
                {importResult.failed === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      importResult.failed === 0
                        ? 'text-green-900 dark:text-green-300'
                        : 'text-yellow-900 dark:text-yellow-300'
                    }`}
                  >
                    Import completed: {importResult.success} succeeded, {importResult.failed} failed
                  </p>
                  {importResult.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-yellow-800 dark:text-yellow-400">
                        View errors ({importResult.errors.length})
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-yellow-700 dark:text-yellow-400">
                        {importResult.errors.slice(0, 10).map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {importResult.errors.length > 10 && (
                          <li>... and {importResult.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Import Button */}
          <button
            type="button"
            onClick={handleImport}
            disabled={!importFile || isImporting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isImporting ? 'Importing...' : `Import ${importType === 'customer' ? 'Customers' : 'Products'}`}
          </button>
        </div>
      </div>

      {/* Export Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-2">
          <Download className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-semibold">Export Data</h2>
        </div>

        <div className="space-y-6">
          {/* Export Customers */}
          <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h3 className="font-medium text-slate-900 dark:text-slate-50">Export Customers</h3>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleExport('customer', 'excel')}
                disabled={isExporting}
                className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export to Excel
              </button>
              <button
                type="button"
                onClick={() => handleExport('customer', 'csv')}
                disabled={isExporting}
                className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <FileText className="h-4 w-4" />
                Export to CSV
              </button>
            </div>
          </div>

          {/* Export Products */}
          <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h3 className="font-medium text-slate-900 dark:text-slate-50">Export Products</h3>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleExport('product', 'excel')}
                disabled={isExporting}
                className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export to Excel
              </button>
              <button
                type="button"
                onClick={() => handleExport('product', 'csv')}
                disabled={isExporting}
                className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <FileText className="h-4 w-4" />
                Export to CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <ErrorDialog
        isOpen={showErrorDialog}
        onClose={() => {
          setShowErrorDialog(false)
          setErrorMessage(null)
        }}
        title="Import/Export Error"
        message={errorMessage || 'An error occurred during import/export.'}
      />
    </div>
  )
}

