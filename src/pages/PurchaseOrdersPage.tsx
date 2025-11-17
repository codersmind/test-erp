import { type FormEvent, useEffect, useState } from 'react'

import { useCreatePurchaseOrder } from '../hooks/usePurchaseOrders'
import { usePurchaseOrdersPaginated } from '../hooks/usePurchaseOrdersPaginated'
import { CustomerQuickCreateModal } from '../components/CustomerQuickCreateModal'
import { ProductQuickCreateModal } from '../components/ProductQuickCreateModal'
import { LazyProductPicker } from '../components/LazyProductPicker'
import { LazyCustomerPicker } from '../components/LazyCustomerPicker'
import { Pagination } from '../components/Pagination'
import { InvoicePrint } from '../components/InvoicePrint'
import Datepicker from 'react-tailwindcss-datepicker'
import { db } from '../db/database'
import { getProduct, getCustomer } from '../db/localDataService'
import { getPurchaseOrderSettings } from '../utils/purchaseOrderSettings'
import type { Customer, Product, PurchaseOrder, PurchaseOrderItem } from '../db/schema'

interface LineItem {
  productId: string
  quantity: number
  unitCost: number
}

const PAGE_SIZE = 20

// Component to render a purchase order row with items
const PurchaseOrderRow = ({ order }: { order: PurchaseOrder }) => {
  const [items, setItems] = useState<PurchaseOrderItem[]>([])
  const [showPrint, setShowPrint] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      const orderItems = await db.purchaseOrderItems.where('orderId').equals(order.id).toArray()
      setItems(orderItems)
    }
    loadData()
  }, [order.id])

  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900 dark:text-slate-50">
          {order.id.slice(0, 8)}
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
          {order.supplierName}
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
            <InvoicePrint order={order} items={items} supplierName={order.supplierName} type="purchase" />
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

export const PurchaseOrdersPage = () => {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{ supplierName?: string; startDate?: string; endDate?: string }>({})
  const { data: paginatedData, isPending } = usePurchaseOrdersPaginated(page, PAGE_SIZE, filters)
  const [defaultAddToInventory, setDefaultAddToInventory] = useState(true)
  const [form, setForm] = useState({
    supplierId: '',
    lineItems: [{ productId: '', quantity: 1, unitCost: 0 }],
    addToInventory: true,
  })
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null)
  const createPurchaseOrderMutation = useCreatePurchaseOrder()

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getPurchaseOrderSettings()
      setDefaultAddToInventory(settings.defaultAddToInventory)
      setForm((prev) => ({ ...prev, addToInventory: settings.defaultAddToInventory }))
    }
    loadSettings()
  }, [])

  const orders = paginatedData?.items ?? []
  const total = paginatedData?.total ?? 0
  const totalPages = paginatedData?.totalPages ?? 0

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
    setForm((prev) => {
      const updatedItems = prev.lineItems.filter((_, i) => i !== index)
      // If no items remain, add one empty item
      if (updatedItems.length === 0) {
        return {
          ...prev,
          lineItems: [{ productId: '', quantity: 1, unitCost: 0 }],
        }
      }
      return {
        ...prev,
        lineItems: updatedItems,
      }
    })
  }

  const handleProductSelect = async (index: number, productId: string) => {
    if (!productId) {
      setSelectedProductIndex(index)
      setShowProductModal(true)
      return
    }
    const product = await getProduct(productId)
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
    if (form.lineItems.some((item) => !item.productId || item.quantity <= 0 || item.unitCost <= 0)) {
      alert('Please ensure all line items have a selected product, valid quantity, and unit cost.')
      return
    }

    const supplier = await getCustomer(form.supplierId)
    if (!supplier) {
      alert('Selected supplier not found.')
      return
    }

    await createPurchaseOrderMutation.mutateAsync({
      supplierName: supplier.name,
      items: form.lineItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        lineTotal: item.quantity * item.unitCost,
      })),
      notes: 'Captured offline',
      addToInventory: form.addToInventory,
    })
    setForm({ supplierId: '', lineItems: [{ productId: '', quantity: 1, unitCost: 0 }], addToInventory: defaultAddToInventory })
  }

  const handleSupplierCreated = (supplier: Customer) => {
    setForm((prev) => ({ ...prev, supplierId: supplier.id }))
    setShowSupplierModal(false)
  }

  const handleProductCreated = (product: Product) => {
    if (selectedProductIndex !== null) {
      updateLineItem(selectedProductIndex, { productId: product.id, unitCost: product.cost })
      setSelectedProductIndex(null)
    }
  }

  const totalAmount = form.lineItems.reduce((sum, item) => {
    if (item.productId && item.quantity > 0 && item.unitCost > 0) {
      return sum + item.quantity * item.unitCost
    }
    return sum
  }, 0)

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold">Record purchase</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Supplier</label>
            <div className="mt-1">
              <LazyCustomerPicker
                value={form.supplierId}
                onChange={(supplierId) => setForm((prev) => ({ ...prev, supplierId }))}
                onQuickCreate={() => setShowSupplierModal(true)}
                type="supplier"
                placeholder="Search suppliers..."
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
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => updateLineItem(index, { quantity: Number.parseInt(event.target.value) || 1 })}
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
                      onChange={(event) => updateLineItem(index, { unitCost: Number.parseFloat(event.target.value) || 0 })}
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

          <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="addToInventory"
                checked={form.addToInventory}
                onChange={(e) => setForm((prev) => ({ ...prev, addToInventory: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
              />
              <label htmlFor="addToInventory" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Add items to product inventory
              </label>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {form.addToInventory
                ? 'Items will be added to product stock when order is created.'
                : 'Items will be recorded in purchase order only, without updating product stock.'}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Total: {totalAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}</p>
              <button
                type="submit"
                disabled={createPurchaseOrderMutation.isPending || !form.supplierId || totalAmount === 0}
                className="w-full rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
              >
                {createPurchaseOrderMutation.isPending ? 'Saving…' : 'Save purchase'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Recent purchase orders</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={filters.supplierName || ''}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, supplierName: e.target.value || undefined }))
                setPage(1) // Reset to first page when filter changes
              }}
              placeholder="Filter by supplier..."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 sm:w-48"
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
            {(filters.supplierName || filters.startDate || filters.endDate) && (
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
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Supplier</th>
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
                    Loading purchase orders…
                  </td>
                </tr>
              ) : orders.length ? (
                orders.map((order) => (
                  <PurchaseOrderRow key={order.id} order={order} />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No purchase orders yet.
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
