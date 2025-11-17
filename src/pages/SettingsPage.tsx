import { useEffect, useState } from 'react'

import { db } from '../db/database'
import { useSync } from '../sync/useSync'
import {
  getTaxSettings,
  setTaxSettings,
  setStateTaxConfig,
  removeStateTaxConfig,
  COMMON_GST_RATES,
  INDIAN_STATES,
  type TaxSettings,
  type StateTaxConfig,
} from '../utils/taxSettings'
import {
  getAllUnits,
  addUnit,
  updateUnit,
  deleteUnit,
  setDefaultUnit,
  getUnitSettings,
  type Unit,
} from '../utils/unitSettings'
import {
  getOrderIdSettings,
  setOrderIdSettings,
  initializeOrderNumbers,
  type OrderIdSettings,
} from '../utils/orderIdSettings'
import {
  getPrintSettings,
  setPrintSettings,
  addCustomFormat,
  updateCustomFormat,
  deleteCustomFormat,
  type PrintSettings,
  type PrintPaperSize,
  type CustomPrintFormat,
} from '../utils/printSettings'
import {
  getPurchaseOrderSettings,
  setPurchaseOrderSettings,
  type PurchaseOrderSettings,
} from '../utils/purchaseOrderSettings'
import { InvoiceTemplateEditor } from '../components/InvoiceTemplateEditor'

type SettingsTab = 'tax' | 'units' | 'orderId' | 'print' | 'purchaseOrder' | 'integration' | 'danger'

