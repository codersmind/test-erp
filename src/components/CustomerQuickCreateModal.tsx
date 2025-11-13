import { type FormEvent, useState } from 'react'

import { useCreateCustomer } from '../hooks/useCustomers'
import type { Customer, CustomerType } from '../db/schema'

interface CustomerQuickCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCustomerCreated: (customer: Customer) => void
  type?: CustomerType
}

export const CustomerQuickCreateModal = ({
  isOpen,
  onClose,
  onCustomerCreated,
  type = 'customer',
}: CustomerQuickCreateModalProps) => {
  const createCustomer = useCreateCustomer()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) return

    try {
      const customer = await createCustomer.mutateAsync({
        name: form.name.trim(),
        type,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      })
      onCustomerCreated(customer)
      setForm({ name: '', email: '', phone: '', address: '' })
      onClose()
    } catch (error) {
      console.error('Failed to create customer', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-lg font-semibold">Create new {type === 'customer' ? 'customer' : 'supplier'}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Quickly add a {type === 'customer' ? 'customer' : 'supplier'} to continue
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <label>
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                Name <span className="text-red-500">*</span>
              </span>
              <input
                required
                autoFocus
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="John Doe"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="john@example.com"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Phone</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="+1 234 567 8900"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Address</span>
              <textarea
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                placeholder="123 Main St, City, State ZIP"
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCustomer.isPending || !form.name.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {createCustomer.isPending ? 'Creating…' : 'Create & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

