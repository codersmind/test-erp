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

export const SettingsPage = () => {
  const { lastSyncedAt, pendingCount } = useSync()
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

  useEffect(() => {
    getTaxSettings().then((settings) => {
      setTaxSettingsState(settings)
    })
    loadUnits()
    loadOrderIdSettings()
  }, [])

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

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
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

      {/* Unit Management */}
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

      {/* Order ID Settings */}
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
  )
}
