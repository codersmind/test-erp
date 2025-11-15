import { useEffect, useState } from 'react'
import { Formik } from 'formik'

import { useAdjustProductStock, useCreateProduct } from '../hooks/useProducts'
import { useProductsPaginated } from '../hooks/useProductsPaginated'
import { useBarcodeScanner } from '../sensors/useBarcodeScanner'
import { ProductEditModal } from '../components/ProductEditModal'
import { Pagination } from '../components/Pagination'
import { FormField } from '../components/FormField'
import type { Product } from '../db/schema'
import { getAllUnits, type Unit } from '../utils/unitSettings'
import { productSchema } from '../utils/validationSchemas'
import { useSettingsStore } from '../store/useSettingsStore'

// Component to handle barcode scanner inside Formik context
const BarcodeScannerHandler = ({ onScan }: { onScan: (code: string) => void }) => {
  useBarcodeScanner(onScan)
  return null
}

const PAGE_SIZE = 20

export const ProductsPage = () => {
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const { data: paginatedData, isPending } = useProductsPaginated(page, PAGE_SIZE, searchQuery)
  const createProduct = useCreateProduct()
  const adjustStock = useAdjustProductStock()
  const [units, setUnits] = useState<Unit[]>([])
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const { unitSettings, loadSettings } = useSettingsStore()

  useEffect(() => {
    loadSettings()
    const loadUnits = async () => {
      const allUnits = await getAllUnits()
      setUnits(allUnits)
    }
    loadUnits()
  }, [loadSettings])

  // Barcode scanner will be set up inside Formik render function

  const handleStockAdjust = async (id: string, delta: number) => {
    if (!delta) return
    await adjustStock.mutateAsync({ id, quantity: delta })
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setShowEditModal(true)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setPage(1) // Reset to first page when searching
  }

  const products = paginatedData?.items ?? []
  const total = paginatedData?.total ?? 0
  const totalPages = paginatedData?.totalPages ?? 0

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold">Add product</h2>
        <Formik
          enableReinitialize
          initialValues={{
            title: '',
            sku: '',
            barcode: '',
            mrp: 0,
            salePrice: null,
            cost: 0,
            defaultDiscount: 0,
            defaultDiscountType: 'amount' as const,
            unitId: unitSettings?.defaultUnitId || null,
            description: null,
            reorderLevel: null,
          }}
          validationSchema={productSchema}
          onSubmit={async (values, { resetForm }) => {
            await createProduct.mutateAsync({
              title: values.title,
              sku: values.sku || `SKU-${Date.now()}`,
              barcode: values.barcode || undefined,
              mrp: values.mrp,
              salePrice: values.salePrice ?? undefined,
              cost: values.cost,
              defaultDiscount: values.defaultDiscount ?? 0,
              defaultDiscountType: values.defaultDiscountType,
              unitId: values.unitId || unitSettings?.defaultUnitId || undefined,
              description: values.description || undefined,
              reorderLevel: values.reorderLevel ?? undefined,
            })
            resetForm({
              values: {
                title: '',
                sku: '',
                barcode: '',
                mrp: 0,
                salePrice: null,
                cost: 0,
                defaultDiscount: 0,
                defaultDiscountType: 'amount' as const,
                unitId: unitSettings?.defaultUnitId || null,
                description: null,
                reorderLevel: null,
              },
            })
          }}
        >
          {({ handleSubmit, isSubmitting, setFieldValue }) => {
            return (
              <>
                <BarcodeScannerHandler onScan={(code) => setFieldValue('barcode', code)} />
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              name="title"
              label="Title"
              required
              placeholder="New release hardcover"
              className="sm:col-span-2"
            />
            <FormField name="sku" label="SKU" placeholder="SKU-001" />
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
                Barcode
                <span className="text-xs text-slate-400">Scan with reader</span>
              </label>
              <FormField name="barcode" placeholder="9780000000" />
            </div>
            <FormField
              name="mrp"
              label="MRP (Maximum Retail Price)"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
            />
            <FormField
              name="salePrice"
              label="Sale Price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Auto-calculated from discount"
              helperText="Leave empty to auto-calculate from MRP and discount"
            />
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Default Discount</label>
              <div className="mt-1 flex gap-2">
                <FormField
                  name="defaultDiscount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="flex-1"
                />
                <FormField name="defaultDiscountType" as="select" className="w-auto">
                  <option value="amount">Amount</option>
                  <option value="percentage">%</option>
                </FormField>
              </div>
            </div>
            <FormField
              name="cost"
              label="Cost"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
            />
            <FormField name="unitId" label="Unit" as="select">
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.symbol})
                </option>
              ))}
            </FormField>
            <FormField
              name="reorderLevel"
              label="Reorder Level"
              type="number"
              min="0"
              placeholder="0"
            />
            <FormField
              name="description"
              label="Description"
              as="textarea"
              rows={2}
              placeholder="Product description"
              className="sm:col-span-2"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createProduct.isPending || isSubmitting}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
            >
              {createProduct.isPending || isSubmitting ? 'Saving…' : 'Save product'}
            </button>
          </div>
        </form>
              </>
            )
          }}
        </Formik>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Inventory</h2>
          <div className="flex-1 sm:max-w-xs">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
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
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">MRP</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Sale Price</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Cost</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Stock</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isPending ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    Loading inventory…
                  </td>
                </tr>
              ) : products.length ? (
                products.map((product) => {
                  const mrp = product.mrp ?? product.price ?? 0
                  const salePrice = product.salePrice ?? product.price ?? 0
                  const discount = mrp > 0 ? ((mrp - salePrice) / mrp) * 100 : 0
                  return (
                    <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-3">
                        <p className="font-semibold">{product.title}</p>
                        <p className="text-xs text-slate-500">{product.description ?? '—'}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-500">{product.sku}</td>
                      <td className="px-3 py-3 text-slate-500">{product.barcode ?? '—'}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={mrp > salePrice ? 'line-through text-slate-400' : ''}>
                          {mrp.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-semibold">
                          {salePrice.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </span>
                        {discount > 0 && (
                          <span className="ml-1 text-xs text-green-600 dark:text-green-400">
                            ({discount.toFixed(0)}% off)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {product.cost.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
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
                  )
                })
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