export const SettingsPage = () => {
  const { lastSyncedAt, pendingCount } = useSync()
  const [activeTab, setActiveTab] = useState<SettingsTab>('tax')
  const [isResetting, setIsResetting] = useState(false)
  const [taxSettings, setTaxSettingsState] = useState<TaxSettings>({
    type: 'gst',
    gstRate: 5,
    cgstRate: 2.5,
    sgstRate: 2.5,
    defaultState: 'Maharashtra',
    stateRates: {},
  })
  const [isSavingTax, setIsSavingTax] = useState(false)
  const [selectedStateForConfig, setSelectedStateForConfig] = useState<string>('')
  const [stateConfigForm, setStateConfigForm] = useState<StateTaxConfig>({
    state: '',
    type: 'gst',
    gstRate: 5,
    cgstRate: 2.5,
    sgstRate: 2.5,
  })
  const [units, setUnits] = useState<Unit[]>([])
  const [unitSettings, setUnitSettings] = useState<{ defaultUnitId: string }>({ defaultUnitId: 'piece' })
  const [unitForm, setUnitForm] = useState<Omit<Unit, 'id'>>({
    name: '',
    symbol: '',
    isBase: false,
    conversionFactor: 1,
  })
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [isSavingUnit, setIsSavingUnit] = useState(false)
  const [orderIdSettings, setOrderIdSettingsState] = useState<OrderIdSettings>({
    salesOrderFormat: 'random',
    salesOrderPrefix: 'SO-',
    salesOrderLastNumber: 0,
    purchaseOrderFormat: 'random',
    purchaseOrderPrefix: 'PO-',
    purchaseOrderLastNumber: 0,
  })
  const [isSavingOrderId, setIsSavingOrderId] = useState(false)
  const [printSettings, setPrintSettingsState] = useState<PrintSettings>({
    defaultPaperSize: 'a4',
    customWidth: 80,
    customHeight: 200,
    fontSize: 'medium',
    showLogo: false,
    companyName: '',
    companyGst: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    footerText: 'Thank you for your business!',
    savedFormats: [],
  })
  const [isSavingPrint, setIsSavingPrint] = useState(false)
  const [formatForm, setFormatForm] = useState<Omit<CustomPrintFormat, 'id'>>({
    name: '',
    width: 80,
    height: 200,
    fontSize: 'medium',
    showLogo: false,
    companyName: '',
    companyGst: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    footerText: 'Thank you for your business!',
  })
  const [editingFormatId, setEditingFormatId] = useState<string | null>(null)
  const [isSavingFormat, setIsSavingFormat] = useState(false)
  const [purchaseOrderSettings, setPurchaseOrderSettingsState] = useState<PurchaseOrderSettings>({
    defaultAddToInventory: true,
  })
  const [isSavingPurchaseOrder, setIsSavingPurchaseOrder] = useState(false)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)

  useEffect(() => {
    getTaxSettings().then((settings) => {
      setTaxSettingsState(settings)
    })
    loadUnits()
    loadOrderIdSettings()
    loadPrintSettings()
    loadPurchaseOrderSettings()
  }, [])

  const loadPrintSettings = async () => {
    const settings = await getPrintSettings()
    setPrintSettingsState(settings)
  }

  const loadPurchaseOrderSettings = async () => {
    const settings = await getPurchaseOrderSettings()
    setPurchaseOrderSettingsState(settings)
  }

  const loadOrderIdSettings = async () => {
    const settings = await getOrderIdSettings()
    setOrderIdSettingsState(settings)
    // Initialize order numbers from existing orders
    await initializeOrderNumbers()
    const updated = await getOrderIdSettings()
    setOrderIdSettingsState(updated)
  }

  const loadUnits = async () => {
    const allUnits = await getAllUnits()
    setUnits(allUnits)
    const settings = await getUnitSettings()
    setUnitSettings(settings)
  }

  const handleReset = async () => {
    if (!window.confirm('Clear all local data? This cannot be undone.')) return
    setIsResetting(true)
    try {
      await db.delete()
      window.location.reload()
    } finally {
      setIsResetting(false)
    }
  }

  const handleTaxSettingsChange = async (updates: Partial<TaxSettings>) => {
    const newSettings = { ...taxSettings, ...updates }
    setTaxSettingsState(newSettings)
    setIsSavingTax(true)
    try {
      await setTaxSettings(newSettings)
    } finally {
      setIsSavingTax(false)
    }
  }

  const handleSaveStateConfig = async () => {
    if (!stateConfigForm.state) return
    setIsSavingTax(true)
    try {
      await setStateTaxConfig(stateConfigForm.state, stateConfigForm)
      const updated = await getTaxSettings()
      setTaxSettingsState(updated)
      setStateConfigForm({ state: '', type: 'gst', gstRate: 5, cgstRate: 2.5, sgstRate: 2.5 })
      setSelectedStateForConfig('')
    } finally {
      setIsSavingTax(false)
    }
  }

  const handleDeleteStateConfig = async (state: string) => {
    if (!window.confirm(`Remove tax configuration for ${state}?`)) return
    setIsSavingTax(true)
    try {
      await removeStateTaxConfig(state)
      const updated = await getTaxSettings()
      setTaxSettingsState(updated)
    } finally {
      setIsSavingTax(false)
    }
  }

  const handleEditStateConfig = (state: string) => {
    const config = taxSettings.stateRates[state]
    if (config) {
      setStateConfigForm(config)
      setSelectedStateForConfig(state)
    }
  }

  const handleSaveUnit = async () => {
    if (!unitForm.name.trim() || !unitForm.symbol.trim()) return
    if (unitForm.conversionFactor <= 0) {
      alert('Conversion factor must be greater than 0')
      return
    }

    setIsSavingUnit(true)
    try {
      if (editingUnitId) {
        await updateUnit(editingUnitId, unitForm)
      } else {
        await addUnit(unitForm)
      }
      await loadUnits()
      setUnitForm({ name: '', symbol: '', isBase: false, conversionFactor: 1 })
      setEditingUnitId(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save unit')
    } finally {
      setIsSavingUnit(false)
    }
  }

  const handleDeleteUnit = async (unitId: string) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return
    setIsSavingUnit(true)
    try {
      await deleteUnit(unitId)
      await loadUnits()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete unit')
    } finally {
      setIsSavingUnit(false)
    }
  }

  const handleEditUnit = (unit: Unit) => {
    setUnitForm({
      name: unit.name,
      symbol: unit.symbol,
      isBase: unit.isBase,
      conversionFactor: unit.conversionFactor,
    })
    setEditingUnitId(unit.id)
  }

  const handleSetDefaultUnit = async (unitId: string) => {
    setIsSavingUnit(true)
    try {
      await setDefaultUnit(unitId)
      await loadUnits()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to set default unit')
    } finally {
      setIsSavingUnit(false)
    }
  }

  const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: 'tax', label: 'Tax Settings', icon: '💰' },
    { id: 'units', label: 'Product Units', icon: '📦' },
    { id: 'orderId', label: 'Order ID Format', icon: '🔢' },
    { id: 'print', label: 'Print Settings', icon: '🖨️' },
    { id: 'purchaseOrder', label: 'Purchase Orders', icon: '📋' },
    { id: 'integration', label: 'Integration', icon: '🔗' },
    { id: 'danger', label: 'Danger Zone', icon: '⚠️' },
  ]

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Settings</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage your application settings and preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Tax Settings Tab */}
        {activeTab === 'tax' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <h2 className="text-lg font-semibold">GST Tax settings</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Set the default GST tax configuration. This will be applied to all new sales orders, but can be changed before each sale.
              </p>

              <div className="mt-4 space-y-4">
          {/* Tax Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Tax Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const totalRate = taxSettings.type === 'cgst_sgst' ? taxSettings.cgstRate + taxSettings.sgstRate : taxSettings.gstRate
                  handleTaxSettingsChange({ type: 'gst', gstRate: totalRate })
                }}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  taxSettings.type === 'gst'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                GST
              </button>
              <button
                type="button"
                onClick={() => {
                  const totalRate = taxSettings.type === 'gst' ? taxSettings.gstRate : taxSettings.cgstRate + taxSettings.sgstRate
                  const halfRate = totalRate / 2
                  handleTaxSettingsChange({
                    type: 'cgst_sgst',
                    cgstRate: halfRate,
                    sgstRate: halfRate,
                  })
                }}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  taxSettings.type === 'cgst_sgst'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                CGST + SGST
              </button>
            </div>
          </div>

          {/* GST Rate Input */}
          {taxSettings.type === 'gst' ? (
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">GST Rate (%)</label>
              <div className="flex items-center gap-2">
                <select
                  value={taxSettings.gstRate}
                  onChange={(e) => handleTaxSettingsChange({ gstRate: Number.parseFloat(e.target.value) })}
                  className="w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                >
                  {COMMON_GST_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxSettings.gstRate}
                  onChange={(event) =>
                    handleTaxSettingsChange({ gstRate: Number.parseFloat(event.target.value) || 0 })
                  }
                  className="w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  placeholder="Custom rate"
                />
                {isSavingTax && <span className="text-xs text-slate-500">Saving...</span>}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Example: 5% GST means $100 subtotal = $5 tax = $105 total
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">CGST Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.01"
                  value={taxSettings.cgstRate}
                  onChange={(event) =>
                    handleTaxSettingsChange({ cgstRate: Number.parseFloat(event.target.value) || 0 })
                  }
                  className="w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">SGST Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.01"
                  value={taxSettings.sgstRate}
                  onChange={(event) =>
                    handleTaxSettingsChange({ sgstRate: Number.parseFloat(event.target.value) || 0 })
                  }
                  className="w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </div>
              {isSavingTax && <span className="text-xs text-slate-500">Saving...</span>}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Example: 2.5% CGST + 2.5% SGST = 5% total tax. $100 subtotal = $2.50 CGST + $2.50 SGST = $105 total
              </p>
            </div>
          )}

          {/* Default State */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Default State</label>
            <select
              value={taxSettings.defaultState || ''}
              onChange={(e) => handleTaxSettingsChange({ defaultState: e.target.value || undefined })}
              className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            >
              <option value="">No default</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Default state will be pre-selected in sales orders
            </p>
          </div>
        </div>
      </section>

      {/* State-wise Tax Configuration */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold">State-wise GST Configuration</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Configure custom GST rates for specific states. These rates will be automatically applied when a state is selected in sales orders.
        </p>

        <div className="mt-4 space-y-4">
          {/* Add/Edit State Config Form */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="text-sm font-semibold mb-3">
              {selectedStateForConfig ? `Edit: ${selectedStateForConfig}` : 'Add New State Configuration'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">State</label>
                <select
                  value={stateConfigForm.state}
                  onChange={(e) => setStateConfigForm((prev) => ({ ...prev, state: e.target.value }))}
                  disabled={!!selectedStateForConfig}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:disabled:bg-slate-800"
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Tax Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const totalRate = stateConfigForm.type === 'cgst_sgst' ? stateConfigForm.cgstRate + stateConfigForm.sgstRate : stateConfigForm.gstRate
                      setStateConfigForm((prev) => ({ ...prev, type: 'gst', gstRate: totalRate }))
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      stateConfigForm.type === 'gst'
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    GST
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const totalRate = stateConfigForm.type === 'gst' ? stateConfigForm.gstRate : stateConfigForm.cgstRate + stateConfigForm.sgstRate
                      const halfRate = totalRate / 2
                      setStateConfigForm((prev) => ({ ...prev, type: 'cgst_sgst', cgstRate: halfRate, sgstRate: halfRate }))
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      stateConfigForm.type === 'cgst_sgst'
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    CGST + SGST
                  </button>
                </div>
              </div>

              {stateConfigForm.type === 'gst' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">GST Rate (%)</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={stateConfigForm.gstRate}
                      onChange={(e) => setStateConfigForm((prev) => ({ ...prev, gstRate: Number.parseFloat(e.target.value) }))}
                      className="w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    >
                      {COMMON_GST_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={stateConfigForm.gstRate}
                      onChange={(e) => setStateConfigForm((prev) => ({ ...prev, gstRate: Number.parseFloat(e.target.value) || 0 }))}
                      className="w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                      placeholder="Custom"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">CGST Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.01"
                      value={stateConfigForm.cgstRate}
                      onChange={(e) => setStateConfigForm((prev) => ({ ...prev, cgstRate: Number.parseFloat(e.target.value) || 0 }))}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">SGST Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.01"
                      value={stateConfigForm.sgstRate}
                      onChange={(e) => setStateConfigForm((prev) => ({ ...prev, sgstRate: Number.parseFloat(e.target.value) || 0 }))}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveStateConfig}
                  disabled={!stateConfigForm.state || isSavingTax}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {isSavingTax ? 'Saving...' : selectedStateForConfig ? 'Update' : 'Add Configuration'}
                </button>
                {selectedStateForConfig && (
                  <button
                    type="button"
                    onClick={() => {
                      setStateConfigForm({ state: '', type: 'gst', gstRate: 5, cgstRate: 2.5, sgstRate: 2.5 })
                      setSelectedStateForConfig('')
                    }}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List of Configured States */}
          {Object.keys(taxSettings.stateRates || {}).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Configured States</h3>
              <div className="space-y-2">
                {Object.entries(taxSettings.stateRates).map(([state, config]) => (
                  <div
                    key={state}
                    className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div>
                      <p className="font-semibold text-sm">{state}</p>
                      <p className="text-xs text-slate-500">
                        {config.type === 'gst'
                          ? `${config.gstRate}% GST`
                          : `${config.cgstRate}% CGST + ${config.sgstRate}% SGST`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditStateConfig(state)}
                        className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStateConfig(state)}
                        className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
          </div>
        )}

        {/* Product Units Tab */}
        {activeTab === 'units' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <h2 className="text-lg font-semibold">Product Units</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Manage units for products (e.g., Piece, Dozen, Gross). Set conversion factors to convert between units (e.g., 1 Dozen = 12 Pieces).
              </p>

              <div className="mt-4 space-y-4">
                {/* Add/Edit Unit Form */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <h3 className="text-sm font-semibold mb-3">
                    {editingUnitId ? `Edit Unit: ${editingUnitId}` : 'Add New Unit'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Unit Name</label>
                      <input
                        type="text"
                        value={unitForm.name}
                        onChange={(e) => setUnitForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Dozen, Gross"
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Symbol</label>
                      <input
                        type="text"
                        value={unitForm.symbol}
                        onChange={(e) => setUnitForm((prev) => ({ ...prev, symbol: e.target.value }))}
                        placeholder="e.g., dz, gr"
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Conversion Factor (to base unit)
                      </label>
                      <input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={unitForm.conversionFactor}
                        onChange={(e) => setUnitForm((prev) => ({ ...prev, conversionFactor: Number.parseFloat(e.target.value) || 1 }))}
                        disabled={unitForm.isBase}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:disabled:bg-slate-800"
                        placeholder="e.g., 12 for Dozen (1 dozen = 12 pieces)"
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        How many base units equal 1 of this unit? (Base units have factor of 1)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveUnit}
                        disabled={!unitForm.name.trim() || !unitForm.symbol.trim() || isSavingUnit || unitForm.isBase}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
                      >
                        {isSavingUnit ? 'Saving...' : editingUnitId ? 'Update Unit' : 'Add Unit'}
                      </button>
                      {editingUnitId && (
                        <button
                          type="button"
                          onClick={() => {
                            setUnitForm({ name: '', symbol: '', isBase: false, conversionFactor: 1 })
                            setEditingUnitId(null)
                          }}
                          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              {/* List of Units */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Available Units</h3>
                <div className="space-y-2">
                  {units.map((unit) => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{unit.name}</p>
                          <span className="text-xs text-slate-500">({unit.symbol})</span>
                          {unit.isBase && (
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Base
                            </span>
                          )}
                          {unitSettings.defaultUnitId === unit.id && (
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {unit.isBase
                            ? 'Base unit (1:1)'
                            : `1 ${unit.name} = ${unit.conversionFactor} ${units.find((u) => u.isBase)?.name || 'base unit'}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!unit.isBase && (
                          <>
                            {unitSettings.defaultUnitId !== unit.id && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultUnit(unit.id)}
                                className="rounded-md border border-green-300 bg-green-50 px-3 py-1 text-xs font-semibold text-green-600 transition hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400"
                              >
                                Set Default
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEditUnit(unit)}
                              className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUnit(unit.id)}
                              className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </section>
          </div>
        )}

        {/* Order ID Format Tab */}
        {activeTab === 'orderId' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <h2 className="text-lg font-semibold">Order ID Format</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Configure how order IDs are generated. Choose between random IDs or manual format with auto-increment (e.g., SO-001, SO-002).
              </p>

              <div className="mt-4 space-y-6">
          {/* Sales Order ID Settings */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="text-sm font-semibold mb-3">Sales Order ID</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Format</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const newSettings = { ...orderIdSettings, salesOrderFormat: 'random' as const }
                      setOrderIdSettingsState(newSettings)
                      setIsSavingOrderId(true)
                      try {
                        await setOrderIdSettings(newSettings)
                      } finally {
                        setIsSavingOrderId(false)
                      }
                    }}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                      orderIdSettings.salesOrderFormat === 'random'
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    Random
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const newSettings = { ...orderIdSettings, salesOrderFormat: 'manual' as const }
                      setOrderIdSettingsState(newSettings)
                      setIsSavingOrderId(true)
                      try {
                        await setOrderIdSettings(newSettings)
                      } finally {
                        setIsSavingOrderId(false)
                      }
                    }}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                      orderIdSettings.salesOrderFormat === 'manual'
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    Manual (Auto-increment)
                  </button>
                </div>
              </div>

              {orderIdSettings.salesOrderFormat === 'manual' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Prefix</label>
                    <input
                      type="text"
                      value={orderIdSettings.salesOrderPrefix}
                      onChange={async (e) => {
                        const newSettings = { ...orderIdSettings, salesOrderPrefix: e.target.value }
                        setOrderIdSettingsState(newSettings)
                        setIsSavingOrderId(true)
                        try {
                          await setOrderIdSettings(newSettings)
                        } finally {
                          setIsSavingOrderId(false)
                        }
                      }}
                      placeholder="SO-"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Example: "SO-" will generate SO-001, SO-002, etc.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Last Order Number</label>
                    <div className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <span className="text-slate-600 dark:text-slate-400">
                        {orderIdSettings.salesOrderPrefix}
                        {String(orderIdSettings.salesOrderLastNumber).padStart(3, '0')}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">(Next: {orderIdSettings.salesOrderPrefix}{String(orderIdSettings.salesOrderLastNumber + 1).padStart(3, '0')})</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Purchase Order ID Settings */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="text-sm font-semibold mb-3">Purchase Order ID</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Format</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const newSettings = { ...orderIdSettings, purchaseOrderFormat: 'random' as const }
                      setOrderIdSettingsState(newSettings)
                      setIsSavingOrderId(true)
                      try {
                        await setOrderIdSettings(newSettings)
                      } finally {
                        setIsSavingOrderId(false)
                      }
                    }}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                      orderIdSettings.purchaseOrderFormat === 'random'
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    Random
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const newSettings = { ...orderIdSettings, purchaseOrderFormat: 'manual' as const }
                      setOrderIdSettingsState(newSettings)
                      setIsSavingOrderId(true)
                      try {
                        await setOrderIdSettings(newSettings)
                      } finally {
                        setIsSavingOrderId(false)
                      }
                    }}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                      orderIdSettings.purchaseOrderFormat === 'manual'
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    Manual (Auto-increment)
                  </button>
                </div>
              </div>

              {orderIdSettings.purchaseOrderFormat === 'manual' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Prefix</label>
                    <input
                      type="text"
                      value={orderIdSettings.purchaseOrderPrefix}
                      onChange={async (e) => {
                        const newSettings = { ...orderIdSettings, purchaseOrderPrefix: e.target.value }
                        setOrderIdSettingsState(newSettings)
                        setIsSavingOrderId(true)
                        try {
                          await setOrderIdSettings(newSettings)
                        } finally {
                          setIsSavingOrderId(false)
                        }
                      }}
                      placeholder="PO-"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Example: "PO-" will generate PO-001, PO-002, etc.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Last Order Number</label>
                    <div className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <span className="text-slate-600 dark:text-slate-400">
                        {orderIdSettings.purchaseOrderPrefix}
                        {String(orderIdSettings.purchaseOrderLastNumber).padStart(3, '0')}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">(Next: {orderIdSettings.purchaseOrderPrefix}{String(orderIdSettings.purchaseOrderLastNumber + 1).padStart(3, '0')})</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

              {isSavingOrderId && <p className="text-xs text-slate-500">Saving...</p>}
            </div>
          </section>
          </div>
        )}

        {/* Print Settings Tab */}
        {activeTab === 'print' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <h2 className="text-lg font-semibold">Print Settings</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Configure default print settings for invoices and purchase orders. You can override these settings when printing.
              </p>

              <div className="mt-4 space-y-4">
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800/60 dark:bg-blue-900/20">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Default Print Settings</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Default Paper Size</label>
              <select
                value={printSettings.defaultPaperSize === 'saved' && printSettings.defaultFormatId ? 'saved' : printSettings.defaultPaperSize}
                onChange={async (e) => {
                  const newSize = e.target.value as PrintPaperSize
                  if (newSize === 'saved' && printSettings.savedFormats && printSettings.savedFormats.length > 0) {
                    const newSettings = { 
                      ...printSettings, 
                      defaultPaperSize: 'saved' as const, 
                      defaultFormatId: printSettings.savedFormats[0].id 
                    }
                    setPrintSettingsState(newSettings)
                    setIsSavingPrint(true)
                    try {
                      await setPrintSettings(newSettings)
                    } finally {
                      setIsSavingPrint(false)
                    }
                  } else {
                    const newSettings = { ...printSettings, defaultPaperSize: newSize, defaultFormatId: undefined }
                    setPrintSettingsState(newSettings)
                    setIsSavingPrint(true)
                    try {
                      await setPrintSettings(newSettings)
                    } finally {
                      setIsSavingPrint(false)
                    }
                  }
                }}
                className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              >
                <option value="pos">POS/Receipt (80mm) - For thermal printers</option>
                <option value="a4">A4 (210mm) - Standard invoice size</option>
                <option value="custom">Custom Size - Set your own dimensions</option>
                {printSettings.savedFormats && printSettings.savedFormats.length > 0 && (
                  <option value="saved">Saved Format - Use a saved custom format</option>
                )}
              </select>
              {printSettings.defaultPaperSize === 'saved' && printSettings.defaultFormatId && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Selected Format</label>
                  <select
                    value={printSettings.defaultFormatId}
                    onChange={async (e) => {
                      const newSettings = { ...printSettings, defaultFormatId: e.target.value }
                      setPrintSettingsState(newSettings)
                      setIsSavingPrint(true)
                      try {
                        await setPrintSettings(newSettings)
                      } finally {
                        setIsSavingPrint(false)
                      }
                    }}
                    className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  >
                    {printSettings.savedFormats?.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.name} ({format.width}mm × {format.height}mm)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                This will be the default paper size when printing invoices and purchase orders. You can override it when printing.
              </p>
            </div>
          </div>

          {printSettings.defaultPaperSize === 'custom' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Custom Width (mm)</label>
                <input
                  type="number"
                  min="50"
                  max="500"
                  value={printSettings.customWidth}
                  onChange={async (e) => {
                    const newSettings = { ...printSettings, customWidth: Number.parseInt(e.target.value) || 80 }
                    setPrintSettingsState(newSettings)
                    setIsSavingPrint(true)
                    try {
                      await setPrintSettings(newSettings)
                    } finally {
                      setIsSavingPrint(false)
                    }
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Custom Height (mm)</label>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  value={printSettings.customHeight}
                  onChange={async (e) => {
                    const newSettings = { ...printSettings, customHeight: Number.parseInt(e.target.value) || 200 }
                    setPrintSettingsState(newSettings)
                    setIsSavingPrint(true)
                    try {
                      await setPrintSettings(newSettings)
                    } finally {
                      setIsSavingPrint(false)
                    }
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="text-sm font-semibold">Company Information (Optional)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={printSettings.companyName || ''}
                  onChange={async (e) => {
                    const newSettings = { ...printSettings, companyName: e.target.value }
                    setPrintSettingsState(newSettings)
                    setIsSavingPrint(true)
                    try {
                      await setPrintSettings(newSettings)
                    } finally {
                      setIsSavingPrint(false)
                    }
                  }}
                  placeholder="Your Company Name"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </div>
              {/* GST NO */}
               <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">GST NO</label>
                <input
                    type="text"
                    value={printSettings.companyGst ?? ''}
                    onChange={async (e) => {
                      const newSettings = { ...printSettings, companyGst: e.target.value }
                      setPrintSettingsState(newSettings)
                      setIsSavingPrint(true)
                      try { await setPrintSettings(newSettings) }
                      finally { setIsSavingPrint(false) }
                    }}
                    placeholder="e.g. 27AAACC1234C1Z5"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Address</label>
              <textarea
                value={printSettings.companyAddress || ''}
                onChange={async (e) => {
                  const newSettings = { ...printSettings, companyAddress: e.target.value }
                  setPrintSettingsState(newSettings)
                  setIsSavingPrint(true)
                  try {
                    await setPrintSettings(newSettings)
                  } finally {
                    setIsSavingPrint(false)
                  }
                }}
                rows={2}
                placeholder="Company Address"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Phone</label>
                <input
                  type="text"
                  value={printSettings.companyPhone || ''}
                  onChange={async (e) => {
                    const newSettings = { ...printSettings, companyPhone: e.target.value }
                    setPrintSettingsState(newSettings)
                    setIsSavingPrint(true)
                    try {
                      await setPrintSettings(newSettings)
                    } finally {
                      setIsSavingPrint(false)
                    }
                  }}
                  placeholder="+1 234 567 8900"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={printSettings.companyEmail || ''}
                  onChange={async (e) => {
                    const newSettings = { ...printSettings, companyEmail: e.target.value }
                    setPrintSettingsState(newSettings)
                    setIsSavingPrint(true)
                    try {
                      await setPrintSettings(newSettings)
                    } finally {
                      setIsSavingPrint(false)
                    }
                  }}
                  placeholder="info@company.com"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Footer Text</label>
              <input
                type="text"
                value={printSettings.footerText || ''}
                onChange={async (e) => {
                  const newSettings = { ...printSettings, footerText: e.target.value }
                  setPrintSettingsState(newSettings)
                  setIsSavingPrint(true)
                  try {
                    await setPrintSettings(newSettings)
                  } finally {
                    setIsSavingPrint(false)
                  }
                }}
                placeholder="Thank you for your business!"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              />
            </div>
          </div>

          {isSavingPrint && <p className="text-xs text-slate-500">Saving...</p>}
        </div>

        {/* Invoice Template Editor */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="text-lg font-semibold">Invoice Template</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Customize the design of your invoices using HTML and CSS. Create multiple templates and set one as default.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowTemplateEditor(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Open Template Editor
            </button>
          </div>
        </section>

        {/* Saved Custom Formats */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Saved Custom Formats</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Create and save multiple custom print formats for different printers or use cases
              </p>
            </div>
          </div>

          {/* Add/Edit Format Form */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <h4 className="text-sm font-semibold mb-3">
              {editingFormatId ? `Edit Format: ${formatForm.name}` : 'Add New Custom Format'}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Format Name</label>
                <input
                  type="text"
                  value={formatForm.name}
                  onChange={(e) => setFormatForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Thermal 80mm, A5 Invoice, Custom Receipt"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Width (mm)</label>
                  <input
                    type="number"
                    min="50"
                    max="500"
                    value={formatForm.width}
                    onChange={(e) => setFormatForm((prev) => ({ ...prev, width: Number.parseInt(e.target.value) || 80 }))}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Height (mm)</label>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    value={formatForm.height}
                    onChange={(e) => setFormatForm((prev) => ({ ...prev, height: Number.parseInt(e.target.value) || 200 }))}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Font Size</label>
                  <select
                    value={formatForm.fontSize}
                    onChange={(e) => setFormatForm((prev) => ({ ...prev, fontSize: e.target.value as 'small' | 'medium' | 'large' }))}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <h5 className="text-xs font-semibold">Format-Specific Company Info (Optional)</h5>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formatForm.companyName || ''}
                    onChange={(e) => setFormatForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Leave empty to use default"
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Phone</label>
                    <input
                      type="text"
                      value={formatForm.companyPhone || ''}
                      onChange={(e) => setFormatForm((prev) => ({ ...prev, companyPhone: e.target.value }))}
                      placeholder="Optional"
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={formatForm.companyEmail || ''}
                      onChange={(e) => setFormatForm((prev) => ({ ...prev, companyEmail: e.target.value }))}
                      placeholder="Optional"
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Footer Text</label>
                  <input
                    type="text"
                    value={formatForm.footerText || ''}
                    onChange={(e) => setFormatForm((prev) => ({ ...prev, footerText: e.target.value }))}
                    placeholder="Thank you for your business!"
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!formatForm.name.trim()) {
                      alert('Please enter a format name')
                      return
                    }
                    setIsSavingFormat(true)
                    try {
                      if (editingFormatId) {
                        await updateCustomFormat(editingFormatId, formatForm)
                      } else {
                        await addCustomFormat(formatForm)
                      }
                      await loadPrintSettings()
                      setFormatForm({
                        name: '',
                        width: 80,
                        height: 200,
                        fontSize: 'medium',
                        showLogo: false,
                        companyName: '',
                        companyGst: '',
                        companyAddress: '',
                        companyPhone: '',
                        companyEmail: '',
                        footerText: 'Thank you for your business!',
                      })
                      setEditingFormatId(null)
                    } catch (error) {
                      alert(error instanceof Error ? error.message : 'Failed to save format')
                    } finally {
                      setIsSavingFormat(false)
                    }
                  }}
                  disabled={!formatForm.name.trim() || isSavingFormat}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {isSavingFormat ? 'Saving...' : editingFormatId ? 'Update Format' : 'Save Format'}
                </button>
                {editingFormatId && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormatForm({
                        name: '',
                        width: 80,
                        height: 200,
                        fontSize: 'medium',
                        showLogo: false,
                        companyName: '',
                        companyGst: '',
                        companyAddress: '',
                        companyPhone: '',
                        companyEmail: '',
                        footerText: 'Thank you for your business!',
                      })
                      setEditingFormatId(null)
                    }}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List of Saved Formats */}
          {printSettings.savedFormats && printSettings.savedFormats.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Saved Formats</h4>
              <div className="space-y-2">
                {printSettings.savedFormats.map((format) => (
                  <div
                    key={format.id}
                    className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div>
                      <p className="font-semibold text-sm">{format.name}</p>
                      <p className="text-xs text-slate-500">
                        {format.width}mm × {format.height}mm • {format.fontSize} font
                        {format.companyName && ` • ${format.companyName}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {printSettings.defaultFormatId !== format.id && (
                        <button
                          type="button"
                          onClick={async () => {
                            const newSettings = { ...printSettings, defaultPaperSize: 'saved' as const, defaultFormatId: format.id }
                            setPrintSettingsState(newSettings)
                            setIsSavingPrint(true)
                            try {
                              await setPrintSettings(newSettings)
                            } finally {
                              setIsSavingPrint(false)
                            }
                          }}
                          className="rounded-md border border-green-300 bg-green-50 px-3 py-1 text-xs font-semibold text-green-600 transition hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400"
                        >
                          Set Default
                        </button>
                      )}
                      {printSettings.defaultFormatId === format.id && (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Default
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setFormatForm({
                            name: format.name,
                            width: format.width,
                            height: format.height,
                            fontSize: format.fontSize,
                            showLogo: format.showLogo,
                            logoUrl: format.logoUrl,
                            companyName: format.companyName || '',
                            companyGst: format.companyGst || '',
                            companyAddress: format.companyAddress || '',
                            companyPhone: format.companyPhone || '',
                            companyEmail: format.companyEmail || '',
                            footerText: format.footerText || 'Thank you for your business!',
                          })
                          setEditingFormatId(format.id)
                        }}
                        className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete format "${format.name}"?`)) return
                          setIsSavingFormat(true)
                          try {
                            await deleteCustomFormat(format.id)
                            await loadPrintSettings()
                          } catch (error) {
                            alert(error instanceof Error ? error.message : 'Failed to delete format')
                          } finally {
                            setIsSavingFormat(false)
                          }
                        }}
                        className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
              )}
            </div>
          </section>
          </div>
        )}

        {/* Purchase Order Settings Tab */}
        {activeTab === 'purchaseOrder' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <h2 className="text-lg font-semibold">Purchase Order Settings</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Configure default settings for purchase orders. These settings can be overridden when creating individual purchase orders.
              </p>

              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="defaultAddToInventory"
                      checked={purchaseOrderSettings.defaultAddToInventory}
                      onChange={async (e) => {
                        const newSettings = { ...purchaseOrderSettings, defaultAddToInventory: e.target.checked }
                        setPurchaseOrderSettingsState(newSettings)
                        setIsSavingPurchaseOrder(true)
                        try {
                          await setPurchaseOrderSettings(newSettings)
                        } finally {
                          setIsSavingPurchaseOrder(false)
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
                    />
                    <div className="flex-1">
                      <label htmlFor="defaultAddToInventory" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Default: Add items to product inventory
                      </label>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        When enabled, new purchase orders will automatically add items to product stock by default. You can still override this setting for individual purchase orders.
                      </p>
                    </div>
                  </div>
                  {isSavingPurchaseOrder && <p className="mt-2 text-xs text-slate-500">Saving...</p>}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Integration Tab */}
        {activeTab === 'integration' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <h2 className="text-lg font-semibold">Google integration</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                This starter keeps data offline in IndexedDB. Replace the stub in <code>sync/googleDriveClient.ts</code> with a
                call to the Google Drive API. Store the OAuth token securely and reuse it for manual sync.
              </p>
              <div className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <p>Pending sync items: {pendingCount}</p>
                <p>Last synced at: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}</p>
              </div>
            </section>
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-red-200 bg-white p-4 shadow-sm dark:border-red-800/60 dark:bg-slate-900 sm:p-6">
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger zone</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Clear all offline data if you need a fresh start. Any unsynced records will be lost.
              </p>
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                className="mt-4 inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-400"
              >
                {isResetting ? 'Clearing…' : 'Clear local data'}
              </button>
            </section>
          </div>
        )}
      </div>
      
      <InvoiceTemplateEditor
        isOpen={showTemplateEditor}
        onClose={() => setShowTemplateEditor(false)}
      />
    </div>
  )
}
