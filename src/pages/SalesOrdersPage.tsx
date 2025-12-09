import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FileText, Printer, Trash2, X } from 'lucide-react'

import { useUpdateSalesOrderStatus, useUpdateSalesOrderNotes, useDeleteSalesOrder } from '../hooks/useSalesOrders'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { ErrorDialog } from '../components/ErrorDialog'
import { useSalesOrdersPaginated } from '../hooks/useSalesOrdersPaginated'
import { db } from '../db/database'
import { ReceiptPreview } from '../components/ReceiptPreview'
import { InvoicePrint } from '../components/InvoicePrint'
import type { SalesOrder, SalesOrderItem } from '../db/schema'
import { TabbedSalesOrderForm } from '../components/TabbedSalesOrderForm'
import { LazyCustomerPicker } from '../components/LazyCustomerPicker'
import { Pagination } from '../components/Pagination'
import { ExportDropdown } from '../components/ExportDropdown'
import Datepicker from 'react-tailwindcss-datepicker'
import { getCustomer, listSalesOrders } from '../db/localDataService'
import type { Customer } from '../db/schema'
import { exportSalesOrdersToExcel, exportSalesOrdersToCSV } from '../utils/exportUtils'
import type { DateFilter } from '../utils/exportUtils'

const PAGE_SIZE = 20

// Component to render a sales order row with items
const SalesOrderRow = ({ order, onDelete }: { order: SalesOrder; onDelete: (id: string) => void }) => {
  const [items, setItems] = useState<SalesOrderItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [showPrint, setShowPrint] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState(order.notes || '')
  const updateStatus = useUpdateSalesOrderStatus()
  const updateNotes = useUpdateSalesOrderNotes()

  useEffect(() => {
    const loadData = async () => {
      const orderItems = await db.salesOrderItems.where('orderId').equals(order.id).toArray()
      setItems(orderItems)
      const cust = await getCustomer(order.customerId)
      setCustomer(cust || null)
    }
    loadData()
  }, [order.id, order.customerId])

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
          {customer?.name ?? 'N/A'}
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
          {new Date(order.issuedDate).toLocaleDateString()}
        </td>
        <td className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
          <select
            value={order.status}
            onChange={(e) => {
              updateStatus.mutate({ id: order.id, status: e.target.value as SalesOrder['status'] })
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          >
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="fulfilled">Fulfilled</option>
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
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowNote(!showNote)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              title={order.notes ? 'Edit Note' : 'Add Note'}
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{order.notes ? 'Edit Note' : 'Add Note'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPrint(!showPrint)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
              title={showPrint ? 'Close Print' : 'Print Invoice'}
            >
              {showPrint ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Close Print</span>
                </>
              ) : (
                <>
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onDelete(order.id)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
              title="Delete Order"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete</span>
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
            <InvoicePrint order={order} items={items} customerName={customer?.name} type="sales" />
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
  const [orderToDelete, setOrderToDelete] = useState<SalesOrder | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const deleteSalesOrder = useDeleteSalesOrder()

  const orders = paginatedData?.items ?? []
  const total = paginatedData?.total ?? 0
  const totalPages = paginatedData?.totalPages ?? 0
  const latestOrder = orders?.[0]

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
        await deleteSalesOrder.mutateAsync(orderToDelete.id)
        setOrderToDelete(null)
        setShowDeleteDialog(false)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to delete sales order. It may be referenced in invoices.')
        setShowErrorDialog(true)
      }
    }
  }

  const handleExportExcel = async (dateFilter?: DateFilter) => {
    try {
      const allOrders = await listSalesOrders()
      await exportSalesOrdersToExcel(allOrders, 'sales_orders', dateFilter)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export to Excel.')
      setShowErrorDialog(true)
    }
  }

  const handleExportCSV = async (dateFilter?: DateFilter) => {
    try {
      const allOrders = await listSalesOrders()
      await exportSalesOrdersToCSV(allOrders, 'sales_orders', dateFilter)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export to CSV.')
      setShowErrorDialog(true)
    }
  }

  const handleExportBoth = async (dateFilter?: DateFilter) => {
    try {
      const allOrders = await listSalesOrders()
      await Promise.all([
        exportSalesOrdersToExcel(allOrders, 'sales_orders', dateFilter),
        exportSalesOrdersToCSV(allOrders, 'sales_orders', dateFilter),
      ])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export.')
      setShowErrorDialog(true)
    }
  }
  const latestItems = useLiveQuery(
    () => (latestOrder ? db.salesOrderItems.where('orderId').equals(latestOrder.id).toArray() : []),
    [latestOrder?.id],
    [],
  )

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <TabbedSalesOrderForm
        onOrderCreated={() => {
          // Order created callback - can be used for notifications or other actions
        }}
      />

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
            <ExportDropdown
              onExportExcel={handleExportExcel}
              onExportCSV={handleExportCSV}
              onExportBoth={handleExportBoth}
            />
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead>
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Order ID</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Customer</th>
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
                    Loading sales orders…
                  </td>
                </tr>
              ) : orders.length ? (
                orders.map((order) => (
                  <SalesOrderRow key={order.id} order={order} onDelete={handleDeleteClick} />
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

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setOrderToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Sales Order"
        message={`Are you sure you want to delete sales order #${orderToDelete?.id.slice(0, 8)}? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
      />
      <ErrorDialog
        isOpen={showErrorDialog}
        onClose={() => {
          setShowErrorDialog(false)
          setErrorMessage(null)
        }}
        title="Cannot Delete Sales Order"
        message={errorMessage || 'An error occurred while deleting the sales order.'}
      />
    </div>
  )
}
