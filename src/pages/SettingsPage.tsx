import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

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
  getBarcodePaperSettings,
  addBarcodePaperSize,
  updateBarcodePaperSize,
  deleteBarcodePaperSize,
  setBarcodeFormat,
  type BarcodePaperSize,
  type BarcodeFormat,
} from '../utils/barcodePaperSettings'
import {
  getLogo,
  saveLogo,
  deleteLogo,
  fileToDataUrl,
  validateImageFile,
  type LogoData,
} from '../utils/logoStorage'
import {
  getPurchaseOrderSettings,
  setPurchaseOrderSettings,
  type PurchaseOrderSettings,
} from '../utils/purchaseOrderSettings'
import {
  getOrderSettings,
  setOrderSettings,
  type OrderSettings,
} from '../utils/orderSettings'
import {
  getPrinterSettings,
  setPrinterSettings,
  type PrinterSettings,
} from '../utils/printerSettings'
import {
  getIntegrationSettings,
  updateWhatsAppSettings,
  type IntegrationSettings,
} from '../utils/integrationSettings'
import { whatsappService } from '../services/whatsappService'
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
  const [barcodePaperSizes, setBarcodePaperSizes] = useState<BarcodePaperSize[]>([])
  const [barcodeFormat, setBarcodeFormatState] = useState<BarcodeFormat>('CODE128')
  const [isSavingBarcodeFormat, setIsSavingBarcodeFormat] = useState(false)
  const [barcodePaperForm, setBarcodePaperForm] = useState<Omit<BarcodePaperSize, 'id'>>({
    name: '',
    width: 210,
    height: 297,
    cols: 3,
    rows: 8,
    labelWidth: 63,
    labelHeight: 33,
  })
  const [editingBarcodePaperId, setEditingBarcodePaperId] = useState<string | null>(null)
  const [isSavingBarcodePaper, setIsSavingBarcodePaper] = useState(false)
  const [purchaseOrderSettings, setPurchaseOrderSettingsState] = useState<PurchaseOrderSettings>({
    defaultAddToInventory: true,
  })
  const [orderSettings, setOrderSettingsState] = useState<OrderSettings>({
    defaultRoundFigure: false,
  })
  const [isSavingPurchaseOrder, setIsSavingPurchaseOrder] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [printerSettings, setPrinterSettingsState] = useState<PrinterSettings>({
    defaultPrinterName: null,
    defaultPrinterDescription: null,
  })
  const [integrationSettings, setIntegrationSettingsState] = useState<IntegrationSettings>({
    whatsapp: {
      enabled: false,
      isConnected: false,
      messageTemplate: 'Hello {{customerName}},\n\nYour invoice #{{invoiceNumber}} for ₹{{total}} is ready.\n\nThank you for your business!',
    },
  })
  const [whatsappQRCode, setWhatsappQRCode] = useState<string | null>(null)
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false)
  const [availablePrinters, setAvailablePrinters] = useState<Array<{
    name: string
    displayName: string
    description: string
    status: number
    isDefault: boolean
  }>>([])
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false)
  const [isSavingPrinter, setIsSavingPrinter] = useState(false)
  const [logo, setLogo] = useState<LogoData | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  useEffect(() => {
    getTaxSettings().then((settings) => {
      setTaxSettingsState(settings)
    })
    loadUnits()
    loadOrderIdSettings()
    loadPrintSettings()
    loadBarcodePaperSizes()
    loadPurchaseOrderSettings()
    loadOrderSettings()
    loadPrinterSettings()
    loadAvailablePrinters()
    loadLogo()
    loadIntegrationSettings()
  }, [])

  // Set up WhatsApp event listeners for real-time QR code updates
  useEffect(() => {
    if ((window as any).electronWhatsApp && integrationSettings.whatsapp.enabled) {
      const electronWhatsApp = (window as any).electronWhatsApp
      
      const unsubscribeQR = electronWhatsApp.onQR((qr: string) => {
        if (!qr) {
          console.log('QR event received but QR is empty')
          setWhatsappQRCode(null)
          return
        }
        
        console.log('QR event received, length:', qr.length, 'starts with:', qr.substring(0, 50))
        
        // If already a data URL, use as is
        if (qr.startsWith('data:')) {
          console.log('QR is already a data URL')
          setWhatsappQRCode(qr)
          return
        }
        
        // Clean the QR code string
        // First remove @ character (not valid base64)
        let cleanedQR = qr.replace(/@/g, '')
        
        // Remove whitespace, commas, newlines
        cleanedQR = cleanedQR.replace(/[\s\n\r,]/g, '')
        
        // Handle = characters - they might be separators or padding
        const parts = cleanedQR.split('=')
        if (parts.length > 1) {
          // Join all parts (removing the = separators)
          const joined = parts.join('')
          // Calculate proper base64 padding (base64 strings must be multiple of 4)
          const remainder = joined.length % 4
          const padding = remainder ? '='.repeat(4 - remainder) : ''
          cleanedQR = joined + padding
        }
        
        console.log('Cleaned QR, length:', cleanedQR.length)
        
        // Check if it's long enough to be a base64 PNG image
        // If it's too short, it's likely the QR code data, not the image
        if (cleanedQR.length < 1000) {
          console.log('QR code is too short for PNG, using as QR data string')
          // Set as QR data string - it will be rendered using QRCodeSVG component
          setWhatsappQRCode(cleanedQR)
          return
        }
        
        // Validate it's a valid base64 string
        if (!/^[A-Za-z0-9+/=]+$/.test(cleanedQR)) {
          console.error('Invalid QR code format after cleaning')
          return
        }
        
        // Format as data URL for PNG image
        const formattedQR = `data:image/png;base64,${cleanedQR}`
        console.log('Setting formatted QR code as image, length:', formattedQR.length)
        setWhatsappQRCode(formattedQR)
      })
      
      const unsubscribeReady = electronWhatsApp.onReady(() => {
        setWhatsappQRCode(null)
        setIntegrationSettingsState((prev) => ({
          ...prev,
          whatsapp: { ...prev.whatsapp, isConnected: true },
        }))
      })
      
      const unsubscribeAuthFailure = electronWhatsApp.onAuthFailure((msg: string) => {
        console.error('WhatsApp auth failure:', msg)
        setIntegrationSettingsState((prev) => ({
          ...prev,
          whatsapp: { ...prev.whatsapp, isConnected: false },
        }))
      })
      
      const unsubscribeDisconnected = electronWhatsApp.onDisconnected(() => {
        setWhatsappQRCode(null)
        setIntegrationSettingsState((prev) => ({
          ...prev,
          whatsapp: { ...prev.whatsapp, isConnected: false },
        }))
      })
      
      return () => {
        unsubscribeQR()
        unsubscribeReady()
        unsubscribeAuthFailure()
        unsubscribeDisconnected()
      }
    }
  }, [integrationSettings.whatsapp.enabled])

  const loadLogo = async () => {
    const logoData = await getLogo()
    setLogo(logoData)
    // Update print settings logo URL if logo exists
    if (logoData) {
      const currentSettings = await getPrintSettings()
      if (!currentSettings.logoUrl || currentSettings.logoUrl !== logoData.dataUrl) {
        const updatedSettings = { ...currentSettings, logoUrl: logoData.dataUrl, showLogo: true }
        await setPrintSettings(updatedSettings)
        setPrintSettingsState(updatedSettings)
      }
    }
  }

  const loadPrintSettings = async () => {
    const settings = await getPrintSettings()
    setPrintSettingsState(settings)
  }

  const loadBarcodePaperSizes = async () => {
    const settings = await getBarcodePaperSettings()
    setBarcodePaperSizes(settings.paperSizes)
    setBarcodeFormatState(settings.defaultFormat || 'CODE128')
  }

  const loadPurchaseOrderSettings = async () => {
    const settings = await getPurchaseOrderSettings()
    setPurchaseOrderSettingsState(settings)
  }

  const loadOrderSettings = async () => {
    const settings = await getOrderSettings()
    setOrderSettingsState(settings)
  }

  const loadPrinterSettings = async () => {
    const settings = await getPrinterSettings()
    setPrinterSettingsState(settings)
  }

  const loadIntegrationSettings = async () => {
    const settings = await getIntegrationSettings()
    setIntegrationSettingsState(settings)
    // Check WhatsApp connection status
    if (settings.whatsapp.enabled) {
      try {
        const isConnected = await whatsappService.checkConnection()
        setIntegrationSettingsState((prev) => ({
          ...prev,
          whatsapp: { ...prev.whatsapp, isConnected },
        }))
      } catch (error) {
        console.error('Error checking WhatsApp connection:', error)
      }
    }
  }

  const loadAvailablePrinters = async () => {
    if (!window.electronPrinter) return
    
    setIsLoadingPrinters(true)
    try {
      const result = await window.electronPrinter.getPrinters()
      if (result.success && result.printers) {
        setAvailablePrinters(result.printers)
      }
    } catch (error) {
      console.error('Failed to load printers:', error)
    } finally {
      setIsLoadingPrinters(false)
    }
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

          {/* Logo Upload Section */}
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="text-sm font-semibold">Company Logo</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Upload your company logo to display on invoices. The logo will be synced to Google Drive.
            </p>
            <div className="space-y-3">
              {logo && (
                <div className="flex items-center gap-4">
                  <img
                    src={logo.dataUrl}
                    alt="Company Logo"
                    className="h-20 w-auto rounded border border-slate-300 bg-white p-2 dark:border-slate-700"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{logo.fileName}</p>
                    <p className="text-xs text-slate-500">
                      Uploaded: {new Date(logo.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to delete the logo?')) return
                      setIsUploadingLogo(true)
                      try {
                        await deleteLogo()
                        setLogo(null)
                        const currentSettings = await getPrintSettings()
                        const updatedSettings = { ...currentSettings, logoUrl: undefined, showLogo: false }
                        await setPrintSettings(updatedSettings)
                        setPrintSettingsState(updatedSettings)
                      } catch (error) {
                        alert('Failed to delete logo')
                        console.error(error)
                      } finally {
                        setIsUploadingLogo(false)
                      }
                    }}
                    disabled={isUploadingLogo}
                    className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400"
                  >
                    {isUploadingLogo ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {logo ? 'Replace Logo' : 'Upload Logo'}
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return

                    const validation = validateImageFile(file)
                    if (!validation.valid) {
                      alert(validation.error)
                      return
                    }

                    setIsUploadingLogo(true)
                    try {
                      const dataUrl = await fileToDataUrl(file)
                      const logoData: LogoData = {
                        dataUrl,
                        fileName: file.name,
                        mimeType: file.type,
                        uploadedAt: new Date().toISOString(),
                      }
                      await saveLogo(logoData)
                      setLogo(logoData)
                      
                      // Update print settings to use the logo
                      const currentSettings = await getPrintSettings()
                      const updatedSettings = { ...currentSettings, logoUrl: dataUrl, showLogo: true }
                      await setPrintSettings(updatedSettings)
                      setPrintSettingsState(updatedSettings)
                    } catch (error) {
                      alert('Failed to upload logo')
                      console.error(error)
                    } finally {
                      setIsUploadingLogo(false)
                      // Reset file input
                      e.target.value = ''
                    }
                  }}
                  disabled={isUploadingLogo}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 dark:text-slate-400 dark:file:bg-blue-900/20 dark:file:text-blue-300"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Supported formats: PNG, JPEG, GIF, WebP, SVG. Max size: 2MB.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showLogo"
                  checked={printSettings.showLogo}
                  onChange={async (e) => {
                    const newSettings = { ...printSettings, showLogo: e.target.checked }
                    setPrintSettingsState(newSettings)
                    setIsSavingPrint(true)
                    try {
                      await setPrintSettings(newSettings)
                    } finally {
                      setIsSavingPrint(false)
                    }
                  }}
                  disabled={!logo}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                />
                <label htmlFor="showLogo" className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Show logo on invoices
                </label>
              </div>
            </div>
          </div>

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

        {/* Printer Selection */}
        {window.electronPrinter && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <h2 className="text-lg font-semibold">Printer Settings</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Select a default printer for automatic printing. If no printer is selected, a printer selection dialog will appear when printing.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  Default Printer
                </label>
                {isLoadingPrinters ? (
                  <p className="text-sm text-slate-500">Loading printers...</p>
                ) : availablePrinters.length === 0 ? (
                  <p className="text-sm text-slate-500">No printers detected. Make sure your printer is connected and try refreshing.</p>
                ) : (
                  <select
                    value={printerSettings.defaultPrinterName || ''}
                    onChange={async (e) => {
                      const selectedPrinter = availablePrinters.find((p) => p.name === e.target.value)
                      const newSettings: PrinterSettings = {
                        defaultPrinterName: selectedPrinter?.name || null,
                        defaultPrinterDescription: selectedPrinter?.displayName || null,
                      }
                      setPrinterSettingsState(newSettings)
                      setIsSavingPrinter(true)
                      try {
                        await setPrinterSettings(newSettings)
                      } finally {
                        setIsSavingPrinter(false)
                      }
                    }}
                    className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  >
                    <option value="">No default printer (show dialog)</option>
                    {availablePrinters.map((printer) => (
                      <option key={printer.name} value={printer.name}>
                        {printer.displayName} {printer.isDefault ? '(System Default)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadAvailablePrinters}
                    disabled={isLoadingPrinters}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {isLoadingPrinters ? 'Refreshing...' : 'Refresh Printers'}
                  </button>
                  {isSavingPrinter && <span className="text-xs text-slate-500">Saving...</span>}
                </div>
                {printerSettings.defaultPrinterName && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    Selected: <strong>{printerSettings.defaultPrinterDescription || printerSettings.defaultPrinterName}</strong>
                    <br />
                    Invoices will be printed automatically to this printer without showing a dialog.
                  </p>
                )}
                {!printerSettings.defaultPrinterName && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    When printing, a printer selection dialog will appear for you to choose a printer.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Barcode Paper Sizes */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="text-lg font-semibold">Barcode Settings</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Manage barcode format and paper sizes for barcode printing. Create custom formats for your label sheets.
          </p>

          <div className="mt-6 space-y-6">
            {/* Barcode Format Selection */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="text-sm font-semibold mb-3">Barcode Format</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Default Barcode Format
                  </label>
                  <select
                    value={barcodeFormat}
                    onChange={async (e) => {
                      const newFormat = e.target.value as BarcodeFormat
                      setBarcodeFormatState(newFormat)
                      setIsSavingBarcodeFormat(true)
                      try {
                        await setBarcodeFormat(newFormat)
                      } catch (error) {
                        alert(error instanceof Error ? error.message : 'Failed to save barcode format')
                        // Revert on error
                        const settings = await getBarcodePaperSettings()
                        setBarcodeFormatState(settings.defaultFormat || 'CODE128')
                      } finally {
                        setIsSavingBarcodeFormat(false)
                      }
                    }}
                    disabled={isSavingBarcodeFormat}
                    className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  >
                    <option value="CODE128">CODE128 - Alphanumeric, most flexible</option>
                    <option value="EAN13">EAN13 - 13 digits, retail products</option>
                    <option value="EAN8">EAN8 - 8 digits, small products</option>
                    <option value="UPC">UPC - 12 digits, US retail</option>
                    <option value="CODE39">CODE39 - Alphanumeric, older standard</option>
                    <option value="ITF14">ITF14 - 14 digits, shipping containers</option>
                    <option value="MSI">MSI - Numeric, inventory</option>
                    <option value="pharmacode">Pharmacode - Numeric, pharmaceutical</option>
                    <option value="codabar">Codabar - Numeric + special chars, libraries</option>
                  </select>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {barcodeFormat === 'CODE128' && 'Supports any alphanumeric characters. Best for custom product codes.'}
                    {barcodeFormat === 'EAN13' && 'Requires exactly 13 digits. Used for retail products worldwide.'}
                    {barcodeFormat === 'EAN8' && 'Requires exactly 8 digits. Used for small retail products.'}
                    {barcodeFormat === 'UPC' && 'Requires exactly 12 digits. Used in US retail stores.'}
                    {barcodeFormat === 'CODE39' && 'Supports alphanumeric characters. Older standard, less compact.'}
                    {barcodeFormat === 'ITF14' && 'Requires exactly 14 digits. Used for shipping containers.'}
                    {barcodeFormat === 'MSI' && 'Numeric only. Used for inventory management.'}
                    {barcodeFormat === 'pharmacode' && 'Numeric only. Used in pharmaceutical industry.'}
                    {barcodeFormat === 'codabar' && 'Numeric and some special characters. Used in libraries and blood banks.'}
                    {isSavingBarcodeFormat && <span className="ml-2">Saving...</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Paper Sizes Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Paper Sizes</h3>
              {/* Add/Edit Paper Size Form */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="text-sm font-semibold mb-3">
                {editingBarcodePaperId ? `Edit Paper Size: ${barcodePaperForm.name}` : 'Add New Paper Size'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={barcodePaperForm.name}
                    onChange={(e) => setBarcodePaperForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., A4 Label Sheet, Custom 100x50"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Paper Width (mm)</label>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      value={barcodePaperForm.width}
                      onChange={(e) => setBarcodePaperForm((prev) => ({ ...prev, width: Number.parseInt(e.target.value) || 210 }))}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Paper Height (mm)</label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={barcodePaperForm.height}
                      onChange={(e) => setBarcodePaperForm((prev) => ({ ...prev, height: Number.parseInt(e.target.value) || 297 }))}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Columns</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={barcodePaperForm.cols}
                      onChange={(e) => setBarcodePaperForm((prev) => ({ ...prev, cols: Number.parseInt(e.target.value) || 1 }))}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Rows</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={barcodePaperForm.rows}
                      onChange={(e) => setBarcodePaperForm((prev) => ({ ...prev, rows: Number.parseInt(e.target.value) || 1 }))}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Label Width (mm)</label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={barcodePaperForm.labelWidth}
                      onChange={(e) => setBarcodePaperForm((prev) => ({ ...prev, labelWidth: Number.parseInt(e.target.value) || 50 }))}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Label Height (mm)</label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={barcodePaperForm.labelHeight}
                      onChange={(e) => setBarcodePaperForm((prev) => ({ ...prev, labelHeight: Number.parseInt(e.target.value) || 30 }))}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!barcodePaperForm.name.trim()) {
                        alert('Please enter a name')
                        return
                      }
                      setIsSavingBarcodePaper(true)
                      try {
                        if (editingBarcodePaperId) {
                          await updateBarcodePaperSize(editingBarcodePaperId, barcodePaperForm)
                        } else {
                          await addBarcodePaperSize(barcodePaperForm)
                        }
                        await loadBarcodePaperSizes()
                        setBarcodePaperForm({
                          name: '',
                          width: 210,
                          height: 297,
                          cols: 3,
                          rows: 8,
                          labelWidth: 63,
                          labelHeight: 33,
                        })
                        setEditingBarcodePaperId(null)
                      } catch (error) {
                        alert(error instanceof Error ? error.message : 'Failed to save paper size')
                      } finally {
                        setIsSavingBarcodePaper(false)
                      }
                    }}
                    disabled={!barcodePaperForm.name.trim() || isSavingBarcodePaper}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
                  >
                    {isSavingBarcodePaper ? 'Saving...' : editingBarcodePaperId ? 'Update Paper Size' : 'Add Paper Size'}
                  </button>
                  {editingBarcodePaperId && (
                    <button
                      type="button"
                      onClick={() => {
                        setBarcodePaperForm({
                          name: '',
                          width: 210,
                          height: 297,
                          cols: 3,
                          rows: 8,
                          labelWidth: 63,
                          labelHeight: 33,
                        })
                        setEditingBarcodePaperId(null)
                      }}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List of Paper Sizes */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Available Paper Sizes</h3>
              <div className="space-y-2">
                {barcodePaperSizes.map((size) => {
                  const isDefault = ['a4', 'label-50x30', 'label-40x20', 'label-30x20'].includes(size.id)
                  return (
                    <div
                      key={size.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div>
                        <p className="font-semibold text-sm">
                          {size.name}
                          {isDefault && (
                            <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Default
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          Paper: {size.width}mm × {size.height}mm • Grid: {size.cols}×{size.rows} = {size.cols * size.rows} labels • Label: {size.labelWidth}mm × {size.labelHeight}mm
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!isDefault && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setBarcodePaperForm({
                                  name: size.name,
                                  width: size.width,
                                  height: size.height,
                                  cols: size.cols,
                                  rows: size.rows,
                                  labelWidth: size.labelWidth,
                                  labelHeight: size.labelHeight,
                                })
                                setEditingBarcodePaperId(size.id)
                              }}
                              className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm(`Delete paper size "${size.name}"?`)) return
                                setIsSavingBarcodePaper(true)
                                try {
                                  await deleteBarcodePaperSize(size.id)
                                  await loadBarcodePaperSizes()
                                } catch (error) {
                                  alert(error instanceof Error ? error.message : 'Failed to delete paper size')
                                } finally {
                                  setIsSavingBarcodePaper(false)
                                }
                              }}
                              className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            </div>
          </div>
        </section>

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

                {/* Order Settings - Round Figure */}
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Order Settings</h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="defaultRoundFigure"
                      checked={orderSettings.defaultRoundFigure}
                      onChange={async (e) => {
                        const newSettings = { ...orderSettings, defaultRoundFigure: e.target.checked }
                        setOrderSettingsState(newSettings)
                        setIsSavingOrder(true)
                        try {
                          await setOrderSettings(newSettings)
                        } finally {
                          setIsSavingOrder(false)
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
                    />
                    <div className="flex-1">
                      <label htmlFor="defaultRoundFigure" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Default: Round Figure
                      </label>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        When enabled, the round figure checkbox will be checked by default in sales and purchase order forms. The difference between the original total and rounded total will be added as extra discount.
                      </p>
                    </div>
                  </div>
                  {isSavingOrder && <p className="mt-2 text-xs text-slate-500">Saving...</p>}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Integration Tab */}
        {activeTab === 'integration' && (
          <div className="space-y-6">
            {/* Google Integration */}
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

            {/* WhatsApp Integration */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">WhatsApp Integration</h2>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={integrationSettings.whatsapp.enabled}
                    onChange={async (e) => {
                      const updated = {
                        ...integrationSettings,
                        whatsapp: { ...integrationSettings.whatsapp, enabled: e.target.checked },
                      }
                      setIntegrationSettingsState(updated)
                      await updateWhatsAppSettings({ enabled: e.target.checked })
                      if (e.target.checked) {
                        setIsConnectingWhatsApp(true)
                        try {
                          await whatsappService.initialize(updated.whatsapp)
                          const qrCode = await whatsappService.getQRCode()
                          if (qrCode) {
                            setWhatsappQRCode(qrCode)
                          }
                          const isConnected = await whatsappService.checkConnection()
                          setIntegrationSettingsState((prev) => ({
                            ...prev,
                            whatsapp: { ...prev.whatsapp, isConnected },
                          }))
                        } catch (error) {
                          console.error('Error initializing WhatsApp:', error)
                        } finally {
                          setIsConnectingWhatsApp(false)
                        }
                      } else {
                        await whatsappService.disconnect()
                        setWhatsappQRCode(null)
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable WhatsApp</span>
                </label>
              </div>

              {integrationSettings.whatsapp.enabled && (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-3 w-3 rounded-full ${
                          integrationSettings.whatsapp.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                        }`}
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {integrationSettings.whatsapp.isConnected ? 'Connected to WhatsApp' : 'Not Connected'}
                        </span>
                        {integrationSettings.whatsapp.isConnected && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Ready to send invoices
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {whatsappQRCode && !integrationSettings.whatsapp.isConnected && (
                    <div className="rounded-lg border-2 border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-slate-800">
                      <div className="mb-4 text-center">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          Connect WhatsApp Web
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Follow these steps to connect your WhatsApp account
                        </p>
                      </div>
                      
                      <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                            1
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              Open WhatsApp on your phone
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              Make sure your phone has an active internet connection
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                            2
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              Tap Menu or Settings
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              On Android: Tap More options (⋮) → Linked Devices<br/>
                              On iPhone: Tap Settings → Linked Devices
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                            3
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              Tap "Link a Device"
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              Point your phone at this screen to capture the QR code
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-4">
                        <div className="bg-white p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                          {whatsappQRCode.startsWith('data:image') ? (
                            <img 
                              src={whatsappQRCode} 
                              alt="WhatsApp QR Code" 
                              className="w-64 h-64"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement
                                console.error('QR code image error. Current src length:', img.src?.length)
                                console.error('QR code value length:', whatsappQRCode?.length)
                                console.error('QR code starts with:', whatsappQRCode?.substring(0, 100))
                                setWhatsappQRCode(null)
                              }}
                              onLoad={() => {
                                console.log('QR code image loaded successfully')
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center">
                              <QRCodeSVG 
                                value={whatsappQRCode} 
                                size={256}
                                level="M"
                                includeMargin={true}
                              />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                          Scan this QR code with your phone to connect
                        </p>
                      </div>
                    </div>
                  )}

                  {isConnectingWhatsApp && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Connecting to WhatsApp...</p>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message Template</label>
                    <textarea
                      value={integrationSettings.whatsapp.messageTemplate || ''}
                      onChange={async (e) => {
                        const updated = {
                          ...integrationSettings,
                          whatsapp: { ...integrationSettings.whatsapp, messageTemplate: e.target.value },
                        }
                        setIntegrationSettingsState(updated)
                        await updateWhatsAppSettings({ messageTemplate: e.target.value })
                      }}
                      rows={6}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                      placeholder="Enter message template. Use {{customerName}}, {{invoiceNumber}}, {{total}}, etc."
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Available variables: {'{{customerName}}'}, {'{{invoiceNumber}}'}, {'{{subtotal}}'}, {'{{tax}}'}, {'{{total}}'}, {'{{paidAmount}}'}, {'{{dueAmount}}'}, {'{{items}}'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Note: Invoice will be sent as PDF attachment along with this message
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setIsConnectingWhatsApp(true)
                      try {
                        await whatsappService.initialize(integrationSettings.whatsapp)
                        const qrCode = await whatsappService.getQRCode()
                        if (qrCode) {
                          setWhatsappQRCode(qrCode)
                        }
                        const isConnected = await whatsappService.checkConnection()
                        setIntegrationSettingsState((prev) => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, isConnected },
                        }))
                      } catch (error) {
                        console.error('Error connecting WhatsApp:', error)
                      } finally {
                        setIsConnectingWhatsApp(false)
                      }
                    }}
                    disabled={isConnectingWhatsApp}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-green-400"
                  >
                    {isConnectingWhatsApp ? 'Connecting...' : 'Connect WhatsApp'}
                  </button>
                </div>
              )}
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
