import { useEffect, useState, useRef } from 'react'
import { Formik, FieldArray } from 'formik'

import { useCreatePurchaseOrder, useUpdatePurchaseOrderStatus, useUpdatePurchaseOrderNotes, useDeletePurchaseOrder } from '../hooks/usePurchaseOrders'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { ErrorDialog } from '../components/ErrorDialog'
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
import { purchaseOrderSchema, type PurchaseOrderFormValues } from '../utils/validationSchemas'
import { getOrderSettings } from '../utils/orderSettings'
import type { PurchaseOrder, PurchaseOrderItem } from '../db/schema'

const PAGE_SIZE = 20

// Component to render a purchase order row with items
const PurchaseOrderRow = ({ order, onDelete }: { order: PurchaseOrder; onDelete: (id: string) => void }) => {
  const [items, setItems] = useState<PurchaseOrderItem[]>([])
  const [showPrint, setShowPrint] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState(order.notes || '')
  const updateStatus = useUpdatePurchaseOrderStatus()
  const updateNotes = useUpdatePurchaseOrderNotes()

  useEffect(() => {
    const loadData = async () => {
      const orderItems = await db.purchaseOrderItems.where('orderId').equals(order.id).toArray()
      setItems(orderItems)
    }
    loadData()
  }, [order.id])

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
          {order.supplierName}
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
          {new Date(order.issuedDate).toLocaleDateString()}
        </td>
        <td className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
          <select
            value={order.status}
            onChange={(e) => {
              updateStatus.mutate({ id: order.id, status: e.target.value as PurchaseOrder['status'] })
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          >
            <option value="draft">Draft</option>
            <option value="ordered">Ordered</option>
            <option value="received">Received</option>
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
            <button
              type="button"
              onClick={() => onDelete(order.id)}
              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              Delete
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
  const [defaultRoundFigure, setDefaultRoundFigure] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const createPurchaseOrderMutation = useCreatePurchaseOrder()
  const deletePurchaseOrder = useDeletePurchaseOrder()
  const formikRef = useRef<{ setFieldValue: (field: string, value: any) => void } | null>(null)
  const isSearchingRef = useRef<Record<number, boolean>>({})
  const originalProductIdRef = useRef<Record<number, string>>({})

  useEffect(() => {
    const loadSettings = async () => {
      const [purchaseSettings, orderSettings] = await Promise.all([
        getPurchaseOrderSettings(),
        getOrderSettings(),
      ])
      setDefaultAddToInventory(purchaseSettings.defaultAddToInventory)
      setDefaultRoundFigure(orderSettings.defaultRoundFigure)
    }
    loadSettings()
  }, [])

  const orders = paginatedData?.items ?? []
  const total = paginatedData?.total ?? 0
  const totalPages = paginatedData?.totalPages ?? 0

  const handleDeleteClick = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (order) {
      setOrderToDelete(order)
      setShowDeleteDialog(true)
    }
  }

  const handleDeleteConfirm = async () => {
    if (orderToDelete) {
      try {
        await deletePurchaseOrder.mutateAsync(orderToDelete.id)
        setOrderToDelete(null)
        setShowDeleteDialog(false)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to delete purchase order.')
        setShowErrorDialog(true)
      }
    }
  }

  const initialValues: PurchaseOrderFormValues = {
    supplierId: '',
    lineItems: [{ productId: '', quantity: 1, unitCost: 0 }],
    addToInventory: defaultAddToInventory,
    isPaid: false,
    paidAmount: 0,
    roundFigure: defaultRoundFigure,
  }


  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold">Record purchase</h2>
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={purchaseOrderSchema}
          onSubmit={async (values, { resetForm }) => {
            if (!values.supplierId) {
      setShowSupplierModal(true)
      return
    }

            const lineItems = values.lineItems || []
            let totalAmount = lineItems.reduce((sum, item) => {
              if (item.productId && item.quantity > 0 && item.unitCost > 0) {
                return sum + item.quantity * item.unitCost
              }
              return sum
            }, 0)

            // Apply round figure if checked
            if (values.roundFigure) {
              const roundedTotal = Math.round(totalAmount)
              totalAmount = roundedTotal
            }

            if (lineItems.some((item) => !item.productId || item.quantity <= 0 || item.unitCost <= 0)) {
              alert('Please ensure all line items have a selected product, valid quantity, and unit cost.')
              return
            }

            const supplier = await getCustomer(values.supplierId)
            if (!supplier) {
              alert('Selected supplier not found.')
              return
            }

            await createPurchaseOrderMutation.mutateAsync({
              supplierName: supplier.name,
              items: lineItems
                .filter((item): item is { productId: string; quantity: number; unitCost: number } => !!item.productId)
                .map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitCost: item.unitCost,
                  lineTotal: item.quantity * item.unitCost,
                })),
              notes: 'Captured offline',
              addToInventory: values.addToInventory,
              paidAmount: values.isPaid ? totalAmount : (values.paidAmount || 0),
              roundFigure: values.roundFigure,
            })

            resetForm({
              values: {
                supplierId: '',
                lineItems: [{ productId: '', quantity: 1, unitCost: 0 }],
                addToInventory: defaultAddToInventory,
                isPaid: false,
                paidAmount: 0,
                roundFigure: defaultRoundFigure,
              },
            })
          }}
        >
          {({ values, handleSubmit, isSubmitting, setFieldValue, errors, touched }) => {
            // Store setFieldValue in ref for modal callbacks
            formikRef.current = { setFieldValue }

            const lineItems = values.lineItems || []
            let totalAmount = lineItems.reduce((sum, item) => {
              if (item.productId && item.quantity > 0 && item.unitCost > 0) {
                return sum + item.quantity * item.unitCost
              }
              return sum
            }, 0)
            
            let roundDifference = 0
            // Apply round figure if checked
            if (values.roundFigure) {
              const roundedTotal = Math.round(totalAmount)
              roundDifference = totalAmount - roundedTotal
              if (roundDifference > 0) {
                totalAmount = roundedTotal
              } else {
                roundDifference = 0
              }
            }

            return (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Supplier</label>
            <div className="mt-1">
              <LazyCustomerPicker
                      value={values.supplierId}
                      onChange={(supplierId) => setFieldValue('supplierId', supplierId)}
                onQuickCreate={() => setShowSupplierModal(true)}
                type="supplier"
                placeholder="Search suppliers..."
              />
                    {touched.supplierId && errors.supplierId && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{String(errors.supplierId)}</p>
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
                          onClick={() => push({ productId: '', quantity: 1, unitCost: 0 })}
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
                            setFieldValue(`lineItems.${index}.unitCost`, 0)
                            return
                          }
                          const product = await getProduct(productId)
                          if (product) {
                            setFieldValue(`lineItems.${index}.productId`, productId)
                            setFieldValue(`lineItems.${index}.unitCost`, product.cost)
                            
                            // Auto-add blank item after product selection
                            const currentItems = values.lineItems || []
                            const lastItem = currentItems[currentItems.length - 1]
                            // Only add if the last item is not empty and current item is the last
                            if (index === currentItems.length - 1 && (lastItem?.productId)) {
                              push({ productId: '', quantity: 1, unitCost: 0 })
                            }
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
                        placeholder="Type or click to select an item"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                                onChange={(event) => setFieldValue(`lineItems.${index}.quantity`, Number.parseInt(event.target.value) || 1)}
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
                                onChange={(event) => setFieldValue(`lineItems.${index}.unitCost`, Number.parseFloat(event.target.value) || 0)}
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
                                onClick={() => {
                                  if (lineItems.length > 1) {
                                    remove(index)
                                  } else {
                                    setFieldValue(`lineItems.${index}.productId`, '')
                                    setFieldValue(`lineItems.${index}.quantity`, 1)
                                    setFieldValue(`lineItems.${index}.unitCost`, 0)
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

          <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="addToInventory"
                      checked={values.addToInventory}
                      onChange={(e) => setFieldValue('addToInventory', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
              />
              <label htmlFor="addToInventory" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Add items to product inventory
              </label>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
                    {values.addToInventory
                ? 'Items will be added to product stock when order is created.'
                : 'Items will be recorded in purchase order only, without updating product stock.'}
            </p>
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                    {/* Total */}
                    <div className="mb-4 flex items-center justify-between">
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

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={createPurchaseOrderMutation.isPending || isSubmitting || !values.supplierId || totalAmount === 0}
                      className="w-full rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
                    >
                      {createPurchaseOrderMutation.isPending || isSubmitting ? 'Saving…' : 'Save purchase'}
                    </button>
                  </div>
                </div>
              </form>
            )
          }}
        </Formik>
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
                    Loading purchase orders…
                  </td>
                </tr>
              ) : orders.length ? (
                orders.map((order) => (
                  <PurchaseOrderRow key={order.id} order={order} onDelete={handleDeleteClick} />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
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
        onCustomerCreated={(supplier) => {
          if (formikRef.current) {
            formikRef.current.setFieldValue('supplierId', supplier.id)
          }
          setShowSupplierModal(false)
        }}
        type="supplier"
      />
      <ProductQuickCreateModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false)
          setSelectedProductIndex(null)
        }}
        onProductCreated={(product) => {
          if (formikRef.current && selectedProductIndex !== null) {
            formikRef.current.setFieldValue(`lineItems.${selectedProductIndex}.productId`, product.id)
            formikRef.current.setFieldValue(`lineItems.${selectedProductIndex}.unitCost`, product.cost)
          }
          setShowProductModal(false)
          setSelectedProductIndex(null)
        }}
      />
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setOrderToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Purchase Order"
        message={`Are you sure you want to delete purchase order #${orderToDelete?.id.slice(0, 8)}? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
      />
      <ErrorDialog
        isOpen={showErrorDialog}
        onClose={() => {
          setShowErrorDialog(false)
          setErrorMessage(null)
        }}
        title="Cannot Delete Purchase Order"
        message={errorMessage || 'An error occurred while deleting the purchase order.'}
      />
    </div>
  )
}
