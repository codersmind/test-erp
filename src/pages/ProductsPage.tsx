import { type FormEvent, useMemo, useState } from 'react'

import { useAdjustProductStock, useCreateProduct, useProducts } from '../hooks/useProducts'
import { useBarcodeScanner } from '../sensors/useBarcodeScanner'
import { ProductEditModal } from '../components/ProductEditModal'
import type { Product } from '../db/schema'

export const ProductsPage = () => {
  const { data: products, isPending } = useProducts()
  const createProduct = useCreateProduct()
  const adjustStock = useAdjustProductStock()
  const [form, setForm] = useState({
    title: '',
    sku: '',
    barcode: '',
    price: '',
    cost: '',
    description: '',
    reorderLevel: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useBarcodeScanner((code) => {
    setForm((prev) => ({ ...prev, barcode: code }))
  })

  const filteredProducts = useMemo(() => {
    if (!products) return []
    if (!searchQuery.trim()) return products
    const query = searchQuery.toLowerCase()
    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query),
    )
  }, [products, searchQuery])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim()) return

    await createProduct.mutateAsync({
      title: form.title.trim(),
      sku: form.sku.trim() || `SKU-${Date.now()}`,
      barcode: form.barcode.trim() || undefined,
      price: Number.parseFloat(form.price) || 0,
      cost: Number.parseFloat(form.cost) || 0,
      description: form.description.trim() || undefined,
      reorderLevel: form.reorderLevel ? Number.parseInt(form.reorderLevel) : undefined,
    })

    setForm({
      title: '',
      sku: '',
      barcode: '',
      price: '',
      cost: '',
      description: '',
      reorderLevel: '',
    })
  }

  const handleStockAdjust = async (id: string, delta: number) => {
    if (!delta) return
    await adjustStock.mutateAsync({ id, quantity: delta })
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setShowEditModal(true)
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold">Add product</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="sm:col-span-2">
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Title</span>
              <input
                required
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="New release hardcover"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">SKU</span>
              <input
                value={form.sku}
                onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="SKU-001"
              />
            </label>
            <label>
              <span className="flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
                Barcode
                <span className="text-xs text-slate-400">Scan with reader</span>
              </span>
              <input
                value={form.barcode}
                onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="9780000000"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Price</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="0.00"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Cost</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={(event) => setForm((prev) => ({ ...prev, cost: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="0.00"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Reorder Level</span>
              <input
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(event) => setForm((prev) => ({ ...prev, reorderLevel: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="0"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="Product description"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createProduct.isPending}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
            >
              {createProduct.isPending ? 'Saving…' : 'Save product'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Inventory</h2>
          <div className="flex-1 sm:max-w-xs">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search products..."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            />
          </div>
        </div>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Track stock levels and capture barcode data. Hook up a USB scanner in Electron for native integrations.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 dark:bg-slate-800/60">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Title</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">SKU</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Barcode</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Price</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Cost</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Stock</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isPending ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    Loading inventory…
                  </td>
                </tr>
              ) : filteredProducts.length ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-3">
                      <p className="font-semibold">{product.title}</p>
                      <p className="text-xs text-slate-500">{product.description ?? '—'}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{product.sku}</td>
                    <td className="px-3 py-3 text-slate-500">{product.barcode ?? '—'}</td>
                    <td className="px-3 py-3 text-right">
                      {product.price.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {product.cost.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={
                          product.reorderLevel && product.stockOnHand <= product.reorderLevel
                            ? 'font-semibold text-red-600 dark:text-red-400'
                            : ''
                        }
                      >
                        {product.stockOnHand}
                      </span>
                      {product.reorderLevel && product.stockOnHand <= product.reorderLevel && (
                        <span className="ml-1 text-xs text-red-500">⚠ Low</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          className="rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStockAdjust(product.id, 1)}
                          className="rounded-full border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStockAdjust(product.id, -1)}
                          className="rounded-full border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                        >
                          −1
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    {searchQuery ? 'No products found.' : 'No products yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ProductEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingProduct(null)
        }}
        product={editingProduct}
      />
    </div>
  )
}
