import { type FormEvent, useState } from 'react'

import { useAdjustProductStock, useCreateProduct, useProducts } from '../hooks/useProducts'
import { useBarcodeScanner } from '../sensors/useBarcodeScanner'

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
  })

  useBarcodeScanner((code) => {
    setForm((prev) => ({ ...prev, barcode: code }))
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim()) return

    await createProduct.mutateAsync({
      title: form.title.trim(),
      sku: form.sku.trim() || `SKU-${Date.now()}`,
      barcode: form.barcode.trim() || undefined,
      price: Number.parseFloat(form.price) || 0,
      cost: Number.parseFloat(form.cost) || 0,
      description: undefined,
      reorderLevel: undefined,
    })

    setForm({
      title: '',
      sku: '',
      barcode: '',
      price: '',
      cost: '',
    })
  }

  const handleStockAdjust = async (id: string, delta: number) => {
    if (!delta) return
    await adjustStock.mutateAsync({ id, quantity: delta })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Add product</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="flex items-end justify-end">
            <button
              type="submit"
              disabled={createProduct.isPending}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {createProduct.isPending ? 'Saving…' : 'Save product'}
            </button>
          </div>
        </form>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Inventory</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Track stock levels and capture barcode data. Hook up a USB scanner in Electron for native integrations.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 dark:bg-slate-800/60">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Title</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">SKU</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Barcode</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Price</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Stock</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isPending ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    Loading inventory…
                  </td>
                </tr>
              ) : products?.length ? (
                products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-3 py-3">
                      <p className="font-semibold">{product.title}</p>
                      <p className="text-xs text-slate-500">{product.description ?? '—'}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{product.sku}</td>
                    <td className="px-3 py-3 text-slate-500">{product.barcode ?? '—'}</td>
                    <td className="px-3 py-3 text-right">
                      {product.price.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                    </td>
                    <td className="px-3 py-3 text-right">{product.stockOnHand}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleStockAdjust(product.id, 1)}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStockAdjust(product.id, -1)}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                        >
                          −1
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

