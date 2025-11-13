import { type FormEvent, useState } from 'react'

import { useCreateCustomer } from '../hooks/useCustomers'
import { useCustomersByType } from '../hooks/useCustomersByType'
import type { CustomerType } from '../db/schema'


export const CustomersPage = () => {
  const [form, setForm] = useState({ name: '', type: 'customer' as CustomerType, email: '', phone: '' })
  const [filter, setFilter] = useState<'customer' | 'supplier'>('customer')
  const { data: customers, isPending } = useCustomersByType(filter)
  const createCustomerMutation = useCreateCustomer()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) return

    await createCustomerMutation.mutateAsync({
      name: form.name.trim(),
      type: form.type,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
    })
    setForm({ name: '', type: 'customer', email: '', phone: '' })
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold">Add {form.type === 'customer' ? 'customer' : 'supplier'}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Full name</span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="Jane Reader"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Type</span>
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as CustomerType }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
              </select>
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="reader@example.com"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Phone</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="+62 000 000 000"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createCustomerMutation.isPending}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
            >
              {createCustomerMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex">
            <button
              type="button"
              onClick={() => setFilter('customer')}
              className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                filter === 'customer'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Customers
            </button>
            <button
              type="button"
              onClick={() => setFilter('supplier')}
              className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                filter === 'supplier'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Suppliers
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Records are stored locally and queued for sync. They will be uploaded to Google Drive when you trigger a manual
            sync.
          </p>
          <ul className="mt-4 divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {isPending ? (
              <li className="py-6 text-center text-slate-500">Loading {filter}s…</li>
            ) : customers?.length ? (
              customers.map((customer) => (
                <li key={customer.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{customer.name}</p>
                    <p className="text-xs text-slate-500">
                      {customer.email ?? '—'} · {customer.phone ?? '—'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    Updated {new Date(customer.updatedAt).toLocaleString()}
                  </span>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-slate-500">No {filter}s yet.</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  )
}
