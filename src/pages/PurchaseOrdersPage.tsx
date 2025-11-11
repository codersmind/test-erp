import { type FormEvent, useState } from 'react'

import { useCreatePurchaseOrder, usePurchaseOrders } from '../hooks/usePurchaseOrders'

export const PurchaseOrdersPage = () => {
  const [form, setForm] = useState({ supplierName: '', amount: '' })
  const { data: orders, isPending } = usePurchaseOrders()
  const createPurchaseOrderMutation = useCreatePurchaseOrder()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.supplierName || !form.amount) return

    const amount = Number.parseFloat(form.amount)
    if (Number.isNaN(amount) || amount <= 0) return

    await createPurchaseOrderMutation.mutateAsync({
      supplierName: form.supplierName.trim(),
      items: [
        {
          productId: 'manual-entry',
          quantity: 1,
          unitCost: amount,
          lineTotal: amount,
        },
      ],
      notes: 'Captured offline',
    })
    setForm({ supplierName: '', amount: '' })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Record purchase</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2">
            <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Supplier</span>
            <input
              type="text"
              required
              value={form.supplierName}
              onChange={(event) => setForm((prev) => ({ ...prev, supplierName: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="Great Books Supplier"
            />
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
              disabled={createPurchaseOrderMutation.isPending}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {createPurchaseOrderMutation.isPending ? 'Saving…' : 'Save purchase'}
            </button>
          </div>
        </form>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Recent purchase orders</h2>
        <ul className="mt-4 divide-y divide-slate-200 text-sm dark:divide-slate-800">
          {isPending ? (
            <li className="py-6 text-center text-slate-500">Loading purchases…</li>
          ) : orders?.length ? (
            orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">
                    {order.supplierName} · {order.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    Total: {order.total.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(order.updatedAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </li>
            ))
          ) : (
            <li className="py-6 text-center text-slate-500">No purchase orders yet.</li>
          )}
        </ul>
      </section>
    </div>
  )
}

