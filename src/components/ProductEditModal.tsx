import { type FormEvent, useEffect, useState } from 'react'

import { useUpdateProduct } from '../hooks/useProducts'
import type { Product } from '../db/schema'
import { getAllUnits, getUnitSettings, type Unit } from '../utils/unitSettings'

interface ProductEditModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
}

export const ProductEditModal = ({ isOpen, onClose, product }: ProductEditModalProps) => {
  const updateProduct = useUpdateProduct()
  const [form, setForm] = useState({
    title: '',
    sku: '',
    barcode: '',
    description: '',
    mrp: '',
    salePrice: '',
    cost: '',
    defaultDiscount: '',
    defaultDiscountType: 'amount' as 'amount' | 'percentage',
    unitId: '',
    reorderLevel: '',
  })
  const [units, setUnits] = useState<Unit[]>([])
  const [defaultUnitId, setDefaultUnitId] = useState<string>('piece')

  useEffect(() => {
    const loadUnits = async () => {
      const allUnits = await getAllUnits()
      setUnits(allUnits)
      const settings = await getUnitSettings()
      setDefaultUnitId(settings.defaultUnitId)
    }
    loadUnits()
  }, [])

  useEffect(() => {
    if (product) {
      setForm({
        title: product.title,
        sku: product.sku,
        barcode: product.barcode || '',
        description: product.description || '',
        mrp: (product.mrp ?? product.price ?? 0).toString(),
        salePrice: (product.salePrice ?? product.price ?? 0).toString(),
        cost: product.cost.toString(),
        defaultDiscount: (product.defaultDiscount ?? 0).toString(),
        defaultDiscountType: product.defaultDiscountType ?? 'amount',
        unitId: product.unitId || '',
        reorderLevel: product.reorderLevel?.toString() || '',
      })
    }
  }, [product])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!product || !form.title.trim()) return

    try {
      await updateProduct.mutateAsync({
        id: product.id,
        title: form.title.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        description: form.description.trim() || undefined,
        mrp: Number.parseFloat(form.mrp) || 0,
        salePrice: Number.parseFloat(form.salePrice) || undefined,
        cost: Number.parseFloat(form.cost) || 0,
        defaultDiscount: Number.parseFloat(form.defaultDiscount) || 0,
        defaultDiscountType: form.defaultDiscountType,
        unitId: form.unitId || defaultUnitId || undefined,
        reorderLevel: form.reorderLevel ? Number.parseInt(form.reorderLevel) : undefined,
      })
      onClose()
    } catch (error) {
      console.error('Failed to update product', error)
    }
  }

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6 sm:py-4">
          <h3 className="text-lg font-semibold">Edit product</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Update product information</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Title <span className="text-red-500">*</span>
                </span>
                <input
                  required
                  autoFocus
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  placeholder="Product title"
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
                <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Barcode</span>
                <input
                  value={form.barcode}
                  onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  placeholder="9780000000"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  placeholder="Product description"
                />
              </label>
              <label>
                <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                  MRP (Maximum Retail Price) <span className="text-red-500">*</span>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.mrp}
                  onChange={(event) => setForm((prev) => ({ ...prev, mrp: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  placeholder="0.00"
                />
              </label>
              <label>
                <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Sale Price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salePrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, salePrice: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  placeholder="Auto-calculated"
                />
                <p className="mt-1 text-xs text-slate-500">Leave empty to auto-calculate from MRP and discount</p>
              </label>
              <label>
                <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Default Discount</span>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.defaultDiscount}
                    onChange={(event) => setForm((prev) => ({ ...prev, defaultDiscount: event.target.value }))}
                    className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    placeholder="0.00"
                  />
                  <select
                    value={form.defaultDiscountType}
                    onChange={(event) => setForm((prev) => ({ ...prev, defaultDiscountType: event.target.value as 'amount' | 'percentage' }))}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  >
                    <option value="amount">Amount</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
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
                <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Unit</span>
                <select
                  value={form.unitId || defaultUnitId}
                  onChange={(event) => setForm((prev) => ({ ...prev, unitId: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                >
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </select>
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
              <div className="flex items-end">
                <div className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Stock on hand</span>
                  <p className="mt-1 font-semibold">{product.stockOnHand}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProduct.isPending || !form.title.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {updateProduct.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

