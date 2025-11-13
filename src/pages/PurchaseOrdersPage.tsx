import { type FormEvent, useMemo, useState } from 'react'

import { useCustomersByType } from '../hooks/useCustomersByType'
import { useProducts } from '../hooks/useProducts'
import { useCreatePurchaseOrder, usePurchaseOrders } from '../hooks/usePurchaseOrders'
import { CustomerQuickCreateModal } from '../components/CustomerQuickCreateModal'
import { ProductQuickCreateModal } from '../components/ProductQuickCreateModal'
import type { Customer, Product } from '../db/schema'

interface LineItem {
  productId: string
  quantity: number
  unitCost: number
}

export const PurchaseOrdersPage = () => {
  const { data: suppliers } = useCustomersByType('supplier')
  const { data: products } = useProducts()
  const { data: orders, isPending } = usePurchaseOrders()
  const [form, setForm] = useState({ supplierId: '', lineItems: [{ productId: '', quantity: 1, unitCost: 0 }] })
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null)
  const createPurchaseOrderMutation = useCreatePurchaseOrder()

  const supplierOptions = useMemo(
    () =>
      (suppliers ?? []).map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
    [suppliers],
  )

  const productOptions = useMemo(
    () =>
      (products ?? []).map((product) => ({
        value: product.id,
        label: `${product.title} - ${product.cost.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}`,
        product,
      })),
    [products],
  )

  const updateLineItem = (index: number, updates: Partial<LineItem>) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    }))
  }

  const addLineItem = () => {
    setForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { productId: '', quantity: 1, unitCost: 0 }],
    }))
  }

  const removeLineItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }))
  }

  const handleProductSelect = (index: number, productId: string) => {
    if (!productId) {
      setSelectedProductIndex(index)
      setShowProductModal(true)
      return
    }
    const product = products?.find((p) => p.id === productId)
    if (product) {
      updateLineItem(index, { productId, unitCost: product.cost })
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.supplierId) {
      setShowSupplierModal(true)
      return
    }

    const supplier = suppliers?.find((s) => s.id === form.supplierId)
    if (!supplier) return

    const validItems = form.lineItems.filter((item) => item.productId && item.quantity > 0 && item.unitCost > 0)
    if (validItems.length === 0) return

    await createPurchaseOrderMutation.mutateAsync({
      supplierName: supplier.name,
      items: validItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
      })),
      notes: 'Captured offline',
    })
    setForm({ supplierId: '', lineItems: [{ productId: '', quantity: 1, unitCost: 0 }] })
  }

  const handleSupplierCreated = (supplier: Customer) => {
    setForm((prev) => ({ ...prev, supplierId: supplier.id }))
  }

  const handleProductCreated = (product: Product) => {
    if (selectedProductIndex !== null) {
      updateLineItem(selectedProductIndex, { productId: product.id, unitCost: product.cost })
      setSelectedProductIndex(null)
    }
  }

  const totalAmount = useMemo(
    () =>
      form.lineItems.reduce((sum, item) => {
        if (item.productId && item.quantity > 0 && item.unitCost > 0) {
          return sum + item.quantity * item.unitCost
        }
        return sum
      }, 0),
    [form.lineItems],
  )

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold">Record purchase</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Supplier</label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <select
                value={form.supplierId}
                onChange={(event) => setForm((prev) => ({ ...prev, supplierId: event.target.value }))}
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              >
                <option value="">Select supplier</option>
                {supplierOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowSupplierModal(true)}
                className="rounded-md border border-blue-600 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 sm:px-4"
              >
                + New
              </button>
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
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Product</label>
                    <div className="mt-1 flex gap-2">
                      <select
                        value={item.productId}
                        onChange={(event) => handleProductSelect(index, event.target.value)}
                        className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                      >
                        <option value="">Select product</option>
                        {productOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductIndex(index)
                          setShowProductModal(true)
                        }}
                        className="rounded-md border border-blue-600 bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400"
                      >
                        + New
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Quantity</label>
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
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Cost</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitCost || ''}
                      onChange={(event) =>
                        updateLineItem(index, { unitCost: Number.parseFloat(event.target.value) || 0 })
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                      placeholder="0.00"
                    />
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

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-right sm:text-left">
              <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-50">
                {totalAmount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
              </p>
            </div>
            <button
              type="submit"
              disabled={createPurchaseOrderMutation.isPending || !form.supplierId || totalAmount === 0}
              className="w-full rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
            >
              {createPurchaseOrderMutation.isPending ? 'Saving…' : 'Save purchase'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold">Recent purchase orders</h2>
        <ul className="mt-4 divide-y divide-slate-200 text-sm dark:divide-slate-800">
          {isPending ? (
            <li className="py-6 text-center text-slate-500">Loading purchases…</li>
          ) : orders?.length ? (
            orders.map((order) => (
              <li key={order.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">
                    {order.supplierName} · {order.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    Total: {order.total.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(order.updatedAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </li>
            ))
          ) : (
            <li className="py-6 text-center text-slate-500">No purchase orders yet.</li>
          )}
        </ul>
      </section>

      <CustomerQuickCreateModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onCustomerCreated={handleSupplierCreated}
        type="supplier"
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
