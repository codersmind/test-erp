import { FormikProvider, useFormik } from 'formik'

// @ts-expect-error - useUpdateCustomer exists but TypeScript cache may not recognize it
import { useUpdateCustomer } from '../hooks/useCustomers'
import { INDIAN_STATES } from '../utils/taxSettings'
import { FormField } from './FormField'
import type { Customer, CustomerType } from '../db/schema'
import { customerSchema, type CustomerFormValues } from '../utils/validationSchemas'
import type { CustomerInput } from '../db/localDataService'

interface CustomerEditModalProps {
  isOpen: boolean
  onClose: () => void
  customer: Customer | null
}

export const CustomerEditModal = ({ isOpen, onClose, customer }: CustomerEditModalProps) => {
  const updateCustomer = useUpdateCustomer()

  const formik = useFormik<CustomerFormValues>({
    initialValues: {
      name: customer?.name || '',
      type: (customer?.type || 'customer') as CustomerType,
      email: customer?.email || null,
      phone: customer?.phone || null,
      address: customer?.address || null,
      state: customer?.state || null,
      gst: (customer as any)?.gst || null,
      notes: customer?.notes || null,
    } as CustomerFormValues,
    validationSchema: customerSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!customer) return
      try {
        await updateCustomer.mutateAsync({
          id: customer.id,
          input: {
            name: values.name,
            type: values.type as CustomerType,
            email: values.email ?? undefined,
            phone: values.phone ?? undefined,
            address: values.address ?? undefined,
            state: values.state ?? undefined,
            gst: (values as any).gst ?? undefined,
            notes: values.notes ?? undefined,
          } as Partial<CustomerInput>,
        })
        onClose()
      } catch (error) {
        console.error('Failed to update customer', error)
      }
    },
  })

  if (!isOpen || !customer) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-full max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-lg font-semibold">Edit {customer.type === 'customer' ? 'customer' : 'supplier'}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Update {customer.type === 'customer' ? 'customer' : 'supplier'} information
          </p>
        </div>
        <FormikProvider value={formik}>
          <form onSubmit={formik.handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <FormField
                name="name"
                label="Name"
                required
                autoFocus
                placeholder="John Doe"
              />
              <FormField
                name="type"
                label="Type"
                as="select"
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
              </FormField>
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
              <FormField
                name="notes"
                label="Notes"
                as="textarea"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
            <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCustomer.isPending || formik.isSubmitting || !formik.values.name.trim()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {updateCustomer.isPending || formik.isSubmitting ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        </FormikProvider>
      </div>
    </div>
  )
}

