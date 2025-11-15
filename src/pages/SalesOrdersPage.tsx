import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { useCreateSalesOrder } from '../hooks/useSalesOrders'
import { useSalesOrdersPaginated } from '../hooks/useSalesOrdersPaginated'
import { db } from '../db/database'
import { ReceiptPreview } from '../components/ReceiptPreview'
import { InvoicePrint } from '../components/InvoicePrint'
import type { SalesOrder, SalesOrderItem } from '../db/schema'
import { CustomerQuickCreateModal } from '../components/CustomerQuickCreateModal'
import { ProductQuickCreateModal } from '../components/ProductQuickCreateModal'
import { LazyProductPicker } from '../components/LazyProductPicker'
import { LazyCustomerPicker } from '../components/LazyCustomerPicker'
import { Pagination } from '../components/Pagination'
import Datepicker from 'react-tailwindcss-datepicker'
import { getTaxSettings, calculateTax, COMMON_GST_RATES, INDIAN_STATES, type TaxSettings } from '../utils/taxSettings'
import { getProduct, getCustomer } from '../db/localDataService'
import { useBarcodeScanner } from '../sensors/useBarcodeScanner'
import type { Customer, Product } from '../db/schema'

interface LineItem {
  productId: string
  quantity: number
  unitPrice: number
  discount: number
}

const PAGE_SIZE = 20

