import { nanoid } from 'nanoid'

import { db } from './database'
import type {
  Customer,
  EntityType,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  SalesOrder,
  SalesOrderItem,
  SyncAction,
  SyncRecord,
} from './schema'
import { DEFAULT_TENANT_ID, nowIso } from './utils'

type CustomerInput = Pick<Customer, 'name' | 'email' | 'phone' | 'address' | 'notes'>

type ProductInput = Pick<
  Product,
  'sku' | 'barcode' | 'title' | 'description' | 'price' | 'cost' | 'reorderLevel'
>

type SalesOrderInput = {
  customerId: string
  status?: SalesOrder['status']
  issuedDate?: string
  dueDate?: string
  notes?: string
  items: Array<Omit<SalesOrderItem, 'id' | 'orderId' | 'lineTotal'> & { lineTotal?: number }>
}

type PurchaseOrderInput = {
  supplierName: string
  status?: PurchaseOrder['status']
  issuedDate?: string
  expectedDate?: string
  notes?: string
  items: Array<Omit<PurchaseOrderItem, 'id' | 'orderId' | 'lineTotal'> & { lineTotal?: number }>
}

const enqueueChange = async (entity: EntityType, entityId: string, action: SyncAction, payload: unknown) => {
  const record: SyncRecord = {
    id: nanoid(),
    entity,
    entityId,
    action,
    payload,
    timestamp: nowIso(),
  }

  await db.syncQueue.add(record)
}

export const listCustomers = () => db.customers.orderBy('name').filter((customer) => !customer.isArchived).toArray()

export const getCustomer = (id: string) => db.customers.get(id)

export const createCustomer = async (input: CustomerInput & { tenantId?: string }) => {
  const timestamp = nowIso()
  const id = nanoid()
  const customer: Customer = {
    id,
    tenantId: input.tenantId ?? DEFAULT_TENANT_ID,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
    balance: 0,
    isArchived: false,
    name: input.name,
    email: input.email,
    phone: input.phone,
    address: input.address,
    notes: input.notes,
  }

  await db.transaction('rw', db.customers, db.syncQueue, async () => {
    await db.customers.add(customer)
    await enqueueChange('customer', id, 'create', customer)
  })

  return customer
}

export const updateCustomer = async (id: string, input: Partial<CustomerInput>) => {
  const existing = await db.customers.get(id)
  if (!existing) {
    throw new Error(`Customer ${id} not found`)
  }

  const timestamp = nowIso()
  const updated: Customer = {
    ...existing,
    ...input,
    updatedAt: timestamp,
    version: existing.version + 1,
  }

  await db.transaction('rw', db.customers, db.syncQueue, async () => {
    await db.customers.put(updated)
    await enqueueChange('customer', id, 'update', updated)
  })

  return updated
}

export const archiveCustomer = async (id: string) => {
  const existing = await db.customers.get(id)
  if (!existing) {
    throw new Error(`Customer ${id} not found`)
  }

  const timestamp = nowIso()
  const updated: Customer = {
    ...existing,
    updatedAt: timestamp,
    version: existing.version + 1,
    isArchived: true,
  }

  await db.transaction('rw', db.customers, db.syncQueue, async () => {
    await db.customers.put(updated)
    await enqueueChange('customer', id, 'update', updated)
  })

  return updated
}

export const listProducts = () => db.products.orderBy('title').filter((product) => !product.isArchived).toArray()

export const getProduct = (id: string) => db.products.get(id)

export const createProduct = async (input: ProductInput & { tenantId?: string }) => {
  const timestamp = nowIso()
  const id = nanoid()
  const product: Product = {
    id,
    tenantId: input.tenantId ?? DEFAULT_TENANT_ID,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
    sku: input.sku,
    barcode: input.barcode,
    title: input.title,
    description: input.description,
    price: input.price,
    cost: input.cost,
    stockOnHand: 0,
    reorderLevel: input.reorderLevel,
    isArchived: false,
  }

  await db.transaction('rw', db.products, db.syncQueue, async () => {
    await db.products.add(product)
    await enqueueChange('product', id, 'create', product)
  })

  return product
}

export const updateProduct = async (id: string, input: Partial<ProductInput>) => {
  const existing = await db.products.get(id)
  if (!existing) {
    throw new Error(`Product ${id} not found`)
  }

  const timestamp = nowIso()
  const updated: Product = {
    ...existing,
    ...input,
    updatedAt: timestamp,
    version: existing.version + 1,
  }

  await db.transaction('rw', db.products, db.syncQueue, async () => {
    await db.products.put(updated)
    await enqueueChange('product', id, 'update', updated)
  })

  return updated
}

