import { useEffect, useState } from 'react'
import { Formik } from 'formik'
import * as Yup from 'yup'
import type { Customer } from '../db/schema'
import { getCustomerSummary, getSupplierSummary, recordPayment } from '../db/localDataService'

interface CustomerDetailModalProps {
  isOpen: boolean
  onClose: () => void
  customer: Customer | null
}

const paymentSchema = Yup.object().shape({
  amount: Yup.number().min(0.01, 'Amount must be greater than 0').required('Amount is required'),
  paymentDate: Yup.string().required('Payment date is required'),
})

export const CustomerDetailModal = ({ isOpen, onClose, customer }: CustomerDetailModalProps) => {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  useEffect(() => {
    if (isOpen && customer) {
      loadSummary()
    }
  }, [isOpen, customer])

  const loadSummary = async () => {
    if (!customer) return
    setLoading(true)
    try {
      if (customer.type === 'customer') {
        const data = await getCustomerSummary(customer.id)
        setSummary(data)
      } else {
        const data = await getSupplierSummary(customer.name)
        setSummary(data)
      }
    } catch (error) {
      console.error('Error loading summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async (values: { amount: number; paymentDate: string }) => {
    if (!selectedOrderId || !customer) return

    try {
      await recordPayment(selectedOrderId, values.amount, customer.type === 'customer' ? 'sales' : 'purchase', values.paymentDate)
      await loadSummary()
      setShowPaymentForm(false)
      setSelectedOrderId(null)
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Failed to record payment')
    }
  }

  if (!isOpen || !customer) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">
            {customer.type === 'customer' ? 'Customer' : 'Supplier'} Details - {customer.name}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : summary ? (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {customer.type === 'customer' ? 'Total Sales' : 'Total Purchases'}
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {(customer.type === 'customer' ? summary.totalSales : summary.totalPurchases).toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'INR',
                    })}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-sm text-slate-600 dark:text-slate-400">Total Paid</div>
                  <div className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
                    {summary.totalPaid.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-sm text-slate-600 dark:text-slate-400">Total Due</div>
                  <div className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
                    {summary.totalDue.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-sm text-slate-600 dark:text-slate-400">Total Orders</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{summary.totalOrders}</div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold">
                  Due Orders ({summary.dueOrders})
                </h3>
              </div>

              {summary.orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-700 dark:text-slate-300">Order ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-700 dark:text-slate-300">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-700 dark:text-slate-300">Due Date</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-700 dark:text-slate-300">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-700 dark:text-slate-300">Paid</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-700 dark:text-slate-300">Due</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-700 dark:text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                      {summary.orders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900 dark:text-slate-50">{order.id.slice(0, 8)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                            {new Date(order.date).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                            {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-500 dark:text-slate-400">
                            {order.total.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-green-600 dark:text-green-400">
                            {order.paidAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-red-600 dark:text-red-400">
                            {order.dueAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                            <button
                              onClick={() => {
                                setSelectedOrderId(order.id)
                                setShowPaymentForm(true)
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Record Payment
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500">No due orders</div>
              )}

              {showPaymentForm && selectedOrderId && (
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <h4 className="mb-4 text-lg font-semibold">Record Payment</h4>
                  <Formik
                    initialValues={{
                      amount: summary.orders.find((o: any) => o.id === selectedOrderId)?.dueAmount || 0,
                      paymentDate: new Date().toISOString().split('T')[0],
                    }}
                    validationSchema={paymentSchema}
                    onSubmit={handlePayment}
                  >
                    {({ handleSubmit, handleChange, handleBlur, values, errors, touched, isSubmitting }) => (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Amount</label>
                          <input
                            type="number"
                            name="amount"
                            step="0.01"
                            min="0.01"
                            value={values.amount}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                          />
                          {errors.amount && touched.amount && <div className="mt-1 text-sm text-red-600">{String(errors.amount)}</div>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Payment Date</label>
                          <input
                            type="date"
                            name="paymentDate"
                            value={values.paymentDate}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                          />
                          {errors.paymentDate && touched.paymentDate && <div className="mt-1 text-sm text-red-600">{String(errors.paymentDate)}</div>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                          >
                            {isSubmitting ? 'Recording...' : 'Record Payment'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPaymentForm(false)
                              setSelectedOrderId(null)
                            }}
                            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </Formik>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-slate-500">No data available</div>
          )}
        </div>
      </div>
    </div>
  )
}

