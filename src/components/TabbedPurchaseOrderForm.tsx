import { useState, useRef, useEffect } from 'react'
import { Formik, FieldArray } from 'formik'
import { nanoid } from 'nanoid'
import { GripVertical } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'

import { TabSystem, type Tab } from './TabSystem'
import { useFormNavigation } from '../hooks/useFormNavigation'
import { useCreatePurchaseOrder } from '../hooks/usePurchaseOrders'
import { CustomerQuickCreateModal } from './CustomerQuickCreateModal'
import { ProductQuickCreateModal } from './ProductQuickCreateModal'
import { ConfirmationDialog } from './ConfirmationDialog'
import { useBlocker } from 'react-router-dom'
import { LazyProductPicker, type LazyProductPickerRef } from './LazyProductPicker'
import { LazyCustomerPicker } from './LazyCustomerPicker'
import { getProduct, getCustomer } from '../db/localDataService'
import { purchaseOrderSchema, type PurchaseOrderFormValues } from '../utils/validationSchemas'
import { getPurchaseOrderSettings } from '../utils/purchaseOrderSettings'
import { getOrderSettings } from '../utils/orderSettings'
import type { PurchaseOrder, PurchaseOrderItem } from '../db/schema'

interface TabData {
  id: string
  supplierId: string
  supplierName: string
  formValues: PurchaseOrderFormValues
}

interface TabbedPurchaseOrderFormProps {
  onOrderCreated?: (order: PurchaseOrder, items: PurchaseOrderItem[]) => void
}

