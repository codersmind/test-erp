import { type FormEvent, useState } from 'react'

import { useCreateCustomer } from '../hooks/useCustomers'
import { useCustomersPaginated } from '../hooks/useCustomersPaginated'
import { Pagination } from '../components/Pagination'
import type { Customer, CustomerType } from '../db/schema'

const PAGE_SIZE = 20

export const CustomersPage = () => {
  const [form, setForm] = useState({ name: '', type: 'customer' as CustomerType, email: '', phone: '' })
  const [activeTab, setActiveTab] = useState<CustomerType>('customer')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const { data: paginatedData, isPending } = useCustomersPaginated(activeTab, page, PAGE_SIZE, searchQuery)
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

  const handleTabChange = (tab: CustomerType) => {
    setActiveTab(tab)
    setPage(1)
    setSearchQuery('')
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }
  

  const customers = paginatedData?.items ?? []
  const total = paginatedData?.total ?? 0
  const totalPages = paginatedData?.totalPages ?? 0

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold">Add new contact</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2">
            <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Name <span className="text-red-500">*</span>
            </span>
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
              placeholder="contact@example.com"
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
          <div className="flex items-end justify-end sm:col-span-2 lg:col-span-1">
            <button
              type="submit"
              disabled={createCustomerMutation.isPending || !form.name.trim()}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
            >
              {createCustomerMutation.isPending ? 'Saving…' : 'Save contact'}
            </button>
          </div>
        </form>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Contacts</h2>
            <div className="flex gap-2 rounded-md bg-slate-100 p-1 text-sm font-medium dark:bg-slate-800">
              <button
                type="button"
                onClick={() => handleTabChange('customer')}
                className={`rounded-md px-3 py-1.5 transition ${
                  activeTab === 'customer'
                    ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-50'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700/70'
                }`}
              >
                Customers
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('supplier')}
                className={`rounded-md px-3 py-1.5 transition ${
                  activeTab === 'supplier'
                    ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-50'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700/70'
                }`}
              >
                Suppliers
              </button>
            </div>
          </div>
          <div className="flex-1 sm:max-w-xs">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={`Search ${activeTab === 'customer' ? 'customers' : 'suppliers'}...`}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            />
          </div>
        </div>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Records are stored locally and queued for sync. They will be uploaded to Google Drive when you trigger a manual
          sync and replace the placeholder sync service.
        </p>
        <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
          {isPending ? (
            <li className="py-6 text-center text-slate-500">Loading {activeTab}s…</li>
          ) : customers.length ? (
            customers.map((customer: Customer) => (
              <li key={customer.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
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
            <li className="py-6 text-center text-slate-500">No {activeTab}s yet.</li>
          )}
        </ul>
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
    </div>
  )
}
