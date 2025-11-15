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

type CustomerInput = Pick<Customer, 'name' | 'type' | 'email' | 'phone' | 'address' | 'state' | 'gst' | 'notes'>

type ProductInput = Pick<
  Product,
  | 'sku'
  | 'barcode'
  | 'title'
  | 'description'
  | 'mrp'
  | 'cost'
  | 'defaultDiscount'
  | 'defaultDiscountType'
  | 'unitId'
  | 'reorderLevel'
> & {
  salePrice?: number // Optional - will be auto-calculated if not provided
  price?: number // Optional - alias for salePrice (backward compatibility)
}

type SalesOrderInput = {
  customerId: string
  status?: SalesOrder['status']
  issuedDate?: string
  dueDate?: string
  discount?: number
  discountType?: 'amount' | 'percentage'
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
  addToInventory?: boolean // Whether items should be added to product inventory
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

export const listCustomersByType = (type: 'customer' | 'supplier') =>
  db.customers
    .where('type')
    .equals(type)
    .and((customer) => !customer.isArchived)
    .sortBy('name')

export const listCustomersByTypePaginated = async (
  type: 'customer' | 'supplier',
  page: number,
  pageSize: number,
  searchQuery?: string,
) => {
  let query = db.customers.where('type').equals(type).and((customer) => !customer.isArchived)

  if (searchQuery?.trim()) {
    const searchTerm = searchQuery.toLowerCase()
    query = query.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm) ||
        (customer.email?.toLowerCase().includes(searchTerm) ?? false) ||
        (customer.phone?.toLowerCase().includes(searchTerm) ?? false) ||
        (customer.gst?.toLowerCase().includes(searchTerm) ?? false),
    )
  }

  const total = await query.count()
  const items = await query
    .offset((page - 1) * pageSize)
    .limit(pageSize)
    .sortBy('name')

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

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
    type: input.type ?? 'customer',
    name: input.name,
    email: input.email,
    phone: input.phone,
    address: input.address,
    state: input.state,
    gst: input.gst,
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

export const listProductsPaginated = async (page: number, pageSize: number, searchQuery?: string) => {
  let query = db.products.filter((product) => !product.isArchived)

  if (searchQuery?.trim()) {
    const searchTerm = searchQuery.toLowerCase()
    query = query.filter(
      (product) =>
        product.title.toLowerCase().includes(searchTerm) ||
        product.sku.toLowerCase().includes(searchTerm) ||
        (product.barcode?.toLowerCase().includes(searchTerm) ?? false) ||
        (product.description?.toLowerCase().includes(searchTerm) ?? false),
    )
  }

  const total = await query.count()
  const items = await query
    .offset((page - 1) * pageSize)
    .limit(pageSize)
    .sortBy('title')

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export const searchProducts = async (query: string, limit: number = 20) => {
  if (!query.trim()) return []
  const searchTerm = query.toLowerCase()
  return db.products
    .filter(
      (product) =>
        !product.isArchived &&
        (product.title.toLowerCase().includes(searchTerm) ||
          product.sku.toLowerCase().includes(searchTerm) ||
          (product.barcode?.toLowerCase().includes(searchTerm) ?? false)),
    )
    .limit(limit)
    .toArray()
}

export const searchCustomers = async (query: string, type: 'customer' | 'supplier', limit: number = 20) => {
  if (!query.trim()) return []
  const searchTerm = query.toLowerCase()
  return db.customers
    .where('type')
    .equals(type)
    .and((customer) => !customer.isArchived)
    .filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm) ||
        (customer.email?.toLowerCase().includes(searchTerm) ?? false) ||
        (customer.phone?.toLowerCase().includes(searchTerm) ?? false),
    )
    .limit(limit)
    .toArray()
}

export const getProduct = (id: string) => db.products.get(id)

