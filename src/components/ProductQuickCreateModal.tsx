import { type FormEvent, useEffect, useState } from 'react'

import { useCreateProduct } from '../hooks/useProducts'
import type { Product } from '../db/schema'
import { getUnitSettings } from '../utils/unitSettings'

interface ProductQuickCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onProductCreated: (product: Product) => void
}

export const ProductQuickCreateModal = ({
  isOpen,
  onClose,
  onProductCreated,
}: ProductQuickCreateModalProps) => {
  const createProduct = useCreateProduct()
  const [form, setForm] = useState({
    title: '',
    sku: '',
    barcode: '',
    mrp: '',
    cost: '',
  })
  const [defaultUnitId, setDefaultUnitId] = useState<string>('piece')

  useEffect(() => {
    const loadDefaultUnit = async () => {
      const settings = await getUnitSettings()
      setDefaultUnitId(settings.defaultUnitId)
    }
    loadDefaultUnit()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim()) return

    try {
      const product = await createProduct.mutateAsync({
        title: form.title.trim(),
        sku: form.sku.trim() || `SKU-${Date.now()}`,
        barcode: form.barcode.trim() || undefined,
        mrp: Number.parseFloat(form.mrp) || 0,
        cost: Number.parseFloat(form.cost) || 0,
        unitId: defaultUnitId || undefined,
        defaultDiscount: 0,
        defaultDiscountType: 'amount',
        description: undefined,
        reorderLevel: undefined,
      })
      onProductCreated(product)
      setForm({ title: '', sku: '', barcode: '', mrp: '', cost: '' })
      onClose()
    } catch (error) {
      console.error('Failed to create product', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6 sm:py-4">
          <h3 className="text-lg font-semibold">Create new product</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Quickly add a product to continue with your sale
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="space-y-4">
            <label>
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                Product name <span className="text-red-500">*</span>
              </span>
              <input
                required
                autoFocus
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="Book title"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">SKU</span>
                <input
                  value={form.sku}
                  onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  placeholder="Auto"
                />
              </label>
              <label>
                <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Barcode</span>
                <input
                  value={form.barcode}
                  onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  placeholder="Optional"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                  MRP <span className="text-red-500">*</span>
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
              disabled={createProduct.isPending || !form.title.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {createProduct.isPending ? 'Creating…' : 'Create & Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

