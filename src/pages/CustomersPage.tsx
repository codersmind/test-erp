import { type FormEvent, useState } from 'react'

import { useCreateCustomer, useCustomers } from '../hooks/useCustomers'

export const CustomersPage = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const { data: customers, isPending } = useCustomers()
  const createCustomerMutation = useCreateCustomer()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) return

    await createCustomerMutation.mutateAsync({
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
    })
    setForm({ name: '', email: '', phone: '' })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Add customer</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="flex items-end justify-end">
            <button
              type="submit"
              disabled={createCustomerMutation.isPending}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {createCustomerMutation.isPending ? 'Saving…' : 'Save customer'}
            </button>
          </div>
        </form>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Customers</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Records are stored locally and queued for sync. They will be uploaded to Google Drive when you trigger a manual
          sync and replace the placeholder sync service.
        </p>
        <ul className="mt-4 divide-y divide-slate-200 text-sm dark:divide-slate-800">
          {isPending ? (
            <li className="py-6 text-center text-slate-500">Loading customers…</li>
          ) : customers?.length ? (
            customers.map((customer) => (
              <li key={customer.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">{customer.name}</p>
                  <p className="text-xs text-slate-500">
                    {customer.email ?? '—'} · {customer.phone ?? '—'}
                  </p>
                </div>
                <span className="text-xs text-slate-400">Updated {new Date(customer.updatedAt).toLocaleString()}</span>
              </li>
            ))
          ) : (
            <li className="py-6 text-center text-slate-500">No customers yet.</li>
          )}
        </ul>
      </section>
    </div>
  )
}

