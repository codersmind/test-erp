export type EntityType = 'customer' | 'product' | 'salesOrder' | 'purchaseOrder' | 'invoice' | 'payment'

export interface BaseEntity {
  id: string
  tenantId: string
  createdAt: string
  updatedAt: string
  version: number
}

export type CustomerType = 'customer' | 'supplier'

export interface Customer extends BaseEntity {
  name: string
  type: CustomerType
  email?: string
  phone?: string
  address?: string
  state?: string // State for GST calculation
  notes?: string
  balance: number
  isArchived: boolean
}

export interface Product extends BaseEntity {
  sku: string
  barcode?: string
  title: string
  description?: string
  mrp: number // Maximum Retail Price
  salePrice: number // Selling price (after default discount)
  price: number // Alias for salePrice (for backward compatibility)
  cost: number
  defaultDiscount: number // Default discount amount or percentage
  defaultDiscountType: 'amount' | 'percentage' // Discount type
  unitId?: string // Unit ID (e.g., 'piece', 'dozen')
  stockOnHand: number
  reorderLevel?: number
  isArchived: boolean
}

export type SalesOrderStatus = 'draft' | 'confirmed' | 'fulfilled' | 'cancelled'

export interface SalesOrder extends BaseEntity {
  customerId: string
  status: SalesOrderStatus
  issuedDate: string
  dueDate?: string
  subtotal: number
  discount: number // Order-level discount
  discountType: 'amount' | 'percentage' // Discount type
  tax: number
  total: number
  notes?: string
}

export interface SalesOrderItem {
  id: string
  orderId: string
  productId: string
  quantity: number
  unitPrice: number
  discount: number
  lineTotal: number
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled'

export interface PurchaseOrder extends BaseEntity {
  supplierName: string
  status: PurchaseOrderStatus
  issuedDate: string
  expectedDate?: string
  subtotal: number
  tax: number
  total: number
  notes?: string
}

export interface PurchaseOrderItem {
  id: string
  orderId: string
  productId: string
  quantity: number
  unitCost: number
  lineTotal: number
}

export type SyncAction = 'create' | 'update' | 'delete'

export interface SyncRecord {
  id: string
  entity: EntityType
  entityId: string
  action: SyncAction
  payload: unknown
  timestamp: string
  syncedAt?: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice extends BaseEntity {
  invoiceNumber: string
  salesOrderId: string
  customerId: string
  status: InvoiceStatus
  issuedDate: string
  dueDate: string
  subtotal: number
  tax: number
  total: number
  paidAmount: number
  balance: number
  notes?: string
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'check' | 'other'

export interface Payment extends BaseEntity {
  invoiceId: string
  customerId: string
  amount: number
  paymentDate: string
  method: PaymentMethod
  reference?: string
  notes?: string
}

