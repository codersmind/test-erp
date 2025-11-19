import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Formik, FieldArray } from 'formik'

import { useCreateSalesOrder, useUpdateSalesOrderStatus, useUpdateSalesOrderNotes } from '../hooks/useSalesOrders'
import { useSalesOrdersPaginated } from '../hooks/useSalesOrdersPaginated'
import { db } from '../db/database'
import { ReceiptPreview } from '../components/ReceiptPreview'
import { InvoicePrint } from '../components/InvoicePrint'
import type { SalesOrder, SalesOrderItem } from '../db/schema'
import { CustomerQuickCreateModal } from '../components/CustomerQuickCreateModal'
import { ProductQuickCreateModal } from '../components/ProductQuickCreateModal'
import { SalesOrderPrintModal } from '../components/SalesOrderPrintModal'
import { LazyProductPicker } from '../components/LazyProductPicker'
import { LazyCustomerPicker } from '../components/LazyCustomerPicker'
import { Pagination } from '../components/Pagination'
import Datepicker from 'react-tailwindcss-datepicker'
import { getTaxSettings, calculateTax, COMMON_GST_RATES, INDIAN_STATES, type TaxSettings } from '../utils/taxSettings'
import { getProduct, getCustomer } from '../db/localDataService'
import { useBarcodeScanner } from '../sensors/useBarcodeScanner'
import { salesOrderSchema, type SalesOrderFormValues } from '../utils/validationSchemas'
import { getOrderSettings } from '../utils/orderSettings'
import type { Customer } from '../db/schema'

const PAGE_SIZE = 20

