export type EntityType = 'customer' | 'product' | 'salesOrder' | 'purchaseOrder'

export interface BaseEntity {
  id: string
  tenantId: string
  createdAt: string
  updatedAt: string
  version: number
}

export interface Customer extends BaseEntity {
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  balance: number
  isArchived: boolean
}

export interface Product extends BaseEntity {
  sku: string
  barcode?: string
  title: string
  description?: string
  price: number
  cost: number
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

