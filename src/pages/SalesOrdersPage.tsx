import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { useCreateSalesOrder } from '../hooks/useSalesOrders'
import { useSalesOrdersPaginated } from '../hooks/useSalesOrdersPaginated'
import { db } from '../db/database'
import { ReceiptPreview } from '../components/ReceiptPreview'
import { CustomerQuickCreateModal } from '../components/CustomerQuickCreateModal'
import { ProductQuickCreateModal } from '../components/ProductQuickCreateModal'
import { LazyProductPicker } from '../components/LazyProductPicker'
import { LazyCustomerPicker } from '../components/LazyCustomerPicker'
import { Pagination } from '../components/Pagination'
import { getTaxSettings, calculateTax, COMMON_GST_RATES, INDIAN_STATES, type TaxSettings } from '../utils/taxSettings'
import { getProduct, getCustomer } from '../db/localDataService'
import type { Customer, Product } from '../db/schema'

interface LineItem {
  productId: string
  quantity: number
  unitPrice: number
  discount: number
}

const PAGE_SIZE = 20

export const SalesOrdersPage = () => {
  const [page, setPage] = useState(1)
  const { data: paginatedData, isPending } = useSalesOrdersPaginated(page, PAGE_SIZE)
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
    if (!productId) {
      setSelectedProductIndex(index)
      setShowProductModal(true)
      return
    }
    const product = await getProduct(productId)
    if (product) {
      // Use salePrice if available, otherwise fallback to price
      const unitPrice = product.salePrice ?? product.price ?? 0
      updateLineItem(index, { productId, unitPrice })
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

  const removeLineItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }))
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
                        currency: 'USD',
                      })}
                    </div>
                  </div>
                  <div className="flex items-end sm:col-span-1">
                    {form.lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="w-full rounded-md border border-red-300 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
              <span className="font-medium">{subtotal.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
            </div>

            {/* Order-level Discount */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">Order Discount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.orderDiscount || ''}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, orderDiscount: Number.parseFloat(event.target.value) || 0 }))
                  }
                  className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  placeholder="0.00"
                />
                <select
                  value={form.orderDiscountType}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, orderDiscountType: event.target.value as 'amount' | 'percentage' }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                >
                  <option value="amount">Amount</option>
                  <option value="percentage">%</option>
                </select>
              </div>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                -{orderDiscountAmount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
              </span>
            </div>
            {orderDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Subtotal after discount</span>
                <span className="font-medium">{subtotalAfterDiscount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
              </div>
            )}

            {/* State Selection */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">State</label>
              <select
                value={form.selectedState || ''}
                onChange={(e) => {
                  const selectedState = e.target.value || undefined
                  setForm((prev) => {
                    const newForm = { ...prev, selectedState }
                    // Load state-specific tax rates if available
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
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              >
                <option value="">Default (No state-specific rate)</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {form.selectedState && form.stateRates?.[form.selectedState] && (
                <span className="text-xs text-blue-600 dark:text-blue-400">State rate applied</span>
              )}
            </div>

            {/* Tax Type Selection */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Tax Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const totalRate = form.type === 'cgst_sgst' ? form.cgstRate + form.sgstRate : form.gstRate
                    setForm((prev) => ({ ...prev, type: 'gst', gstRate: totalRate }))
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600 dark:text-slate-400">GST Rate (%)</label>
                  <select
                    value={form.gstRate}
                    onChange={(e) => setForm((prev) => ({ ...prev, gstRate: Number.parseFloat(e.target.value) }))}
                    className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
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
                    className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    placeholder="Custom"
                  />
                </div>
                <span className="text-sm font-medium">
                  GST: {taxCalculation.tax.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-slate-400">CGST Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.01"
                      value={form.cgstRate}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, cgstRate: Number.parseFloat(event.target.value) || 0 }))
                      }
                      className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>
                  <span className="text-sm font-medium">
                    CGST: {taxCalculation.cgst?.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) ?? '$0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-slate-400">SGST Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.01"
                      value={form.sgstRate}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, sgstRate: Number.parseFloat(event.target.value) || 0 }))
                      }
                      className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>
                  <span className="text-sm font-medium">
                    SGST: {taxCalculation.sgst?.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) ?? '$0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-end text-sm">
                  <span className="font-medium">
                    Total Tax: {taxCalculation.tax.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">Total</span>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-50">
                {totalAmount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
              </span>
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
        <h2 className="text-lg font-semibold">Recent sales orders</h2>
        <ul className="mt-4 divide-y divide-slate-200 text-sm dark:divide-slate-800">
          {isPending ? (
            <li className="py-6 text-center text-slate-500">Loading orders…</li>
          ) : orders.length ? (
            orders.map((order) => (
              <li key={order.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">
                    Order #{order.id.slice(-6)} · {order.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    {order.total.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} · Tax:{' '}
                    {order.tax.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(order.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </li>
            ))
          ) : (
            <li className="py-6 text-center text-slate-500">No sales orders yet.</li>
          )}
        </ul>
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
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Connect a receipt printer in Electron to print this layout directly. Customize the template under
            `components/ReceiptPreview.tsx`.
          </p>
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