// Component to render a sales order row with items
const SalesOrderRow = ({ order }: { order: SalesOrder }) => {
  const [items, setItems] = useState<SalesOrderItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [showPrint, setShowPrint] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState(order.notes || '')
  const updateStatus = useUpdateSalesOrderStatus()
  const updateNotes = useUpdateSalesOrderNotes()

  useEffect(() => {
    const loadData = async () => {
      const orderItems = await db.salesOrderItems.where('orderId').equals(order.id).toArray()
      setItems(orderItems)
      const cust = await getCustomer(order.customerId)
      setCustomer(cust || null)
    }
    loadData()
  }, [order.id, order.customerId])

  useEffect(() => {
    setNoteText(order.notes || '')
  }, [order.notes])

  const handleSaveNote = async () => {
    await updateNotes.mutateAsync({ id: order.id, notes: noteText })
    setShowNote(false)
  }

  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900 dark:text-slate-50">
          {order.id.slice(0, 8)}
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
          {customer?.name ?? 'N/A'}
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
          {new Date(order.issuedDate).toLocaleDateString()}
        </td>
        <td className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
          <select
            value={order.status}
            onChange={(e) => {
              updateStatus.mutate({ id: order.id, status: e.target.value as SalesOrder['status'] })
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          >
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="complete">Complete</option>
            <option value="refund">Refund</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </td>
        <td className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-slate-500 dark:text-slate-400">
          <div className="flex flex-col items-end">
            <span>{order.total.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}</span>
            {(order.total - (order.paidAmount || 0)) > 0 && (
              <span className="text-xs text-red-600 dark:text-red-400">
                Due: {(order.total - (order.paidAmount || 0)).toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
              </span>
            )}
          </div>
        </td>
        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNote(!showNote)}
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {order.notes ? 'Edit Note' : '+ Add Note'}
            </button>
            <button
              type="button"
              onClick={() => setShowPrint(true)}
              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Print
            </button>
          </div>
        </td>
      </tr>
      {showNote && (
        <tr>
          <td colSpan={7} className="px-3 py-4">
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Note</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="Add a note to this order..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowNote(false)
                    setNoteText(order.notes || '')
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={updateNotes.isPending}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {updateNotes.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
      {showPrint && items.length > 0 && (
        <tr>
          <td colSpan={7} className="px-3 py-4">
            <InvoicePrint order={order} items={items} customerName={customer?.name} type="sales" />
            <button
              onClick={() => setShowPrint(false)}
              className="mt-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400"
            >
              Close
            </button>
          </td>
        </tr>
      )}
    </>
  )
}

export const SalesOrdersPage = () => {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{ customerId?: string; startDate?: string; endDate?: string }>({})
  const { data: paginatedData, isPending } = useSalesOrdersPaginated(page, PAGE_SIZE, filters)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [newlyCreatedOrder, setNewlyCreatedOrder] = useState<SalesOrder | null>(null)
  const [newlyCreatedItems, setNewlyCreatedItems] = useState<SalesOrderItem[]>([])
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null)
  const [initialTaxSettings, setInitialTaxSettings] = useState<TaxSettings | null>(null)
  const [defaultRoundFigure, setDefaultRoundFigure] = useState(false)
  const isSearchingRef = useRef<Record<number, boolean>>({})
  const originalProductIdRef = useRef<Record<number, string>>({})
  const formikRef = useRef<{ setFieldValue: (field: string, value: any) => void } | null>(null)
  const createSalesOrderMutation = useCreateSalesOrder()

  // Load tax settings and order settings on mount
  useEffect(() => {
    Promise.all([getTaxSettings(), getOrderSettings()]).then(([taxSettings, orderSettings]) => {
      setInitialTaxSettings(taxSettings)
      setDefaultRoundFigure(orderSettings.defaultRoundFigure)
    })
  }, [])

  const orders = paginatedData?.items ?? []
  const total = paginatedData?.total ?? 0
  const totalPages = paginatedData?.totalPages ?? 0
  const latestOrder = orders?.[0]
  const latestItems = useLiveQuery(
    () => (latestOrder ? db.salesOrderItems.where('orderId').equals(latestOrder.id).toArray() : []),
    [latestOrder?.id],
    [],
  )

  // Get initial values for Formik
  const getInitialValues = (): SalesOrderFormValues => {
    const taxSettings = initialTaxSettings || {
      type: 'gst' as const,
      gstRate: 5,
      cgstRate: 2.5,
      sgstRate: 2.5,
      defaultState: undefined,
      stateRates: {},
    }
    return {
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
      roundFigure: defaultRoundFigure,
    }
  }

  if (!initialTaxSettings) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold">Record sale</h2>
        <Formik
          enableReinitialize
          initialValues={getInitialValues()}
          validationSchema={salesOrderSchema}
          onSubmit={async (values, { resetForm }) => {
            if (!values.customerId) {
              setShowCustomerModal(true)
              return
            }

            const lineItems = values.lineItems || []
            const validItems = lineItems.filter((item) => item.productId && item.quantity > 0 && item.unitPrice > 0)
            if (validItems.length === 0) return

            const subtotal = validItems.reduce((sum, item) => {
              return sum + item.quantity * item.unitPrice - (item.discount || 0)
            }, 0)

            // Calculate tax on subtotal first (before discount)
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

            // Calculate discount on total amount (subtotal + tax)
            const orderDiscountAmount =
              values.orderDiscount <= 0
                ? 0
                : values.orderDiscountType === 'percentage'
                  ? totalBeforeDiscount * (values.orderDiscount / 100)
                  : values.orderDiscount

            let totalAmount = Math.max(0, totalBeforeDiscount - orderDiscountAmount)
            
            // Apply round figure if checked - add round difference to discount
            let finalDiscount = orderDiscountAmount
            if (values.roundFigure) {
              const roundedTotal = Math.round(totalAmount)
              const roundDifference = totalAmount - roundedTotal
              totalAmount = roundedTotal
              // Only add positive round differences to discount (when rounding down)
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

            // Show print modal with the newly created order
            setNewlyCreatedOrder(result.salesOrder)
            setNewlyCreatedItems(result.items)
            setShowPrintModal(true)

            const defaultTax = await getTaxSettings()
            resetForm({
              values: {
                customerId: '',
                issuedDate: new Date().toISOString().split('T')[0],
                lineItems: [{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
                type: defaultTax.type,
                gstRate: defaultTax.gstRate,
                cgstRate: defaultTax.cgstRate,
                sgstRate: defaultTax.sgstRate,
                defaultState: defaultTax.defaultState || undefined,
                stateRates: defaultTax.stateRates || {},
                selectedState: defaultTax.defaultState || undefined,
                orderDiscount: 0,
                orderDiscountType: 'amount',
                isPaid: false,
                paidAmount: 0,
                roundFigure: defaultRoundFigure,
              },
            })
          }}
        >
          {({ values, handleSubmit, isSubmitting, setFieldValue, errors, touched }) => {
            // Store setFieldValue in ref for modal callbacks and barcode scanner
            formikRef.current = { setFieldValue }

            // Load customer state when customer is selected
            useEffect(() => {
              if (values.customerId) {
                getCustomer(values.customerId).then((customer) => {
                  if (customer?.state) {
                    setFieldValue('selectedState', customer.state)
                    // Load state-specific tax rates if available
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

            // Handle barcode scanning
            const handleBarcodeScan = async (barcode: string) => {
              if (!barcode.trim() || !formikRef.current) return

              const product = await db.products
                .filter((p) => p.barcode?.toLowerCase() === barcode.toLowerCase() && !p.isArchived)
                .first()

              if (!product) {
                console.warn(`Product with barcode "${barcode}" not found`)
                return
              }

              const lineItems = values.lineItems || []
              const existingItemIndex = lineItems.findIndex((item) => item.productId === product.id)

              if (existingItemIndex >= 0) {
                const currentQty = lineItems[existingItemIndex]?.quantity || 1
                setFieldValue(`lineItems.${existingItemIndex}.quantity`, currentQty + 1)
              } else {
                const unitPrice = product.salePrice ?? product.price ?? 0
                const emptyItemIndex = lineItems.findIndex((item) => !item.productId)
                const hasEmptyItem = lineItems.some((item) => !item.productId)

                if (emptyItemIndex >= 0) {
                  setFieldValue(`lineItems.${emptyItemIndex}.productId`, product.id)
                  setFieldValue(`lineItems.${emptyItemIndex}.unitPrice`, unitPrice)
                  setFieldValue(`lineItems.${emptyItemIndex}.discount`, 0)
                } else {
                  const newItems = [...lineItems, { productId: product.id, quantity: 1, unitPrice, discount: 0 }]
                  if (!hasEmptyItem) {
                    newItems.push({ productId: '', quantity: 1, unitPrice: 0, discount: 0 })
                  }
                  setFieldValue('lineItems', newItems)
                }
              }
            }

            useBarcodeScanner(handleBarcodeScan)

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

            // Calculate tax on subtotal first (before discount)
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

            // Calculate discount on total amount (subtotal + tax)
            const orderDiscountAmount = useMemo(() => {
              if ((values.orderDiscount || 0) <= 0) return 0
              if (values.orderDiscountType === 'percentage') {
                return totalBeforeDiscount * ((values.orderDiscount || 0) / 100)
              }
              return values.orderDiscount || 0
            }, [totalBeforeDiscount, values.orderDiscount, values.orderDiscountType])

            let totalAmount = Math.max(0, totalBeforeDiscount - orderDiscountAmount)
            let roundDifference = 0
            
            // Apply round figure if checked - add round difference to discount
            if (values.roundFigure) {
              const roundedTotal = Math.round(totalAmount)
              roundDifference = totalAmount - roundedTotal
              totalAmount = roundedTotal
              // Only add positive round differences to discount (when rounding down)
              if (roundDifference <= 0) {
                roundDifference = 0
              }
            }

            return (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Customer</label>
                  <div className="mt-1">
                    <LazyCustomerPicker
                      value={values.customerId}
                      onChange={(customerId) => setFieldValue('customerId', customerId)}
                      onQuickCreate={() => setShowCustomerModal(true)}
                      type="customer"
                      placeholder="Search customers..."
                    />
                    {touched.customerId && errors.customerId && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{String(errors.customerId)}</p>
                    )}
                  </div>
                </div>

                <FieldArray name="lineItems">
                  {({ push, remove }) => (
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
                        {lineItems.map((item, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50 sm:grid-cols-12"
                          >
                            <div className="sm:col-span-4">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Product</label>
                              <div className="mt-1">
                                <LazyProductPicker
                                  value={item.productId || ''}
                                  onChange={async (productId) => {
                                    isSearchingRef.current[index] = false
                                    delete originalProductIdRef.current[index]
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
                                    }
                                  }}
                                  onSearchStart={() => {
                                    const currentItem = lineItems[index]
                                    if (currentItem?.productId) {
                                      originalProductIdRef.current[index] = currentItem.productId
                                    }
                                    isSearchingRef.current[index] = true
                                  }}
                                  onSearchEnd={() => {
                                    isSearchingRef.current[index] = false
                                    setTimeout(() => {
                                      delete originalProductIdRef.current[index]
                                    }, 100)
                                  }}
                                  onQuickCreate={() => {
                                    setSelectedProductIndex(index)
                                    setShowProductModal(true)
                                  }}
                                  placeholder="Search products..."
                                />
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
                        ))}
                      </div>
                    </div>
                  )}
                </FieldArray>

          {/* Professional Tax Summary Section - Zoho Style */}
          <div className="mt-6 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
            {/* Tax Configuration - Collapsible */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
                Tax Configuration
              </summary>
              <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                {/* State Selection */}
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

                {/* Tax Type Selection */}
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

                {/* Tax Rate Inputs */}
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

            {/* Professional Summary - Zoho Style */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="space-y-3">
                {/* Subtotal */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">
                    {subtotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                  </span>
                </div>

                {/* Tax Breakdown */}
                <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                  {values.type === 'gst' ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        GST ({values.gstRate}%)
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {taxCalculation.tax.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          CGST ({values.cgstRate}%)
                        </span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {taxCalculation.cgst?.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) ?? '$0.00'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          SGST ({values.sgstRate}%)
                        </span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {taxCalculation.sgst?.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) ?? '$0.00'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Before Discount */}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Total Amount</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">
                    {totalBeforeDiscount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                  </span>
                </div>

                {/* Order Discount (on Total Amount) */}
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

                {/* Round Figure Discount */}
                {values.roundFigure && roundDifference > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Round off discount</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -{roundDifference.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                    </span>
                  </div>
                )}

                {/* Total */}
                <div className="mb-4 flex items-center justify-between border-t-2 border-slate-300 pt-3 dark:border-slate-600">
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-50">Total</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    {totalAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                  </span>
                </div>

                {/* Round Figure and Payment in Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Round Figure */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="roundFigure"
                        checked={values.roundFigure}
                        onChange={(e) => setFieldValue('roundFigure', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-600 dark:bg-slate-800"
                      />
                      <label htmlFor="roundFigure" className="text-sm font-medium text-slate-700 dark:text-slate-300">
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

                  {/* Payment Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isPaid"
                        checked={values.isPaid}
                        onChange={(e) => {
                          const isPaid = e.target.checked
                          setFieldValue('isPaid', isPaid)
                          setFieldValue('paidAmount', isPaid ? totalAmount : values.paidAmount)
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-600 dark:bg-slate-800"
                      />
                      <label htmlFor="isPaid" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Paid
                      </label>
                    </div>

                    {!values.isPaid && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                          Paid Amount
                        </label>
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
              </form>
            )
          }}
        </Formik>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Recent sales orders</h2>
          <div className="flex flex-wrap items-center gap-2">
            <LazyCustomerPicker
              value={filters.customerId || ''}
              onChange={(customerId) => {
                setFilters((prev) => ({ ...prev, customerId: customerId || undefined }))
                setPage(1) // Reset to first page when filter changes
              }}
              type="customer"
              placeholder="Filter by customer..."
              className="w-full sm:w-48"
            />
            <div className="w-full sm:w-64">
              <Datepicker
                value={{
                  startDate: filters.startDate ? new Date(filters.startDate) : null,
                  endDate: filters.endDate ? new Date(filters.endDate) : null,
                }}
                onChange={(value) => {
                  setFilters((prev) => ({
                    ...prev,
                    startDate: value?.startDate ? new Date(value.startDate).toISOString().split('T')[0] : undefined,
                    endDate: value?.endDate ? new Date(value.endDate).toISOString().split('T')[0] : undefined,
                  }))
                  setPage(1)
                }}
                useRange={true}
                displayFormat="MMM DD, YYYY"
                inputClassName="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                containerClassName="relative"
                placeholder="Select date range"
                showShortcuts={true}
                primaryColor="blue"
              />
            </div>
            {(filters.customerId || filters.startDate || filters.endDate) && (
              <button
                onClick={() => {
                  setFilters({})
                  setPage(1)
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead>
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Order ID</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Customer</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Date</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Status</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Items</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">Total</th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
              {isPending ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    Loading sales orders…
                  </td>
                </tr>
              ) : orders.length ? (
                orders.map((order) => (
                  <SalesOrderRow key={order.id} order={order} />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No sales orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSize={PAGE_SIZE}
              total={total}
            />
          </div>
        )}
      </section>

      {latestOrder && latestItems && latestItems.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="text-lg font-semibold">Printable receipt preview</h2>
          {/* <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Connect a receipt printer in Electron to print this layout directly. Customize the template under
            `components/ReceiptPreview.tsx`.
          </p> */}
          <div className="mt-4">
            <ReceiptPreview order={latestOrder} items={latestItems} />
          </div>
        </section>
      )}

      <CustomerQuickCreateModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onCustomerCreated={(customer) => {
          if (formikRef.current) {
            formikRef.current.setFieldValue('customerId', customer.id)
          }
          setShowCustomerModal(false)
        }}
      />
      <ProductQuickCreateModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false)
          setSelectedProductIndex(null)
        }}
        onProductCreated={(product) => {
          if (formikRef.current && selectedProductIndex !== null) {
            const unitPrice = product.salePrice ?? product.price ?? 0
            formikRef.current.setFieldValue(`lineItems.${selectedProductIndex}.productId`, product.id)
            formikRef.current.setFieldValue(`lineItems.${selectedProductIndex}.unitPrice`, unitPrice)
            formikRef.current.setFieldValue(`lineItems.${selectedProductIndex}.discount`, 0)
          }
          setShowProductModal(false)
          setSelectedProductIndex(null)
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
    </div>
  )
}