export const createProduct = async (input: ProductInput & { tenantId?: string }) => {
  const timestamp = nowIso()
  const id = nanoid()
  
  // Calculate salePrice from MRP and default discount if not provided
  let salePrice = input.salePrice ?? input.price ?? 0
  const mrp = input.mrp ?? input.price ?? 0
  
  // If MRP is set but salePrice is not, calculate from default discount
  if (mrp > 0 && !input.salePrice && input.defaultDiscount) {
    if (input.defaultDiscountType === 'percentage') {
      salePrice = mrp * (1 - input.defaultDiscount / 100)
    } else {
      salePrice = mrp - input.defaultDiscount
    }
  } else if (mrp > 0 && !input.salePrice) {
    salePrice = mrp // If no discount, salePrice = MRP
  }
  
  // Ensure price is set (for backward compatibility)
  const price = salePrice
  
  const product: Product = {
    id,
    tenantId: input.tenantId ?? DEFAULT_TENANT_ID,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
    sku: input.sku,
    barcode: input.barcode,
    title: input.title,
    mrp: mrp,
    salePrice: salePrice,
    price: price,
    description: input.description,
    cost: input.cost ?? 0,
    defaultDiscount: input.defaultDiscount ?? 0,
    defaultDiscountType: input.defaultDiscountType ?? 'amount',
    unitId: input.unitId,
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

  // Calculate salePrice from MRP and default discount if needed
  let salePrice = input.salePrice ?? existing.salePrice ?? existing.price ?? 0
  const mrp = input.mrp ?? existing.mrp ?? existing.price ?? 0
  
  // If MRP is set but salePrice is not provided, calculate from default discount
  if (mrp > 0 && !input.salePrice && (input.defaultDiscount !== undefined || input.mrp !== undefined)) {
    const defaultDiscount = input.defaultDiscount ?? existing.defaultDiscount ?? 0
    const defaultDiscountType = input.defaultDiscountType ?? existing.defaultDiscountType ?? 'amount'
    if (defaultDiscount > 0) {
      if (defaultDiscountType === 'percentage') {
        salePrice = mrp * (1 - defaultDiscount / 100)
      } else {
        salePrice = mrp - defaultDiscount
      }
    } else {
      salePrice = mrp // If no discount, salePrice = MRP
    }
  }
  
  // Ensure price is set (for backward compatibility)
  const price = salePrice

  const timestamp = nowIso()
  const updated: Product = {
    ...existing,
    ...input,
    mrp: mrp,
    salePrice: salePrice,
    price: price,
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

export const listSalesOrdersPaginated = async (
  page: number,
  pageSize: number,
  filters?: { customerId?: string; startDate?: string; endDate?: string },
) => {
  let query = db.salesOrders.orderBy('issuedDate').reverse()

  // Apply filters
  if (filters?.customerId) {
    query = query.filter((order) => order.customerId === filters.customerId)
  }
  if (filters?.startDate) {
    const startDate = new Date(filters.startDate)
    startDate.setHours(0, 0, 0, 0)
    query = query.filter((order) => new Date(order.issuedDate) >= startDate)
  }
  if (filters?.endDate) {
    const endDate = new Date(filters.endDate)
    endDate.setHours(23, 59, 59, 999)
    query = query.filter((order) => new Date(order.issuedDate) <= endDate)
  }

  const allFiltered = await query.toArray()
  const total = allFiltered.length
  const items = allFiltered.slice((page - 1) * pageSize, page * pageSize)

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export const getSalesOrderWithItems = async (id: string) => {
  const order = await db.salesOrders.get(id)
  if (!order) return undefined
  const items = await db.salesOrderItems.where('orderId').equals(id).toArray()
  return { order, items }
}

export const createSalesOrder = async (
  input: SalesOrderInput & { tenantId?: string; taxRate?: number; taxSettings?: import('../utils/taxSettings').TaxSettings },
) => {
  const { generateOrderId } = await import('../utils/orderIdSettings')
  const id = await generateOrderId('sales')
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

  // Calculate order-level discount
  let orderDiscount = 0
  const discountType = input.discountType ?? 'amount'
  if (input.discount && input.discount > 0) {
    if (discountType === 'percentage') {
      orderDiscount = totals.subtotal * (input.discount / 100)
    } else {
      orderDiscount = input.discount
    }
  }
  const subtotalAfterDiscount = Math.max(0, totals.subtotal - orderDiscount)

  // Calculate tax using new taxSettings or fallback to legacy taxRate
  let tax = 0
  let taxType: 'gst' | 'cgst_sgst' | undefined = undefined
  let cgst: number | undefined = undefined
  let sgst: number | undefined = undefined
  
  if (input.taxSettings) {
    const { calculateTax } = await import('../utils/taxSettings')
    const taxCalc = calculateTax(subtotalAfterDiscount, input.taxSettings)
    tax = taxCalc.tax
    taxType = input.taxSettings.type
    cgst = taxCalc.cgst
    sgst = taxCalc.sgst
  } else {
    const taxRate = input.taxRate ?? 0
    tax = subtotalAfterDiscount * (taxRate / 100)
    // Legacy orders without taxSettings default to 'gst' type
    taxType = 'gst'
  }
  const total = subtotalAfterDiscount + tax

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
    discount: orderDiscount,
    discountType: discountType,
    tax,
    taxType,
    cgst,
    sgst,
    total,
    notes: input.notes,
  }

  await db.transaction('rw', db.salesOrders, db.salesOrderItems, db.products, db.syncQueue, async () => {
    await db.salesOrders.add(salesOrder)
    await db.salesOrderItems.bulkAdd(items)
    await enqueueChange('salesOrder', id, 'create', { salesOrder, items })

    // Update product stock - decrease stock for each item sold
    for (const item of items) {
      await adjustProductStock(item.productId, -item.quantity)
    }
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

export const listPurchaseOrdersPaginated = async (
  page: number,
  pageSize: number,
  filters?: { supplierName?: string; startDate?: string; endDate?: string },
) => {
  let query = db.purchaseOrders.orderBy('issuedDate').reverse()

  // Apply filters
  if (filters?.supplierName) {
    const searchTerm = filters.supplierName.toLowerCase()
    query = query.filter((order) => order.supplierName.toLowerCase().includes(searchTerm))
  }
  if (filters?.startDate) {
    const startDate = new Date(filters.startDate)
    startDate.setHours(0, 0, 0, 0)
    query = query.filter((order) => new Date(order.issuedDate) >= startDate)
  }
  if (filters?.endDate) {
    const endDate = new Date(filters.endDate)
    endDate.setHours(23, 59, 59, 999)
    query = query.filter((order) => new Date(order.issuedDate) <= endDate)
  }

  const allFiltered = await query.toArray()
  const total = allFiltered.length
  const items = allFiltered.slice((page - 1) * pageSize, page * pageSize)

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export const createPurchaseOrder = async (input: PurchaseOrderInput & { tenantId?: string }) => {
  const { generateOrderId } = await import('../utils/orderIdSettings')
  const id = await generateOrderId('purchase')
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
    addToInventory: input.addToInventory ?? true, // Default to true for backward compatibility
  }

  await db.transaction('rw', db.purchaseOrders, db.purchaseOrderItems, db.products, db.syncQueue, async () => {
    await db.purchaseOrders.add(purchaseOrder)
    await db.purchaseOrderItems.bulkAdd(items)
    await enqueueChange('purchaseOrder', id, 'create', { purchaseOrder, items })

    // Update product stock - increase stock for each item only if addToInventory is true
    if (purchaseOrder.addToInventory) {
      for (const item of items) {
        await adjustProductStock(item.productId, item.quantity)
      }
    }
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

