import * as yup from 'yup'

export const productSchema = yup.object({
  title: yup.string().required('Product title is required').trim(),
  sku: yup.string().trim(),
  barcode: yup.string().trim(),
  mrp: yup
    .number()
    .required('MRP is required')
    .min(0, 'MRP must be greater than or equal to 0')
    .typeError('MRP must be a number'),
  salePrice: yup
    .number()
    .min(0, 'Sale price must be greater than or equal to 0')
    .typeError('Sale price must be a number')
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value)),
  cost: yup
    .number()
    .required('Cost is required')
    .min(0, 'Cost must be greater than or equal to 0')
    .typeError('Cost must be a number'),
  defaultDiscount: yup
    .number()
    .min(0, 'Discount must be greater than or equal to 0')
    .typeError('Discount must be a number')
    .default(0),
  defaultDiscountType: yup
    .string()
    .oneOf(['amount', 'percentage'], 'Invalid discount type')
    .default('amount'),
  unitId: yup.string().nullable(),
  description: yup.string().trim().nullable(),
  reorderLevel: yup
    .number()
    .min(0, 'Reorder level must be greater than or equal to 0')
    .typeError('Reorder level must be a number')
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value)),
})

export const customerSchema = yup.object({
  name: yup.string().required('Customer name is required').trim(),
  type: yup.string().oneOf(['customer', 'supplier'], 'Invalid customer type').default('customer'),
  email: yup.string().email('Invalid email address').trim().nullable(),
  phone: yup.string().trim().nullable(),
  address: yup.string().trim().nullable(),
  state: yup.string().trim().nullable(),
  gst: yup.string().trim().nullable(),
  notes: yup.string().trim().nullable(),
})

export const salesOrderSchema = yup.object({
  customerId: yup.string().required('Customer is required'),
  issuedDate: yup.string().required('Issue date is required'),
  dueDate: yup.string().nullable(),
  notes: yup.string().trim().nullable(),
  selectedState: yup.string().nullable(),
  orderDiscount: yup
    .number()
    .min(0, 'Discount must be greater than or equal to 0')
    .typeError('Discount must be a number')
    .default(0),
  orderDiscountType: yup
    .string()
    .oneOf(['amount', 'percentage'], 'Invalid discount type')
    .default('amount'),
  isPaid: yup.boolean().default(false),
  paidAmount: yup
    .number()
    .min(0, 'Paid amount must be greater than or equal to 0')
    .typeError('Paid amount must be a number')
    .default(0),
  lineItems: yup.array().of(
    yup.object({
      productId: yup.string(),
      quantity: yup.number().min(1).default(1),
      unitPrice: yup.number().min(0).default(0),
      discount: yup.number().min(0).default(0),
    })
  ),
  type: yup.string().oneOf(['gst', 'cgst_sgst']).default('gst'),
  gstRate: yup.number().min(0).max(100).default(5),
  cgstRate: yup.number().min(0).max(50).default(2.5),
  sgstRate: yup.number().min(0).max(50).default(2.5),
  defaultState: yup.string().nullable(),
  stateRates: yup.object().default({}),
})

export const purchaseOrderSchema = yup.object({
  supplierId: yup.string().required('Supplier is required'),
  addToInventory: yup.boolean().default(true),
  isPaid: yup.boolean().default(false),
  paidAmount: yup
    .number()
    .min(0, 'Paid amount must be greater than or equal to 0')
    .typeError('Paid amount must be a number')
    .default(0),
  lineItems: yup.array().of(
    yup.object({
      productId: yup.string(),
      quantity: yup.number().min(1).default(1),
      unitCost: yup.number().min(0).default(0),
    })
  ),
})

export type ProductFormValues = yup.InferType<typeof productSchema>
export type CustomerFormValues = yup.InferType<typeof customerSchema>
export type SalesOrderFormValues = yup.InferType<typeof salesOrderSchema>
export type PurchaseOrderFormValues = yup.InferType<typeof purchaseOrderSchema>