// Component to render a sales order row with items
const SalesOrderRow = ({ order }: { order: SalesOrder }) => {
  const [items, setItems] = useState<SalesOrderItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [showPrint, setShowPrint] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      const orderItems = await db.salesOrderItems.where('orderId').equals(order.id).toArray()
      setItems(orderItems)
      const cust = await getCustomer(order.customerId)
      setCustomer(cust || null)
    }
    loadData()
  }, [order.id, order.customerId])

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
          {items.length} item{items.length !== 1 ? 's' : ''}
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-slate-500 dark:text-slate-400">
          {order.total.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
        </td>
        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
          <button
            type="button"
            onClick={() => setShowPrint(true)}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Print
          </button>
        </td>
      </tr>
      {showPrint && items.length > 0 && (
        <tr>
          <td colSpan={6} className="px-3 py-4">
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
  const [form, setForm] = useState<TaxSettings & { customerId: string; selectedState?: string; orderDiscount: number; orderDiscountType: 'amount' | 'percentage'; lineItems: LineItem[] }>({
    customerId: '',
    lineItems: [{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
    type: 'gst',
    gstRate: 5,
    cgstRate: 2.5,
    sgstRate: 2.5,
    defaultState: undefined,
    stateRates: {},
    selectedState: undefined,
    orderDiscount: 0,
    orderDiscountType: 'amount',
  })
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null)
  const isSearchingRef = useRef<Record<number, boolean>>({})
  const originalProductIdRef = useRef<Record<number, string>>({})
  const createSalesOrderMutation = useCreateSalesOrder()

  // Load tax settings and customer state on mount
  useEffect(() => {
    getTaxSettings().then((settings) => {
      setForm((prev) => ({ ...prev, ...settings, selectedState: settings.defaultState }))
    })
  }, [])

  // Load customer state when customer is selected
  useEffect(() => {
    if (form.customerId) {
      getCustomer(form.customerId).then((customer) => {
        if (customer?.state) {
          setForm((prev) => ({ ...prev, selectedState: customer.state }))
          // Load state-specific tax rates if available
          getTaxSettings().then((settings) => {
            if (settings.stateRates[customer.state!]) {
              const stateConfig = settings.stateRates[customer.state!]
              setForm((prev) => ({
                ...prev,
                type: stateConfig.type,
                gstRate: stateConfig.gstRate,
                cgstRate: stateConfig.cgstRate,
                sgstRate: stateConfig.sgstRate,
              }))
            }
          })
        }
      })
    }
  }, [form.customerId])

  const orders = paginatedData?.items ?? []
  const total = paginatedData?.total ?? 0
  const totalPages = paginatedData?.totalPages ?? 0
  const latestOrder = orders?.[0]
  const latestItems = useLiveQuery(
    () => (latestOrder ? db.salesOrderItems.where('orderId').equals(latestOrder.id).toArray() : []),
    [latestOrder?.id],
    [],
  )

  const handleProductSelect = async (index: number, productId: string) => {
    // Clear searching flag and original product ref when product is selected
    isSearchingRef.current[index] = false
    delete originalProductIdRef.current[index]
    
    // If productId is empty, clear the line item
    if (!productId) {
      updateLineItem(index, { productId: '', unitPrice: 0, discount: 0 })
      return
    }
    
    // Load and set the product
    const product = await getProduct(productId)
    if (product) {
      // Use salePrice if available, otherwise fallback to price
      const unitPrice = product.salePrice ?? product.price ?? 0
      updateLineItem(index, { productId, unitPrice, discount: 0 })
    }
  }

  const updateLineItem = (index: number, updates: Partial<LineItem>) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    }))
  }

  const addLineItem = () => {
    setForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
    }))
  }

  // Handle barcode scanning to add products
  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return

    // Find product by barcode
    const product = await db.products
      .filter((p) => p.barcode?.toLowerCase() === barcode.toLowerCase() && !p.isArchived)
      .first()

    if (!product) {
      // Product not found - could show a notification or open create modal
      console.warn(`Product with barcode "${barcode}" not found`)
      return
    }

    // Check if product already exists in line items
    const existingItemIndex = form.lineItems.findIndex((item) => item.productId === product.id)

    if (existingItemIndex >= 0) {
      // Product already in cart - increment quantity
      setForm((prev) => {
        const updatedItems = prev.lineItems.map((item, i) =>
          i === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item,
        )
        // Ensure there's always an empty item for next scan
        const hasEmptyItem = updatedItems.some((item) => !item.productId)
        return {
          ...prev,
          lineItems: hasEmptyItem
            ? updatedItems
            : [...updatedItems, { productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
        }
      })
    } else {
      // Add new line item with the product
      const unitPrice = product.salePrice ?? product.price ?? 0
      const newItem: LineItem = {
        productId: product.id,
        quantity: 1,
        unitPrice,
        discount: 0,
      }

      setForm((prev) => {
        // Find the first empty line item or add a new one
        const emptyItemIndex = prev.lineItems.findIndex((item) => !item.productId)
        let updatedItems: LineItem[]

        if (emptyItemIndex >= 0) {
          // Replace empty item
          updatedItems = prev.lineItems.map((item, i) => (i === emptyItemIndex ? newItem : item))
        } else {
          // Add new line item
          updatedItems = [...prev.lineItems, newItem]
        }

        // Always ensure there's an empty item at the end for next scan
        const hasEmptyItem = updatedItems.some((item) => !item.productId)
        return {
          ...prev,
          lineItems: hasEmptyItem
            ? updatedItems
            : [...updatedItems, { productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
        }
      })
    }
  }

  // Set up barcode scanner
  useBarcodeScanner(handleBarcodeScan)

  const removeLineItem = (index: number) => {
    setForm((prev) => {
      // Remove the item at the specified index
      const updatedItems = prev.lineItems.filter((_, i) => i !== index)
      
      // If no items remain, add one empty item
      if (updatedItems.length === 0) {
        return {
          ...prev,
          lineItems: [{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
        }
      }
      
      // Otherwise, just remove the item (don't force an empty item)
      return {
        ...prev,
        lineItems: updatedItems,
      }
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.customerId) {
      setShowCustomerModal(true)
      return
    }

    const validItems = form.lineItems.filter((item) => item.productId && item.quantity > 0 && item.unitPrice > 0)
    if (validItems.length === 0) return

    await createSalesOrderMutation.mutateAsync({
      customerId: form.customerId,
      items: validItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        lineTotal: item.quantity * item.unitPrice - item.discount,
      })),
      taxSettings: {
        type: form.type,
        gstRate: form.gstRate,
        cgstRate: form.cgstRate,
        sgstRate: form.sgstRate,
        defaultState: form.defaultState,
        stateRates: form.stateRates,
      },
      discount: form.orderDiscount,
      discountType: form.orderDiscountType,
      notes: 'Captured offline',
    })
    const defaultTax = await getTaxSettings()
    setForm({
      customerId: '',
      lineItems: [{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
      orderDiscount: 0,
      orderDiscountType: 'amount',
      ...defaultTax,
    })
  }

  const handleCustomerCreated = (customer: Customer) => {
    setForm((prev) => ({ ...prev, customerId: customer.id }))
  }

  const handleProductCreated = (product: Product) => {
    if (selectedProductIndex !== null) {
      const unitPrice = product.salePrice ?? product.price ?? 0
      updateLineItem(selectedProductIndex, { productId: product.id, unitPrice })
      setSelectedProductIndex(null)
    }
  }

  const subtotal = useMemo(
    () =>
      form.lineItems.reduce((sum, item) => {
        if (item.productId && item.quantity > 0 && item.unitPrice > 0) {
          return sum + item.quantity * item.unitPrice - item.discount
        }
        return sum
      }, 0),
    [form.lineItems],
  )

  const orderDiscountAmount = useMemo(() => {
    if (form.orderDiscount <= 0) return 0
    if (form.orderDiscountType === 'percentage') {
      return subtotal * (form.orderDiscount / 100)
    }
    return form.orderDiscount
  }, [subtotal, form.orderDiscount, form.orderDiscountType])

  const subtotalAfterDiscount = Math.max(0, subtotal - orderDiscountAmount)

  const taxCalculation = useMemo(() => {
    return calculateTax(subtotalAfterDiscount, form, form.selectedState)
  }, [subtotalAfterDiscount, form, form.selectedState])
  const totalAmount = subtotalAfterDiscount + taxCalculation.tax

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold">Record sale</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Customer</label>
            <div className="mt-1">
              <LazyCustomerPicker
                value={form.customerId}
                onChange={(customerId) => setForm((prev) => ({ ...prev, customerId }))}
                onQuickCreate={() => setShowCustomerModal(true)}
                type="customer"
                placeholder="Search customers..."
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Items</label>
              <button
                type="button"
                onClick={addLineItem}
                className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                + Add item
              </button>
            </div>
            <div className="space-y-3">
              {form.lineItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50 sm:grid-cols-12"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Product</label>
                    <div className="mt-1">
                      <LazyProductPicker
                        value={item.productId}
                        onChange={(productId) => handleProductSelect(index, productId)}
                        onSearchStart={() => {
                          // Store the original productId before clearing it
                          // This helps us know if user was changing an existing product
                          const currentItem = form.lineItems[index]
                          if (currentItem?.productId) {
                            originalProductIdRef.current[index] = currentItem.productId
                          }
                          // Update ref immediately (synchronously) for instant check
                          // This happens BEFORE onChange('') is called, preventing modal from opening
                          isSearchingRef.current[index] = true
                        }}
                        onSearchEnd={() => {
                          isSearchingRef.current[index] = false
                          // Clear original product ref after search ends
                          // Keep it during search in case user cancels
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
                        updateLineItem(index, { quantity: Number.parseInt(event.target.value) || 1 })
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
                        updateLineItem(index, { unitPrice: Number.parseFloat(event.target.value) || 0 })
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
                        updateLineItem(index, { discount: Number.parseFloat(event.target.value) || 0 })
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Total</label>
                    <div className="mt-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800">
                      {(item.quantity * item.unitPrice - item.discount).toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'INR',
                      })}
                    </div>
                  </div>
                  <div className="flex items-end sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
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
                    value={form.selectedState || ''}
                    onChange={(e) => {
                      const selectedState = e.target.value || undefined
                      setForm((prev) => {
                        const newForm = { ...prev, selectedState }
                        if (selectedState && prev.stateRates?.[selectedState]) {
                          const stateConfig = prev.stateRates[selectedState]
                          return {
                            ...newForm,
                            type: stateConfig.type,
                            gstRate: stateConfig.gstRate,
                            cgstRate: stateConfig.cgstRate,
                            sgstRate: stateConfig.sgstRate,
                          }
                        }
                        return newForm
                      })
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
                        const totalRate = form.type === 'cgst_sgst' ? form.cgstRate + form.sgstRate : form.gstRate
                        setForm((prev) => ({ ...prev, type: 'gst', gstRate: totalRate }))
                      }}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                        form.type === 'gst'
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      GST
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const totalRate = form.type === 'gst' ? form.gstRate : form.cgstRate + form.sgstRate
                        const halfRate = totalRate / 2
                        setForm((prev) => ({
                          ...prev,
                          type: 'cgst_sgst',
                          cgstRate: halfRate,
                          sgstRate: halfRate,
                        }))
                      }}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                        form.type === 'cgst_sgst'
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      CGST + SGST
                    </button>
                  </div>
                </div>

                {/* Tax Rate Inputs */}
                {form.type === 'gst' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">GST Rate (%)</label>
                    <div className="flex gap-2">
                      <select
                        value={form.gstRate}
                        onChange={(e) => setForm((prev) => ({ ...prev, gstRate: Number.parseFloat(e.target.value) }))}
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
                        value={form.gstRate}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, gstRate: Number.parseFloat(event.target.value) || 0 }))
                        }
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
                        value={form.cgstRate}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, cgstRate: Number.parseFloat(event.target.value) || 0 }))
                        }
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
                        value={form.sgstRate}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, sgstRate: Number.parseFloat(event.target.value) || 0 }))
                        }
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

                {/* Order Discount */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-slate-400">Discount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.orderDiscount || ''}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, orderDiscount: Number.parseFloat(event.target.value) || 0 }))
                      }
                      className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                      placeholder="0.00"
                    />
                    <select
                      value={form.orderDiscountType}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, orderDiscountType: event.target.value as 'amount' | 'percentage' }))
                      }
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

                {/* Subtotal After Discount */}
                {orderDiscountAmount > 0 && (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">Subtotal after discount</span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {subtotalAfterDiscount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                    </span>
                  </div>
                )}

                {/* Tax Breakdown */}
                <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                  {form.type === 'gst' ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        GST ({form.gstRate}%)
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {taxCalculation.tax.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          CGST ({form.cgstRate}%)
                        </span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {taxCalculation.cgst?.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) ?? '$0.00'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          SGST ({form.sgstRate}%)
                        </span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {taxCalculation.sgst?.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) ?? '$0.00'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between border-t-2 border-slate-300 pt-3 dark:border-slate-600">
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-50">Total</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    {totalAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createSalesOrderMutation.isPending || !form.customerId || totalAmount === 0}
              className="w-full rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
            >
              {createSalesOrderMutation.isPending ? 'Saving…' : 'Save order'}
            </button>
          </div>
        </form>
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
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
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
        onCustomerCreated={handleCustomerCreated}
      />
      <ProductQuickCreateModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false)
          setSelectedProductIndex(null)
        }}
        onProductCreated={handleProductCreated}
      />
    </div>
  )
}
