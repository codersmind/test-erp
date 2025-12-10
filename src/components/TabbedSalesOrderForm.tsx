import { useState, useRef, useEffect, useMemo } from 'react'
import { Formik, FieldArray } from 'formik'
import { nanoid } from 'nanoid'
import { GripVertical } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'

import { TabSystem, type Tab } from './TabSystem'
import { useFormNavigation } from '../hooks/useFormNavigation'
import { useCreateSalesOrder } from '../hooks/useSalesOrders'
import { CustomerQuickCreateModal } from './CustomerQuickCreateModal'
import { ProductQuickCreateModal } from './ProductQuickCreateModal'
import { SalesOrderPrintModal } from './SalesOrderPrintModal'
import { ConfirmationDialog } from './ConfirmationDialog'
import { useBlocker } from 'react-router-dom'
import { LazyProductPicker, type LazyProductPickerRef } from './LazyProductPicker'
import { LazyCustomerPicker } from './LazyCustomerPicker'
import { getTaxSettings, calculateTax, COMMON_GST_RATES, INDIAN_STATES, type TaxSettings } from '../utils/taxSettings'
import { getProduct, getCustomer } from '../db/localDataService'
import { salesOrderSchema, type SalesOrderFormValues } from '../utils/validationSchemas'
import { getOrderSettings } from '../utils/orderSettings'
import type { SalesOrder, SalesOrderItem } from '../db/schema'

interface TabData {
  id: string
  customerId: string
  customerName: string
  formValues: SalesOrderFormValues
}

interface TabbedSalesOrderFormProps {
  onOrderCreated?: (order: SalesOrder, items: SalesOrderItem[]) => void
}

