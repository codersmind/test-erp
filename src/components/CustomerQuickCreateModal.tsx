import { FormikProvider, useFormik } from 'formik'

import { useCreateCustomer } from '../hooks/useCustomers'
import { INDIAN_STATES } from '../utils/taxSettings'
import { FormField } from './FormField'
import type { Customer, CustomerType } from '../db/schema'
import { customerSchema, type CustomerFormValues } from '../utils/validationSchemas'

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

  const formik = useFormik<CustomerFormValues>({
    initialValues: {
      name: '',
      type,
      email: null,
      phone: null,
      address: null,
      state: null,
      gst: null,
      notes: null,
    },
    validationSchema: customerSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const customer = await createCustomer.mutateAsync({
          name: values.name,
          type: values.type as CustomerType,
          email: values.email || undefined,
          phone: values.phone || undefined,
          address: values.address || undefined,
          state: values.state || undefined,
          gst: values.gst || undefined,
        })
        onCustomerCreated(customer)
        resetForm()
        onClose()
      } catch (error) {
        console.error('Failed to create customer', error)
      }
    },
  })

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
        <FormikProvider value={formik}>
          <form onSubmit={formik.handleSubmit} className="p-6">
            <div className="space-y-4">
              <FormField
                name="name"
                label="Name"
                required
                autoFocus
                placeholder="John Doe"
              />
              <FormField
                name="email"
                label="Email"
                type="email"
                placeholder="john@example.com"
              />
              <FormField
                name="phone"
                label="Phone"
                type="tel"
                placeholder="+1 234 567 8900"
              />
              <FormField
                name="address"
                label="Address"
                as="textarea"
                rows={2}
                placeholder="123 Main St, City, State ZIP"
              />
              <FormField name="state" label="State" as="select">
                <option value="">Select state (optional)</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </FormField>
              <FormField
                name="gst"
                label="GST Number"
                placeholder="GSTIN (optional)"
              />
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
                disabled={createCustomer.isPending || formik.isSubmitting || !formik.values.name.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {createCustomer.isPending || formik.isSubmitting ? 'Creating…' : 'Create & Continue'}
              </button>
            </div>
          </form>
        </FormikProvider>
      </div>
    </div>
  )
}

