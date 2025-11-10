import { type FormEvent, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { useCustomers } from '../hooks/useCustomers'
import { useCreateSalesOrder, useSalesOrders } from '../hooks/useSalesOrders'
import { db } from '../db/database'
import { ReceiptPreview } from '../components/ReceiptPreview'

export const SalesOrdersPage = () => {
  const { data: customers } = useCustomers()
  const { data: orders, isPending } = useSalesOrders()
  const [form, setForm] = useState({ customerId: '', amount: '' })
  const createSalesOrderMutation = useCreateSalesOrder()
  const latestOrder = orders?.[0]
  const latestItems = useLiveQuery(
    () => (latestOrder ? db.salesOrderItems.where('orderId').equals(latestOrder.id).toArray() : []),
    [latestOrder?.id],
    [],
  )

  const customerOptions = useMemo(
    () =>
      (customers ?? []).map((customer) => ({
        value: customer.id,
        label: customer.name,
      })),
    [customers],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.customerId || !form.amount) return

    const amount = Number.parseFloat(form.amount)
    if (Number.isNaN(amount) || amount <= 0) return

    await createSalesOrderMutation.mutateAsync({
      customerId: form.customerId,
      items: [
        {
          productId: 'manual-entry',
          quantity: 1,
          unitPrice: amount,
          discount: 0,
          lineTotal: amount,
        },
      ],
      notes: 'Captured offline',
    })
    setForm({ customerId: '', amount: '' })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Record sale</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2">
            <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Customer</span>
            <select
              required
              value={form.customerId}
              onChange={(event) => setForm((prev) => ({ ...prev, customerId: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            >
              <option value="">Select customer</option>
              {customerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="0.00"
            />
          </label>
          <div className="flex items-end justify-end">
            <button
              type="submit"
              disabled={createSalesOrderMutation.isPending || !customerOptions.length}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {createSalesOrderMutation.isPending ? 'Saving…' : 'Save order'}
            </button>
          </div>
        </form>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Recent sales orders</h2>
        <ul className="mt-4 divide-y divide-slate-200 text-sm dark:divide-slate-800">
          {isPending ? (
            <li className="py-6 text-center text-slate-500">Loading orders…</li>
          ) : orders?.length ? (
            orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">
                    Order #{order.id.slice(-6)} · {order.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    Amount: {order.total.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(order.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </li>
            ))
          ) : (
            <li className="py-6 text-center text-slate-500">No sales orders yet.</li>
          )}
        </ul>
      </section>
      {latestOrder && latestItems && latestItems.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Printable receipt preview</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Connect a receipt printer in Electron to print this layout directly. Customize the template under
            `components/ReceiptPreview.tsx`.
          </p>
          <div className="mt-4">
            <ReceiptPreview order={latestOrder} items={latestItems} />
          </div>
        </section>
      )}
    </div>
  )
}