export const TabbedPurchaseOrderForm = ({ onOrderCreated }: TabbedPurchaseOrderFormProps) => {
  const [tabs, setTabs] = useState<TabData[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [defaultAddToInventory, setDefaultAddToInventory] = useState(true)
  const [defaultRoundFigure, setDefaultRoundFigure] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null)
  const [activeTabForModal, setActiveTabForModal] = useState<string | null>(null)
  const [tabToClose, setTabToClose] = useState<string | null>(null)
  const [showCloseTabDialog, setShowCloseTabDialog] = useState(false)
  const [showNavigationDialog, setShowNavigationDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)
  const createPurchaseOrderMutation = useCreatePurchaseOrder()

  const formikRefs = useRef<Record<string, { setFieldValue: (field: string, value: any) => void } | null>>({})
  const formikValuesRefs = useRef<Record<string, PurchaseOrderFormValues | null>>({})
  const productPickerRefs = useRef<Record<string, Record<number, LazyProductPickerRef | null>>>({})
  const isSearchingRef = useRef<Record<string, Record<number, boolean>>>({})
  const originalProductIdRef = useRef<Record<string, Record<number, string>>>({})
  const draggedIndexRef = useRef<Record<string, number | null>>({})
  const dragOverIndexRef = useRef<Record<string, number | null>>({})

  // Load settings on mount
  useEffect(() => {
    Promise.all([getPurchaseOrderSettings(), getOrderSettings()]).then(([purchaseSettings, orderSettings]) => {
      setDefaultAddToInventory(purchaseSettings.defaultAddToInventory)
      setDefaultRoundFigure(orderSettings.defaultRoundFigure)
      
      // Create initial tab
      const initialTab = createNewTab(purchaseSettings.defaultAddToInventory, orderSettings.defaultRoundFigure, 1)
      setTabs([initialTab])
      setActiveTabId(initialTab.id)
    })
  }, [])

  const getInitialValues = (addToInventory: boolean, roundFigure: boolean): PurchaseOrderFormValues => ({
    supplierId: '',
    lineItems: [{ productId: '', quantity: 1, unitCost: 0 }],
    addToInventory,
    isPaid: false,
    paidAmount: 0,
    roundFigure,
  })

  const createNewTab = (addToInventory: boolean, roundFigure: boolean, tabNumber: number): TabData => {
    const id = nanoid()
    return {
      id,
      supplierId: '',
      supplierName: `Tab ${tabNumber}`,
      formValues: getInitialValues(addToInventory, roundFigure),
    }
  }

  const handleAddTab = () => {
    const tabNumber = tabs.length + 1
    const newTab = createNewTab(defaultAddToInventory, defaultRoundFigure, tabNumber)
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
  }

  // Check if a tab has unsaved changes
  const isTabDirty = (tabId: string): boolean => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return false
    
    // Check if supplier is selected
    if (tab.formValues.supplierId) return true
    
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
      // Renumber tabs that don't have supplier names
      return filtered.map((t, index) => {
        if (!t.supplierId && !t.supplierName.startsWith('Tab ')) {
          return { ...t, supplierName: `Tab ${index + 1}` }
        }
        if (!t.supplierId) {
          return { ...t, supplierName: `Tab ${index + 1}` }
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

  const updateTabSupplier = (tabId: string, supplierId: string, supplierName: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, supplierId, supplierName } : tab))
    )
  }

  if (tabs.length === 0) {
    return <div className="p-6">Loading...</div>
  }

  const tabComponents: Tab[] = tabs.map((tabData) => ({
    id: tabData.id,
    label: tabData.supplierName,
    isDirty: tabData.formValues.lineItems?.some((item) => item.productId && item.quantity > 0) || false,
    content: (
      <div className="p-4 sm:p-6">
        <Formik
          key={tabData.id}
          enableReinitialize
          initialValues={tabData.formValues}
          validationSchema={purchaseOrderSchema}
          onSubmit={async (values, { resetForm }) => {
            if (!values.supplierId) {
              setActiveTabForModal(tabData.id)
              setShowSupplierModal(true)
              return
            }

            const lineItems = values.lineItems || []
            let totalAmount = lineItems.reduce((sum, item) => {
              if (item.productId && item.quantity > 0 && item.unitCost > 0) {
                return sum + item.quantity * item.unitCost
              }
              return sum
            }, 0)

            if (values.roundFigure) {
              const roundedTotal = Math.round(totalAmount)
              totalAmount = roundedTotal
            }

            if (lineItems.some((item) => !item.productId || item.quantity <= 0 || item.unitCost <= 0)) {
              alert('Please ensure all line items have a selected product, valid quantity, and unit cost.')
              return
            }

            const supplier = await getCustomer(values.supplierId)
            if (!supplier) {
              alert('Selected supplier not found.')
              return
            }

            const result = await createPurchaseOrderMutation.mutateAsync({
              supplierName: supplier.name,
              items: lineItems
                .filter((item): item is { productId: string; quantity: number; unitCost: number } => !!item.productId)
                .map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitCost: item.unitCost,
                  lineTotal: item.quantity * item.unitCost,
                })),
              notes: 'Captured offline',
              addToInventory: values.addToInventory,
              paidAmount: values.isPaid ? totalAmount : (values.paidAmount || 0),
              roundFigure: values.roundFigure,
            })

            onOrderCreated?.(result.purchaseOrder, result.items)

            const newValues = getInitialValues(defaultAddToInventory, defaultRoundFigure)
            resetForm({ values: newValues })
            // Get the tab index to determine tab number
            const tabIndex = tabs.findIndex((t) => t.id === tabData.id)
            const tabNumber = tabIndex >= 0 ? tabIndex + 1 : tabs.length + 1
            updateTabSupplier(tabData.id, '', `Tab ${tabNumber}`)
            setTabs((prev) =>
              prev.map((t) => (t.id === tabData.id ? { ...t, formValues: newValues, supplierId: '', supplierName: `Tab ${tabNumber}` } : t))
            )
          }}
        >
          {({ values, handleSubmit, isSubmitting, setFieldValue, errors, touched }) => {
            formikRefs.current[tabData.id] = { setFieldValue }
            formikValuesRefs.current[tabData.id] = values

            // Keyboard shortcuts for this form
            useHotkeys(
              'ctrl+s, cmd+s',
              (e: KeyboardEvent) => {
                e.preventDefault()
                if (!isSubmitting && values.supplierId) {
                  handleSubmit()
                }
              },
              { enableOnFormTags: ['input', 'textarea', 'select'] },
              [isSubmitting, values.supplierId, handleSubmit]
            )

            useHotkeys(
              'ctrl+n, cmd+n',
              (e: KeyboardEvent) => {
                e.preventDefault()
                // This will be handled in FieldArray
              },
              { enableOnFormTags: false },
              []
            )

            useHotkeys(
              'ctrl+shift+c, cmd+shift+c',
              (e: KeyboardEvent) => {
                e.preventDefault()
                setActiveTabForModal(tabData.id)
                setShowSupplierModal(true)
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

            // Update tab name when supplier changes
            useEffect(() => {
              if (values.supplierId && values.supplierId !== tabData.supplierId) {
                getCustomer(values.supplierId).then((supplier) => {
                  if (supplier) {
                    updateTabSupplier(tabData.id, supplier.id, supplier.name)
                  }
                })
              } else if (!values.supplierId) {
                // Get the tab index to determine tab number
                const tabIndex = tabs.findIndex((t) => t.id === tabData.id)
                const tabNumber = tabIndex >= 0 ? tabIndex + 1 : tabs.length + 1
                if (!tabData.supplierName.startsWith('Tab ')) {
                  updateTabSupplier(tabData.id, '', `Tab ${tabNumber}`)
                }
              }
            }, [values.supplierId, tabData.id, tabData.supplierId, tabData.supplierName, tabs])

            const lineItems = values.lineItems || []
            let totalAmount = lineItems.reduce((sum, item) => {
              if (item.productId && item.quantity > 0 && item.unitCost > 0) {
                return sum + item.quantity * item.unitCost
              }
              return sum
            }, 0)
            
            let roundDifference = 0
            if (values.roundFigure) {
              const roundedTotal = Math.round(totalAmount)
              roundDifference = totalAmount - roundedTotal
              if (roundDifference > 0) {
                totalAmount = roundedTotal
              } else {
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
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Supplier</label>
                  <div className="mt-1">
                    <LazyCustomerPicker
                      value={values.supplierId}
                      onChange={(supplierId) => setFieldValue('supplierId', supplierId)}
                      onQuickCreate={() => {
                        setActiveTabForModal(tabData.id)
                        setShowSupplierModal(true)
                      }}
                      type="supplier"
                      placeholder="Search suppliers..."
                    />
                    {touched.supplierId && errors.supplierId && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{String(errors.supplierId)}</p>
                    )}
                  </div>
                </div>

                <FieldArray name="lineItems">
                  {({ push, remove, move }) => {
                    // Add item shortcut
                    useHotkeys(
                      'ctrl+n, cmd+n',
                      (e: KeyboardEvent) => {
                        e.preventDefault()
                        push({ productId: '', quantity: 1, unitCost: 0 })
                      },
                      { enableOnFormTags: false },
                      [push]
                    )

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
                            onClick={() => push({ productId: '', quantity: 1, unitCost: 0 })}
                            className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                          >
                            + Add item
                          </button>
                        </div>
                        <div className="space-y-3">
                          {lineItems.map((item, index) => {
                            const stableKey = item.productId ? `product-${item.productId}` : `empty-${index}`
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
                                            setFieldValue(`lineItems.${index}.unitCost`, 0)
                                            return
                                          }
                                          const product = await getProduct(productId)
                                          if (product) {
                                            setFieldValue(`lineItems.${index}.productId`, productId)
                                            setFieldValue(`lineItems.${index}.unitCost`, product.cost)

                                            const currentItems = values.lineItems || []
                                            if (index === currentItems.length - 1) {
                                              const newIndex = currentItems.length
                                              push({ productId: '', quantity: 1, unitCost: 0 })
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
                                <div className="sm:col-span-3">
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
                                <div className="sm:col-span-3">
                                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Unit Cost</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unitCost || ''}
                                    onChange={(event) =>
                                      setFieldValue(`lineItems.${index}.unitCost`, Number.parseFloat(event.target.value) || 0)
                                    }
                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="sm:col-span-1">
                                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Total</label>
                                  <div className="mt-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800">
                                    {(item.quantity * item.unitCost).toLocaleString(undefined, {
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
                                        setFieldValue(`lineItems.${index}.unitCost`, 0)
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

                <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`addToInventory-${tabData.id}`}
                      checked={values.addToInventory}
                      onChange={(e) => setFieldValue('addToInventory', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
                    />
                    <label htmlFor={`addToInventory-${tabData.id}`} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Add items to product inventory
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {values.addToInventory
                      ? 'Items will be added to product stock when order is created.'
                      : 'Items will be recorded in purchase order only, without updating product stock.'}
                  </p>
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                    <div className="mb-4 flex items-center justify-between">
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
                        {values.roundFigure && roundDifference > 0 && (
                          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                            <span>Round adjustment</span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                              -{roundDifference.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                            </span>
                          </div>
                        )}
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

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={createPurchaseOrderMutation.isPending || isSubmitting || !values.supplierId || totalAmount === 0}
                      className="w-full rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
                    >
                      {createPurchaseOrderMutation.isPending || isSubmitting ? 'Saving…' : 'Save purchase'}
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
          <h2 className="text-lg font-semibold">Record purchase</h2>
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
        isOpen={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false)
          setActiveTabForModal(null)
        }}
        onCustomerCreated={(supplier) => {
          if (activeTabForModal && formikRefs.current[activeTabForModal]) {
            formikRefs.current[activeTabForModal]!.setFieldValue('supplierId', supplier.id)
          }
          setShowSupplierModal(false)
          setActiveTabForModal(null)
        }}
        type="supplier"
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
            formikRefs.current[activeTabForModal]!.setFieldValue(`lineItems.${selectedProductIndex}.productId`, product.id)
            formikRefs.current[activeTabForModal]!.setFieldValue(`lineItems.${selectedProductIndex}.unitCost`, product.cost)
          }
          setShowProductModal(false)
          setSelectedProductIndex(null)
          setActiveTabForModal(null)
        }}
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