export const adjustProductStock = async (id: string, quantity: number) => {
  const existing = await db.products.get(id)
  if (!existing) {
    throw new Error(`Product ${id} not found`)
  }

  const timestamp = nowIso()
  const updated: Product = {
    ...existing,
    stockOnHand: existing.stockOnHand + quantity,
    updatedAt: timestamp,
    version: existing.version + 1,
  }

  await db.transaction('rw', db.products, db.syncQueue, async () => {
    await db.products.put(updated)
    await enqueueChange('product', id, 'update', { product: updated, adjustment: quantity })
  })

  return updated
}

export const listSalesOrders = () => db.salesOrders.orderBy('issuedDate').reverse().toArray()

export const getSalesOrderWithItems = async (id: string) => {
  const order = await db.salesOrders.get(id)
  if (!order) return undefined
  const items = await db.salesOrderItems.where('orderId').equals(id).toArray()
  return { order, items }
}

export const createSalesOrder = async (input: SalesOrderInput & { tenantId?: string }) => {
  const id = nanoid()
  const timestamp = nowIso()
  const issuedDate = input.issuedDate ?? timestamp
  const status = input.status ?? 'draft'

  const items: SalesOrderItem[] = input.items.map((item) => {
    const lineTotal = item.lineTotal ?? item.quantity * item.unitPrice - (item.discount ?? 0)
    return {
      id: nanoid(),
      orderId: id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount ?? 0,
      lineTotal,
    }
  })

  const totals = items.reduce(
    (acc, item) => {
      acc.subtotal += item.lineTotal
      return acc
    },
    { subtotal: 0 },
  )

  const salesOrder: SalesOrder = {
    id,
    tenantId: input.tenantId ?? DEFAULT_TENANT_ID,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
    customerId: input.customerId,
    status,
    issuedDate,
    dueDate: input.dueDate,
    subtotal: totals.subtotal,
    tax: 0,
    total: totals.subtotal,
    notes: input.notes,
  }

  await db.transaction('rw', db.salesOrders, db.salesOrderItems, db.syncQueue, async () => {
    await db.salesOrders.add(salesOrder)
    await db.salesOrderItems.bulkAdd(items)
    await enqueueChange('salesOrder', id, 'create', { salesOrder, items })
  })

  return { salesOrder, items }
}

export const updateSalesOrderStatus = async (id: string, status: SalesOrder['status']) => {
  const existing = await db.salesOrders.get(id)
  if (!existing) {
    throw new Error(`Sales order ${id} not found`)
  }

  const timestamp = nowIso()
  const updated: SalesOrder = {
    ...existing,
    status,
    updatedAt: timestamp,
    version: existing.version + 1,
  }

  await db.transaction('rw', db.salesOrders, db.syncQueue, async () => {
    await db.salesOrders.put(updated)
    await enqueueChange('salesOrder', id, 'update', { salesOrder: updated })
  })

  return updated
}

export const listPurchaseOrders = () => db.purchaseOrders.orderBy('issuedDate').reverse().toArray()

export const createPurchaseOrder = async (input: PurchaseOrderInput & { tenantId?: string }) => {
  const id = nanoid()
  const timestamp = nowIso()
  const issuedDate = input.issuedDate ?? timestamp
  const status = input.status ?? 'draft'

  const items: PurchaseOrderItem[] = input.items.map((item) => {
    const lineTotal = item.lineTotal ?? item.quantity * item.unitCost
    return {
      id: nanoid(),
      orderId: id,
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      lineTotal,
    }
  })

  const totals = items.reduce(
    (acc, item) => {
      acc.subtotal += item.lineTotal
      return acc
    },
    { subtotal: 0 },
  )

  const purchaseOrder: PurchaseOrder = {
    id,
    tenantId: input.tenantId ?? DEFAULT_TENANT_ID,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
    supplierName: input.supplierName,
    status,
    issuedDate,
    expectedDate: input.expectedDate,
    subtotal: totals.subtotal,
    tax: 0,
    total: totals.subtotal,
    notes: input.notes,
  }

  await db.transaction('rw', db.purchaseOrders, db.purchaseOrderItems, db.syncQueue, async () => {
    await db.purchaseOrders.add(purchaseOrder)
    await db.purchaseOrderItems.bulkAdd(items)
    await enqueueChange('purchaseOrder', id, 'create', { purchaseOrder, items })
  })

  return { purchaseOrder, items }
}

export const enqueueManualSyncMarker = async () => {
  await enqueueChange('customer', nanoid(), 'update', { synthetic: true })
}

export const listPendingSyncRecords = () => db.syncQueue.filter((record) => !record.syncedAt).toArray()

export const markRecordsSynced = async (ids: string[]) => {
  const timestamp = nowIso()
  await db.transaction('rw', db.syncQueue, async () => {
    await Promise.all(
      ids.map(async (id) => {
        await db.syncQueue.update(id, { syncedAt: timestamp })
      }),
    )
  })
}