export const TabbedSalesOrderForm = ({ onOrderCreated }: TabbedSalesOrderFormProps) => {
  const [tabs, setTabs] = useState<TabData[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [initialTaxSettings, setInitialTaxSettings] = useState<TaxSettings | null>(null)
  const [defaultRoundFigure, setDefaultRoundFigure] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [newlyCreatedOrder, setNewlyCreatedOrder] = useState<SalesOrder | null>(null)
  const [newlyCreatedItems, setNewlyCreatedItems] = useState<SalesOrderItem[]>([])
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null)
  const [activeTabForModal, setActiveTabForModal] = useState<string | null>(null)
  const [tabToClose, setTabToClose] = useState<string | null>(null)
  const [showCloseTabDialog, setShowCloseTabDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)
  const [showNavigationDialog, setShowNavigationDialog] = useState(false)
  const createSalesOrderMutation = useCreateSalesOrder()

  const formikRefs = useRef<Record<string, { setFieldValue: (field: string, value: any) => void } | null>>({})
  const formikValuesRefs = useRef<Record<string, SalesOrderFormValues | null>>({})
  const productPickerRefs = useRef<Record<string, Record<number, LazyProductPickerRef | null>>>({})
  const isSearchingRef = useRef<Record<string, Record<number, boolean>>>({})
  const originalProductIdRef = useRef<Record<string, Record<number, string>>>({})
  const draggedIndexRef = useRef<Record<string, number | null>>({})
  const dragOverIndexRef = useRef<Record<string, number | null>>({})
  const pushRef = useRef<Record<string, ((item: any) => void) | null>>({})

  // Load settings on mount
  useEffect(() => {
    Promise.all([getTaxSettings(), getOrderSettings()]).then(([taxSettings, orderSettings]) => {
      setInitialTaxSettings(taxSettings)
      setDefaultRoundFigure(orderSettings.defaultRoundFigure)
      
      // Create initial tab
      const initialTab = createNewTab(taxSettings, orderSettings.defaultRoundFigure, 1)
      setTabs([initialTab])
      setActiveTabId(initialTab.id)
    })
  }, [])

  const getInitialValues = (taxSettings: TaxSettings, roundFigure: boolean): SalesOrderFormValues => ({
    customerId: '',
    issuedDate: new Date().toISOString().split('T')[0],
    lineItems: [{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
    type: taxSettings.type,
    gstRate: taxSettings.gstRate,
    cgstRate: taxSettings.cgstRate,
    sgstRate: taxSettings.sgstRate,
    defaultState: taxSettings.defaultState || undefined,
    stateRates: taxSettings.stateRates || {},
    selectedState: taxSettings.defaultState || undefined,
    orderDiscount: 0,
    orderDiscountType: 'amount',
    isPaid: false,
    paidAmount: 0,
    roundFigure,
  })

  const createNewTab = (taxSettings: TaxSettings, roundFigure: boolean, tabNumber: number): TabData => {
    const id = nanoid()
    return {
      id,
      customerId: '',
      customerName: `Tab ${tabNumber}`,
      formValues: getInitialValues(taxSettings, roundFigure),
    }
  }

  const handleAddTab = () => {
    if (!initialTaxSettings) return
    const tabNumber = tabs.length + 1
    const newTab = createNewTab(initialTaxSettings, defaultRoundFigure, tabNumber)
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
  }

  // Check if a tab has unsaved changes
  const isTabDirty = (tabId: string): boolean => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return false
    
    // Check if customer is selected
    if (tab.formValues.customerId) return true
    
    // Check if any line items have products
    if (tab.formValues.lineItems?.some((item) => item.productId && item.quantity > 0)) {
      return true
    }
    
    return false
  }

  // Check if any tab has unsaved changes
  const hasUnsavedChanges = (): boolean => {
    return tabs.some((tab) => isTabDirty(tab.id))
  }

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) return // Don't close last tab
    
    // Check if tab has unsaved changes
    if (isTabDirty(tabId)) {
      setTabToClose(tabId)
      setShowCloseTabDialog(true)
      return
    }
    
    // Close tab immediately if no unsaved changes
    closeTabInternal(tabId)
  }

  const closeTabInternal = (tabId: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId)
      // Renumber tabs that don't have customer names
      return filtered.map((t, index) => {
        if (!t.customerId && !t.customerName.startsWith('Tab ')) {
          return { ...t, customerName: `Tab ${index + 1}` }
        }
        if (!t.customerId) {
          return { ...t, customerName: `Tab ${index + 1}` }
        }
        return t
      })
    })
    // Clean up refs
    delete formikRefs.current[tabId]
    delete formikValuesRefs.current[tabId]
    delete productPickerRefs.current[tabId]
    delete isSearchingRef.current[tabId]
    delete originalProductIdRef.current[tabId]
    delete draggedIndexRef.current[tabId]
    delete dragOverIndexRef.current[tabId]
    delete pushRef.current[tabId]
  }

  // Navigation blocking
  const blocker = useBlocker(hasUnsavedChanges())
  
  useEffect(() => {
    if (blocker.state === 'blocked' && hasUnsavedChanges()) {
      setPendingNavigation(() => () => blocker.proceed())
      setShowNavigationDialog(true)
    }
  }, [blocker.state])

  // Handle browser beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [tabs])

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId)
  }

  const handleNextTab = () => {
    if (tabs.length <= 1) return
    const currentIndex = tabs.findIndex((t) => t.id === activeTabId)
    const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
    setActiveTabId(tabs[nextIndex].id)
  }

  const handlePreviousTab = () => {
    if (tabs.length <= 1) return
    const currentIndex = tabs.findIndex((t) => t.id === activeTabId)
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
    setActiveTabId(tabs[prevIndex].id)
  }

  const handleCloseCurrentTab = () => {
    if (activeTabId) {
      handleCloseTab(activeTabId)
    }
  }

  // Keyboard shortcuts
  useHotkeys(
    'ctrl+t, cmd+t',
    (e: KeyboardEvent) => {
      e.preventDefault()
      handleAddTab()
    },
    { enableOnFormTags: false },
    [tabs, initialTaxSettings, defaultRoundFigure]
  )

  useHotkeys(
    'ctrl+w, cmd+w',
    (e: KeyboardEvent) => {
      e.preventDefault()
      handleCloseCurrentTab()
    },
    { enableOnFormTags: false },
    [activeTabId, tabs]
  )

  useHotkeys(
    'ctrl+tab',
    (e: KeyboardEvent) => {
      e.preventDefault()
      handleNextTab()
    },
    { enableOnFormTags: false },
    [tabs, activeTabId]
  )

  useHotkeys(
    'ctrl+shift+tab',
    (e: KeyboardEvent) => {
      e.preventDefault()
      handlePreviousTab()
    },
    { enableOnFormTags: false },
    [tabs, activeTabId]
  )

  const updateTabCustomer = (tabId: string, customerId: string, customerName: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, customerId, customerName } : tab))
    )
  }

  if (!initialTaxSettings) {
    return <div className="p-6">Loading...</div>
  }

  const tabComponents: Tab[] = tabs.map((tabData) => ({
    id: tabData.id,
    label: tabData.customerName,
    isDirty: tabData.formValues.lineItems?.some((item) => item.productId && item.quantity > 0) || false,
    content: (
      <div className="p-4 sm:p-6">
        <Formik
          key={tabData.id}
          enableReinitialize
          initialValues={tabData.formValues}
          validationSchema={salesOrderSchema}
          onSubmit={async (values, { resetForm }) => {
            if (!values.customerId) {
              setActiveTabForModal(tabData.id)
              setShowCustomerModal(true)
              return
            }

            const lineItems = values.lineItems || []
            const validItems = lineItems.filter((item) => item.productId && item.quantity > 0 && item.unitPrice > 0)
            if (validItems.length === 0) return

            const subtotal = validItems.reduce((sum, item) => {
              return sum + item.quantity * item.unitPrice - (item.discount || 0)
            }, 0)

            const taxSettingsForCalc: TaxSettings = {
              type: values.type,
              gstRate: values.gstRate,
              cgstRate: values.cgstRate,
              sgstRate: values.sgstRate,
              defaultState: values.defaultState || undefined,
              stateRates: values.stateRates || {},
            }
            const taxCalculation = calculateTax(subtotal, taxSettingsForCalc, values.selectedState || undefined)
            const totalBeforeDiscount = subtotal + taxCalculation.tax

            const orderDiscountAmount =
              values.orderDiscount <= 0
                ? 0
                : values.orderDiscountType === 'percentage'
                  ? totalBeforeDiscount * (values.orderDiscount / 100)
                  : values.orderDiscount

            let totalAmount = Math.max(0, totalBeforeDiscount - orderDiscountAmount)
            let finalDiscount = orderDiscountAmount
            if (values.roundFigure) {
              const roundedTotal = Math.round(totalAmount)
              const roundDifference = totalAmount - roundedTotal
              totalAmount = roundedTotal
              if (roundDifference > 0) {
                finalDiscount = orderDiscountAmount + roundDifference
              }
            }

            const result = await createSalesOrderMutation.mutateAsync({
              customerId: values.customerId,
              items: validItems.map((item) => ({
                productId: item.productId!,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount || 0,
                lineTotal: item.quantity * item.unitPrice - (item.discount || 0),
              })),
              taxSettings: {
                type: values.type,
                gstRate: values.gstRate,
                cgstRate: values.cgstRate,
                sgstRate: values.sgstRate,
                defaultState: values.defaultState ?? undefined,
                stateRates: values.stateRates || {},
              },
              discount: finalDiscount,
              discountType: values.orderDiscountType,
              paidAmount: values.isPaid ? totalAmount : (values.paidAmount || 0),
              notes: 'Captured offline',
              roundFigure: values.roundFigure,
            })

            setNewlyCreatedOrder(result.salesOrder)
            setNewlyCreatedItems(result.items)
            setShowPrintModal(true)
            onOrderCreated?.(result.salesOrder, result.items)

            const defaultTax = await getTaxSettings()
            const newValues = getInitialValues(defaultTax, defaultRoundFigure)
            resetForm({ values: newValues })
            // Get the tab index to determine tab number
            const tabIndex = tabs.findIndex((t) => t.id === tabData.id)
            const tabNumber = tabIndex >= 0 ? tabIndex + 1 : tabs.length + 1
            updateTabCustomer(tabData.id, '', `Tab ${tabNumber}`)
            setTabs((prev) =>
              prev.map((t) => (t.id === tabData.id ? { ...t, formValues: newValues, customerId: '', customerName: `Tab ${tabNumber}` } : t))
            )
          }}
        >
          {({ values, handleSubmit, isSubmitting, setFieldValue, errors, touched }) => {
            // Store refs
            formikRefs.current[tabData.id] = { setFieldValue }
            formikValuesRefs.current[tabData.id] = values

            // Keyboard shortcuts for this form
            useHotkeys(
              'ctrl+s, cmd+s',
              (e: KeyboardEvent) => {
                e.preventDefault()
                if (!isSubmitting && values.customerId) {
                  handleSubmit()
                }
              },
              { enableOnFormTags: ['input', 'textarea', 'select'] },
              [isSubmitting, values.customerId, handleSubmit]
            )

            useHotkeys(
              'ctrl+n, cmd+n',
              (e: KeyboardEvent) => {
                e.preventDefault()
                const push = pushRef.current[tabData.id]
                if (push) {
                  push({ productId: '', quantity: 1, unitPrice: 0, discount: 0 })
                }
              },
              { enableOnFormTags: false },
              [tabData.id]
            )

            useHotkeys(
              'ctrl+shift+c, cmd+shift+c',
              (e: KeyboardEvent) => {
                e.preventDefault()
                setActiveTabForModal(tabData.id)
                setShowCustomerModal(true)
              },
              { enableOnFormTags: false },
              [tabData.id]
            )

            useHotkeys(
              'ctrl+shift+p, cmd+shift+p',
              (e: KeyboardEvent) => {
                e.preventDefault()
                setActiveTabForModal(tabData.id)
                setShowProductModal(true)
              },
              { enableOnFormTags: false },
              [tabData.id]
            )

            // Sync form values back to tab data whenever they change
            // Store current values in ref for cleanup
            const currentValuesRef = useRef(values)
            currentValuesRef.current = values
            
            useEffect(() => {
              // Sync values immediately
              setTabs((prev) =>
                prev.map((t) => (t.id === tabData.id ? { ...t, formValues: values } : t))
              )
              
              // Cleanup: sync values when component unmounts (tab becomes inactive)
              return () => {
                setTabs((prev) =>
                  prev.map((t) => (t.id === tabData.id ? { ...t, formValues: currentValuesRef.current } : t))
                )
              }
            }, [values, tabData.id])

            // Update tab name when customer changes
            useEffect(() => {
              if (values.customerId && values.customerId !== tabData.customerId) {
                getCustomer(values.customerId).then((customer) => {
                  if (customer) {
                    updateTabCustomer(tabData.id, customer.id, customer.name)
                  }
                })
              } else if (!values.customerId) {
                // Get the tab index to determine tab number
                const tabIndex = tabs.findIndex((t) => t.id === tabData.id)
                const tabNumber = tabIndex >= 0 ? tabIndex + 1 : tabs.length + 1
                if (!tabData.customerName.startsWith('Tab ')) {
                  updateTabCustomer(tabData.id, '', `Tab ${tabNumber}`)
                }
              }
            }, [values.customerId, tabData.id, tabData.customerId, tabData.customerName, tabs])

            // Load customer state when customer is selected
            useEffect(() => {
              if (values.customerId) {
                getCustomer(values.customerId).then((customer) => {
                  if (customer?.state) {
                    setFieldValue('selectedState', customer.state)
                    getTaxSettings().then((settings) => {
                      if (settings.stateRates[customer.state!]) {
                        const stateConfig = settings.stateRates[customer.state!]
                        setFieldValue('type', stateConfig.type)
                        setFieldValue('gstRate', stateConfig.gstRate)
                        setFieldValue('cgstRate', stateConfig.cgstRate)
                        setFieldValue('sgstRate', stateConfig.sgstRate)
                      }
                    })
                  }
                })
              }
            }, [values.customerId, setFieldValue])

            const lineItems = values.lineItems || []
            const subtotal = useMemo(
              () =>
                lineItems.reduce((sum, item) => {
                  if (item.productId && item.quantity > 0 && item.unitPrice > 0) {
                    return sum + item.quantity * item.unitPrice - (item.discount || 0)
                  }
                  return sum
                }, 0),
              [lineItems],
            )

            const taxCalculation = useMemo(() => {
              const taxSettingsForCalc: TaxSettings = {
                type: values.type,
                gstRate: values.gstRate,
                cgstRate: values.cgstRate,
                sgstRate: values.sgstRate,
                defaultState: values.defaultState || undefined,
                stateRates: values.stateRates || {},
              }
              return calculateTax(subtotal, taxSettingsForCalc, values.selectedState || undefined)
            }, [subtotal, values])

            const totalBeforeDiscount = subtotal + taxCalculation.tax

            const orderDiscountAmount = useMemo(() => {
              if ((values.orderDiscount || 0) <= 0) return 0
              if (values.orderDiscountType === 'percentage') {
                return totalBeforeDiscount * ((values.orderDiscount || 0) / 100)
              }
              return values.orderDiscount || 0
            }, [totalBeforeDiscount, values.orderDiscount, values.orderDiscountType])

            let totalAmount = Math.max(0, totalBeforeDiscount - orderDiscountAmount)
            let roundDifference = 0
            if (values.roundFigure) {
              const roundedTotal = Math.round(totalAmount)
              roundDifference = totalAmount - roundedTotal
              totalAmount = roundedTotal
              if (roundDifference <= 0) {
                roundDifference = 0
              }
            }

            // Initialize refs for this tab if needed
            if (!productPickerRefs.current[tabData.id]) {
              productPickerRefs.current[tabData.id] = {}
            }
            if (!isSearchingRef.current[tabData.id]) {
              isSearchingRef.current[tabData.id] = {}
            }
            if (!originalProductIdRef.current[tabData.id]) {
              originalProductIdRef.current[tabData.id] = {}
            }
            if (draggedIndexRef.current[tabData.id] === undefined) {
              draggedIndexRef.current[tabData.id] = null
            }
            if (dragOverIndexRef.current[tabData.id] === undefined) {
              dragOverIndexRef.current[tabData.id] = null
            }

            const formRef = useRef<HTMLFormElement>(null)
            useFormNavigation(formRef)

            return (
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Customer</label>
                  <div className="mt-1">
                    <LazyCustomerPicker
                      value={values.customerId}
                      onChange={(customerId) => setFieldValue('customerId', customerId)}
                      onQuickCreate={() => {
                        setActiveTabForModal(tabData.id)
                        setShowCustomerModal(true)
                      }}
                      type="customer"
                      placeholder="Search customers..."
                    />
                    {touched.customerId && errors.customerId && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{String(errors.customerId)}</p>
                    )}
                  </div>
                </div>

                <FieldArray name="lineItems">
                  {({ push, remove, move }) => {
                    // Store push function in ref for keyboard shortcut handling
                    pushRef.current[tabData.id] = push

                    const handleDragStart = (e: React.DragEvent, index: number) => {
                      draggedIndexRef.current[tabData.id] = index
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/html', index.toString())
                    }

                    const handleDragOver = (e: React.DragEvent, index: number) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (draggedIndexRef.current[tabData.id] !== null && draggedIndexRef.current[tabData.id] !== index) {
                        dragOverIndexRef.current[tabData.id] = index
                      }
                    }

                    const handleDragLeave = () => {
                      dragOverIndexRef.current[tabData.id] = null
                    }

                    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
                      e.preventDefault()
                      const draggedIndex = draggedIndexRef.current[tabData.id]
                      if (draggedIndex !== null && draggedIndex !== dropIndex) {
                        move(draggedIndex, dropIndex)
                        productPickerRefs.current[tabData.id] = {}
                      }
                      draggedIndexRef.current[tabData.id] = null
                      dragOverIndexRef.current[tabData.id] = null
                    }

                    const handleDragEnd = () => {
                      draggedIndexRef.current[tabData.id] = null
                      dragOverIndexRef.current[tabData.id] = null
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Items</label>
                          <button
                            type="button"
                            onClick={() => push({ productId: '', quantity: 1, unitPrice: 0, discount: 0 })}
                            className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                          >
                            + Add item
                          </button>
                        </div>
                        <div className="space-y-3">
                          {lineItems.map((item, index) => {
                            const stableKey = item.productId ? `product-${item.productId}-${index}` : `empty-${index}`
                            const draggedIndex = draggedIndexRef.current[tabData.id]
                            const dragOverIndex = dragOverIndexRef.current[tabData.id]
                            return (
                              <div
                                key={stableKey}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`grid grid-cols-1 gap-3 rounded-lg border p-3 transition-all sm:grid-cols-12 ${
                                  draggedIndex === index
                                    ? 'border-blue-500 bg-blue-50 opacity-50 dark:border-blue-400 dark:bg-blue-900/20'
                                    : dragOverIndex === index
                                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
                                }`}
                              >
                                <div className="sm:col-span-4">
                                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Product</label>
                                  <div className="mt-1 flex items-center gap-2">
                                    <GripVertical className="h-5 w-5 cursor-move text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
                                    <div className="w-full">
                                      <LazyProductPicker
                                        ref={(ref) => {
                                          if (!productPickerRefs.current[tabData.id]) {
                                            productPickerRefs.current[tabData.id] = {}
                                          }
                                          productPickerRefs.current[tabData.id][index] = ref
                                        }}
                                        value={item.productId || ''}
                                        onChange={async (productId) => {
                                          if (!isSearchingRef.current[tabData.id]) {
                                            isSearchingRef.current[tabData.id] = {}
                                          }
                                          isSearchingRef.current[tabData.id][index] = false
                                          if (originalProductIdRef.current[tabData.id]) {
                                            delete originalProductIdRef.current[tabData.id][index]
                                          }
                                          if (!productId) {
                                            setFieldValue(`lineItems.${index}.productId`, '')
                                            setFieldValue(`lineItems.${index}.unitPrice`, 0)
                                            setFieldValue(`lineItems.${index}.discount`, 0)
                                            return
                                          }
                                          const product = await getProduct(productId)
                                          if (product) {
                                            const unitPrice = product.salePrice ?? product.price ?? 0
                                            setFieldValue(`lineItems.${index}.productId`, productId)
                                            setFieldValue(`lineItems.${index}.unitPrice`, unitPrice)
                                            setFieldValue(`lineItems.${index}.discount`, 0)

                                            const currentItems = values.lineItems || []
                                            if (index === currentItems.length - 1) {
                                              const newIndex = currentItems.length
                                              push({ productId: '', quantity: 1, unitPrice: 0, discount: 0 })
                                              setTimeout(() => {
                                                productPickerRefs.current[tabData.id]?.[newIndex]?.focus()
                                              }, 100)
                                            }
                                          }
                                        }}
                                        onSearchStart={() => {
                                          const currentItem = lineItems[index]
                                          if (currentItem?.productId) {
                                            if (!originalProductIdRef.current[tabData.id]) {
                                              originalProductIdRef.current[tabData.id] = {}
                                            }
                                            originalProductIdRef.current[tabData.id][index] = currentItem.productId
                                          }
                                          if (!isSearchingRef.current[tabData.id]) {
                                            isSearchingRef.current[tabData.id] = {}
                                          }
                                          isSearchingRef.current[tabData.id][index] = true
                                        }}
                                        onSearchEnd={() => {
                                          if (isSearchingRef.current[tabData.id]) {
                                            isSearchingRef.current[tabData.id][index] = false
                                          }
                                          setTimeout(() => {
                                            if (originalProductIdRef.current[tabData.id]) {
                                              delete originalProductIdRef.current[tabData.id][index]
                                            }
                                          }, 100)
                                        }}
                                        onQuickCreate={() => {
                                          setActiveTabForModal(tabData.id)
                                          setSelectedProductIndex(index)
                                          setShowProductModal(true)
                                        }}
                                        placeholder="Search products or scan barcode..."
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Qty</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(event) =>
                                      setFieldValue(`lineItems.${index}.quantity`, Number.parseInt(event.target.value) || 1)
                                    }
                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Price</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unitPrice || ''}
                                    onChange={(event) =>
                                      setFieldValue(`lineItems.${index}.unitPrice`, Number.parseFloat(event.target.value) || 0)
                                    }
                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Discount</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.discount || ''}
                                    onChange={(event) =>
                                      setFieldValue(`lineItems.${index}.discount`, Number.parseFloat(event.target.value) || 0)
                                    }
                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="sm:col-span-1">
                                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Total</label>
                                  <div className="mt-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800">
                                    {((item.quantity * item.unitPrice) - (item.discount || 0)).toLocaleString(undefined, {
                                      style: 'currency',
                                      currency: 'INR',
                                    })}
                                  </div>
                                </div>
                                <div className="flex items-end sm:col-span-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (lineItems.length > 1) {
                                        remove(index)
                                      } else {
                                        setFieldValue(`lineItems.${index}.productId`, '')
                                        setFieldValue(`lineItems.${index}.quantity`, 1)
                                        setFieldValue(`lineItems.${index}.unitPrice`, 0)
                                        setFieldValue(`lineItems.${index}.discount`, 0)
                                      }
                                    }}
                                    className="w-full rounded-md border border-red-300 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400"
                                    title="Remove item"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }}
                </FieldArray>

                {/* Tax and Summary Section - Simplified for space */}
                <div className="mt-6 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
                      Tax Configuration
                    </summary>
                    <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">State</label>
                        <select
                          value={values.selectedState || ''}
                          onChange={(e) => {
                            const selectedState = e.target.value || undefined
                            setFieldValue('selectedState', selectedState)
                            if (selectedState && values.stateRates && typeof values.stateRates === 'object' && selectedState in values.stateRates) {
                              const stateConfig = (values.stateRates as Record<string, any>)[selectedState]
                              setFieldValue('type', stateConfig.type)
                              setFieldValue('gstRate', stateConfig.gstRate)
                              setFieldValue('cgstRate', stateConfig.cgstRate)
                              setFieldValue('sgstRate', stateConfig.sgstRate)
                            }
                          }}
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                        >
                          <option value="">Default (No state-specific rate)</option>
                          {INDIAN_STATES.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Tax Type</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const totalRate = values.type === 'cgst_sgst' ? values.cgstRate + values.sgstRate : values.gstRate
                              setFieldValue('type', 'gst')
                              setFieldValue('gstRate', totalRate)
                            }}
                            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                              values.type === 'gst'
                                ? 'bg-blue-600 text-white'
                                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                          >
                            GST
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const totalRate = values.type === 'gst' ? values.gstRate : values.cgstRate + values.sgstRate
                              const halfRate = totalRate / 2
                              setFieldValue('type', 'cgst_sgst')
                              setFieldValue('cgstRate', halfRate)
                              setFieldValue('sgstRate', halfRate)
                            }}
                            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                              values.type === 'cgst_sgst'
                                ? 'bg-blue-600 text-white'
                                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                          >
                            CGST + SGST
                          </button>
                        </div>
                      </div>
                      {values.type === 'gst' ? (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">GST Rate (%)</label>
                          <div className="flex gap-2">
                            <select
                              value={values.gstRate}
                              onChange={(e) => setFieldValue('gstRate', Number.parseFloat(e.target.value))}
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
                              value={values.gstRate}
                              onChange={(event) => setFieldValue('gstRate', Number.parseFloat(event.target.value) || 0)}
                              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                              placeholder="Custom rate"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">CGST Rate (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="50"
                              step="0.01"
                              value={values.cgstRate}
                              onChange={(event) => setFieldValue('cgstRate', Number.parseFloat(event.target.value) || 0)}
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">SGST Rate (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="50"
                              step="0.01"
                              value={values.sgstRate}
                              onChange={(event) => setFieldValue('sgstRate', Number.parseFloat(event.target.value) || 0)}
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </details>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {subtotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                      <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                        {values.type === 'gst' ? (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">GST ({values.gstRate}%)</span>
                            <span className="font-medium text-slate-900 dark:text-slate-50">
                              {taxCalculation.tax.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-400">CGST ({values.cgstRate}%)</span>
                              <span className="font-medium text-slate-900 dark:text-slate-50">
                                {taxCalculation.cgst?.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) ?? '₹0.00'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-400">SGST ({values.sgstRate}%)</span>
                              <span className="font-medium text-slate-900 dark:text-slate-50">
                                {taxCalculation.sgst?.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) ?? '₹0.00'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400">Total Amount</span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {totalBeforeDiscount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-600 dark:text-slate-400">Total Amount Discount</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={values.orderDiscount || ''}
                            onChange={(event) => setFieldValue('orderDiscount', Number.parseFloat(event.target.value) || 0)}
                            className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                            placeholder="0.00"
                          />
                          <select
                            value={values.orderDiscountType}
                            onChange={(event) => setFieldValue('orderDiscountType', event.target.value as 'amount' | 'percentage')}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                          >
                            <option value="amount">₹</option>
                            <option value="percentage">%</option>
                          </select>
                        </div>
                        {orderDiscountAmount > 0 && (
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            -{orderDiscountAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                          </span>
                        )}
                      </div>
                      {values.roundFigure && roundDifference > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Round off discount</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            -{roundDifference.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                          </span>
                        </div>
                      )}
                      <div className="mb-4 flex items-center justify-between border-t-2 border-slate-300 pt-3 dark:border-slate-600">
                        <span className="text-base font-semibold text-slate-900 dark:text-slate-50">Total</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                          {totalAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`roundFigure-${tabData.id}`}
                              checked={values.roundFigure}
                              onChange={(e) => setFieldValue('roundFigure', e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-600 dark:bg-slate-800"
                            />
                            <label htmlFor={`roundFigure-${tabData.id}`} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Round Figure
                            </label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`isPaid-${tabData.id}`}
                              checked={values.isPaid}
                              onChange={(e) => {
                                const isPaid = e.target.checked
                                setFieldValue('isPaid', isPaid)
                                setFieldValue('paidAmount', isPaid ? totalAmount : values.paidAmount)
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-600 dark:bg-slate-800"
                            />
                            <label htmlFor={`isPaid-${tabData.id}`} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Paid
                            </label>
                          </div>
                          {!values.isPaid && (
                            <div>
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Paid Amount</label>
                              <input
                                type="number"
                                min="0"
                                max={totalAmount}
                                step="0.01"
                                value={values.paidAmount || ''}
                                onChange={(e) => {
                                  const value = Number.parseFloat(e.target.value) || 0
                                  const paidAmount = Math.min(Math.max(0, value), totalAmount)
                                  setFieldValue('paidAmount', paidAmount)
                                }}
                                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                                placeholder="0.00"
                              />
                            </div>
                          )}
                          {values.paidAmount > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600 dark:text-slate-400">Paid</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {values.paidAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                              </span>
                            </div>
                          )}
                          {values.paidAmount < totalAmount && totalAmount > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600 dark:text-slate-400">Due</span>
                              <span className="font-semibold text-red-600 dark:text-red-400">
                                {(totalAmount - values.paidAmount).toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={createSalesOrderMutation.isPending || isSubmitting || !values.customerId || totalAmount === 0}
                      className="w-full rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
                    >
                      {createSalesOrderMutation.isPending || isSubmitting ? 'Saving…' : 'Save order'}
                    </button>
                  </div>
                </div>
                </form>
            )
          }}
        </Formik>
      </div>
    ),
  }))

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-lg font-semibold">Record sale</h2>
        </div>
        <div style={{ minHeight: '600px' }}>
          <TabSystem
            tabs={tabComponents}
            onTabAdd={handleAddTab}
            onTabClose={handleCloseTab}
            onTabChange={handleTabChange}
            activeTabId={activeTabId || undefined}
            defaultLabel="New Order"
          />
        </div>
      </div>

      <CustomerQuickCreateModal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false)
          setActiveTabForModal(null)
        }}
        onCustomerCreated={(customer) => {
          if (activeTabForModal && formikRefs.current[activeTabForModal]) {
            formikRefs.current[activeTabForModal]!.setFieldValue('customerId', customer.id)
          }
          setShowCustomerModal(false)
          setActiveTabForModal(null)
        }}
      />
      <ProductQuickCreateModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false)
          setSelectedProductIndex(null)
          setActiveTabForModal(null)
        }}
        onProductCreated={(product) => {
          if (activeTabForModal && formikRefs.current[activeTabForModal] && selectedProductIndex !== null) {
            const unitPrice = product.salePrice ?? product.price ?? 0
            formikRefs.current[activeTabForModal]!.setFieldValue(`lineItems.${selectedProductIndex}.productId`, product.id)
            formikRefs.current[activeTabForModal]!.setFieldValue(`lineItems.${selectedProductIndex}.unitPrice`, unitPrice)
            formikRefs.current[activeTabForModal]!.setFieldValue(`lineItems.${selectedProductIndex}.discount`, 0)
          }
          setShowProductModal(false)
          setSelectedProductIndex(null)
          setActiveTabForModal(null)
        }}
      />
      <SalesOrderPrintModal
        isOpen={showPrintModal}
        onClose={() => {
          setShowPrintModal(false)
          setNewlyCreatedOrder(null)
          setNewlyCreatedItems([])
        }}
        order={newlyCreatedOrder}
        items={newlyCreatedItems}
      />
      <ConfirmationDialog
        isOpen={showCloseTabDialog}
        onClose={() => {
          setShowCloseTabDialog(false)
          setTabToClose(null)
        }}
        onConfirm={() => {
          if (tabToClose) {
            closeTabInternal(tabToClose)
          }
          setShowCloseTabDialog(false)
          setTabToClose(null)
        }}
        title="Discard Changes?"
        message="This tab has unsaved changes. Are you sure you want to close it? All changes will be lost."
        confirmText="Discard"
        cancelText="Cancel"
        confirmButtonColor="red"
      />
      <ConfirmationDialog
        isOpen={showNavigationDialog}
        onClose={() => {
          setShowNavigationDialog(false)
          if (blocker.state === 'blocked') {
            blocker.reset()
          }
          setPendingNavigation(null)
        }}
        onConfirm={() => {
          if (pendingNavigation) {
            pendingNavigation()
          }
          setShowNavigationDialog(false)
          setPendingNavigation(null)
        }}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        confirmText="Leave"
        cancelText="Cancel"
        confirmButtonColor="red"
      />
    </>
  )
}

