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

export type CustomerInput = Pick<Customer, 'name' | 'type' | 'email' | 'phone' | 'address' | 'state' | 'gst' | 'notes'>

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
  paidAmount?: number
  notes?: string
  items: Array<Omit<SalesOrderItem, 'id' | 'orderId' | 'lineTotal'> & { lineTotal?: number }>
}

type PurchaseOrderInput = {
  supplierName: string
  status?: PurchaseOrder['status']
  issuedDate?: string
  expectedDate?: string
  dueDate?: string
  paidAmount?: number
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

export const listProductsPaginated = async (
  page: number,
  pageSize: number,
  searchQuery?: string,
  sortBy?: 'title' | 'stockOnHand' | 'salePrice' | 'mrp' | 'createdAt',
  sortOrder?: 'asc' | 'desc',
) => {
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
  
  // Get all items first for sorting
  let items = await query.toArray()
  
  // Apply sorting
  const sortField = sortBy || 'title'
  const order = sortOrder || 'asc'
  
  items.sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortField) {
      case 'stockOnHand':
        aValue = a.stockOnHand ?? 0
        bValue = b.stockOnHand ?? 0
        break
      case 'salePrice':
        aValue = a.salePrice ?? a.price ?? a.mrp ?? 0
        bValue = b.salePrice ?? b.price ?? b.mrp ?? 0
        break
      case 'mrp':
        aValue = a.mrp ?? a.price ?? 0
        bValue = b.mrp ?? b.price ?? 0
        break
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
      case 'title':
      default:
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return order === 'asc' ? aValue - bValue : bValue - aValue
    } else {
      if (aValue < bValue) return order === 'asc' ? -1 : 1
      if (aValue > bValue) return order === 'asc' ? 1 : -1
      return 0
    }
  })
  
  // Apply pagination
  const startIndex = (page - 1) * pageSize
  items = items.slice(startIndex, startIndex + pageSize)

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
    paidAmount: input.paidAmount ?? 0,
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

  const previousStatus = existing.status
  const timestamp = nowIso()
  
  // When status changes to 'paid', automatically set paidAmount to total
  // When status changes from 'paid' to something else, reset paidAmount to 0
  let paidAmount = existing.paidAmount || 0
  if (status === 'paid' && previousStatus !== 'paid') {
    paidAmount = existing.total
  } else if (previousStatus === 'paid' && status !== 'paid') {
    paidAmount = 0
  }
  
  const updated: SalesOrder = {
    ...existing,
    status,
    paidAmount,
    updatedAt: timestamp,
    version: existing.version + 1,
  }

  await db.transaction('rw', db.salesOrders, db.salesOrderItems, db.products, db.syncQueue, async () => {
    // Handle refund: restock items when status changes to 'refund'
    if (status === 'refund' && previousStatus !== 'refund') {
      // Get all items for this order
      const items = await db.salesOrderItems.where('orderId').equals(id).toArray()
      // Restock each item (add back to inventory)
      for (const item of items) {
        await adjustProductStock(item.productId, item.quantity)
      }
    }
    // Handle un-refund: remove stock again when status changes from 'refund' to something else
    else if (previousStatus === 'refund' && status !== 'refund') {
      // Get all items for this order
      const items = await db.salesOrderItems.where('orderId').equals(id).toArray()
      // Remove stock again (subtract from inventory)
      for (const item of items) {
        await adjustProductStock(item.productId, -item.quantity)
      }
    }

    await db.salesOrders.put(updated)
    await enqueueChange('salesOrder', id, 'update', { salesOrder: updated })
  })

  return updated
}

export const updateSalesOrderNotes = async (id: string, notes: string) => {
  const existing = await db.salesOrders.get(id)
  if (!existing) {
    throw new Error(`Sales order ${id} not found`)
  }

  const timestamp = nowIso()
  
  const updated: SalesOrder = {
    ...existing,
    notes,
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
    dueDate: input.dueDate,
    subtotal: totals.subtotal,
    tax: 0,
    total: totals.subtotal,
    paidAmount: input.paidAmount ?? 0,
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

export const updatePurchaseOrderStatus = async (id: string, status: PurchaseOrder['status']) => {
  const existing = await db.purchaseOrders.get(id)
  if (!existing) {
    throw new Error(`Purchase order ${id} not found`)
  }

  const previousStatus = existing.status
  const timestamp = nowIso()
  
  // When status changes to 'paid', automatically set paidAmount to total
  // When status changes from 'paid' to something else, reset paidAmount to 0
  let paidAmount = existing.paidAmount || 0
  if (status === 'paid' && previousStatus !== 'paid') {
    paidAmount = existing.total
  } else if (previousStatus === 'paid' && status !== 'paid') {
    paidAmount = 0
  }
  
  const updated: PurchaseOrder = {
    ...existing,
    status,
    paidAmount,
    updatedAt: timestamp,
    version: existing.version + 1,
  }

  await db.transaction('rw', db.purchaseOrders, db.purchaseOrderItems, db.products, db.syncQueue, async () => {
    // Handle refund: remove stock when status changes to 'refund' (if items were added to inventory)
    if (status === 'refund' && previousStatus !== 'refund' && existing.addToInventory) {
      // Get all items for this order
      const items = await db.purchaseOrderItems.where('orderId').equals(id).toArray()
      // Remove stock (subtract from inventory)
      for (const item of items) {
        await adjustProductStock(item.productId, -item.quantity)
      }
    }
    // Handle un-refund: add stock back when status changes from 'refund' to something else (if addToInventory is true)
    else if (previousStatus === 'refund' && status !== 'refund' && existing.addToInventory) {
      // Get all items for this order
      const items = await db.purchaseOrderItems.where('orderId').equals(id).toArray()
      // Add stock back (increase inventory)
      for (const item of items) {
        await adjustProductStock(item.productId, item.quantity)
      }
    }

    await db.purchaseOrders.put(updated)
    await enqueueChange('purchaseOrder', id, 'update', { purchaseOrder: updated })
  })

  return updated
}

export const updatePurchaseOrderNotes = async (id: string, notes: string) => {
  const existing = await db.purchaseOrders.get(id)
  if (!existing) {
    throw new Error(`Purchase order ${id} not found`)
  }

  const timestamp = nowIso()
  
  const updated: PurchaseOrder = {
    ...existing,
    notes,
    updatedAt: timestamp,
    version: existing.version + 1,
  }

  await db.transaction('rw', db.purchaseOrders, db.syncQueue, async () => {
    await db.purchaseOrders.put(updated)
    await enqueueChange('purchaseOrder', id, 'update', { purchaseOrder: updated })
  })

  return updated
}

export const recordPayment = async (
  orderId: string,
  amount: number,
  type: 'sales' | 'purchase',
  _paymentDate?: string,
) => {
  const timestamp = nowIso()

  if (type === 'sales') {
    const order = await db.salesOrders.get(orderId)
    if (!order) {
      throw new Error(`Sales order ${orderId} not found`)
    }

    const newPaidAmount = Math.min((order.paidAmount || 0) + amount, order.total)
    const updated: SalesOrder = {
      ...order,
      paidAmount: newPaidAmount,
      updatedAt: timestamp,
      version: order.version + 1,
    }

    await db.transaction('rw', db.salesOrders, db.syncQueue, async () => {
      await db.salesOrders.put(updated)
      await enqueueChange('salesOrder', orderId, 'update', { salesOrder: updated })
    })

    return updated
  } else {
    const order = await db.purchaseOrders.get(orderId)
    if (!order) {
      throw new Error(`Purchase order ${orderId} not found`)
    }

    const newPaidAmount = Math.min((order.paidAmount || 0) + amount, order.total)
    const updated: PurchaseOrder = {
      ...order,
      paidAmount: newPaidAmount,
      updatedAt: timestamp,
      version: order.version + 1,
    }

    await db.transaction('rw', db.purchaseOrders, db.syncQueue, async () => {
      await db.purchaseOrders.put(updated)
      await enqueueChange('purchaseOrder', orderId, 'update', { purchaseOrder: updated })
    })

    return updated
  }
}

export const getCustomerSummary = async (customerId: string) => {
  const orders = await db.salesOrders.where('customerId').equals(customerId).toArray()
  const totalSales = orders.reduce((sum, order) => sum + order.total, 0)
  const totalPaid = orders.reduce((sum, order) => sum + (order.paidAmount || 0), 0)
  const totalDue = totalSales - totalPaid
  const dueOrders = orders.filter((order) => {
    // Don't show orders with status 'paid' as due
    if (order.status === 'paid') return false
    const dueAmount = order.total - (order.paidAmount || 0)
    return dueAmount > 0
  })

  return {
    totalSales,
    totalPaid,
    totalDue,
    totalOrders: orders.length,
    dueOrders: dueOrders.length,
    orders: dueOrders.map((order) => ({
      id: order.id,
      date: order.issuedDate,
      dueDate: order.dueDate,
      total: order.total,
      paidAmount: order.paidAmount || 0,
      dueAmount: order.total - (order.paidAmount || 0),
    })),
  }
}

export const getSupplierSummary = async (supplierName: string) => {
  const orders = await db.purchaseOrders.where('supplierName').equals(supplierName).toArray()
  const totalPurchases = orders.reduce((sum, order) => sum + order.total, 0)
  const totalPaid = orders.reduce((sum, order) => sum + (order.paidAmount || 0), 0)
  const totalDue = totalPurchases - totalPaid
  const dueOrders = orders.filter((order) => {
    // Don't show orders with status 'paid' as due
    if (order.status === 'paid') return false
    const dueAmount = order.total - (order.paidAmount || 0)
    return dueAmount > 0
  })

  return {
    totalPurchases,
    totalPaid,
    totalDue,
    totalOrders: orders.length,
    dueOrders: dueOrders.length,
    orders: dueOrders.map((order) => ({
      id: order.id,
      date: order.issuedDate,
      dueDate: order.dueDate,
      total: order.total,
      paidAmount: order.paidAmount || 0,
      dueAmount: order.total - (order.paidAmount || 0),
    })),
  }
}

export const getLowStockProducts = async () => {
  const products = await db.products.filter((product) => !product.isArchived).toArray()
  return products.filter((product) => {
    if (!product.reorderLevel) return false
    return product.stockOnHand <= product.reorderLevel
  })
}

export const getEarningsByDateRange = async (startDate: string, endDate: string, groupBy: 'day' | 'month' | 'year' = 'day') => {
  const orders = await db.salesOrders
    .filter((order) => {
      const orderDate = new Date(order.issuedDate)
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      return orderDate >= start && orderDate <= end && order.status !== 'cancelled' && order.status !== 'refund'
    })
    .toArray()

  const totalEarnings = orders.reduce((sum, order) => sum + order.total, 0)
  const totalPaid = orders.reduce((sum, order) => sum + (order.paidAmount || 0), 0)
  const totalDue = totalEarnings - totalPaid
  const totalOrders = orders.length

  // Group by date/month/year for chart data
  const earningsByPeriod: Record<string, number> = {}
  orders.forEach((order) => {
    const orderDate = new Date(order.issuedDate)
    let periodKey: string

    if (groupBy === 'month') {
      periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
    } else if (groupBy === 'year') {
      periodKey = String(orderDate.getFullYear())
    } else {
      periodKey = order.issuedDate.split('T')[0] // Get date part only
    }

    earningsByPeriod[periodKey] = (earningsByPeriod[periodKey] || 0) + order.total
  })

  const chartData = Object.entries(earningsByPeriod)
    .map(([period, amount]) => ({ date: period, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalEarnings,
    totalPaid,
    totalDue,
    totalOrders,
    chartData,
  }
}

export const getTotalCustomerDueAmount = async () => {
  const orders = await db.salesOrders
    .filter((order) => order.status !== 'paid' && order.status !== 'cancelled' && order.status !== 'refund')
    .toArray()

  const totalDue = orders.reduce((sum, order) => {
    const dueAmount = order.total - (order.paidAmount || 0)
    return sum + Math.max(0, dueAmount)
  }, 0)

  // Get customers with due amounts
  const customerDues: Record<string, number> = {}
  orders.forEach((order) => {
    const dueAmount = order.total - (order.paidAmount || 0)
    if (dueAmount > 0) {
      customerDues[order.customerId] = (customerDues[order.customerId] || 0) + dueAmount
    }
  })

  const customerDueList = await Promise.all(
    Object.entries(customerDues).map(async ([customerId, amount]) => {
      const customer = await db.customers.get(customerId)
      return {
        customerId,
        customerName: customer?.name || 'Unknown',
        dueAmount: amount,
      }
    }),
  )

  return {
    totalDue,
    customerCount: customerDueList.length,
    customerDueList: customerDueList.sort((a, b) => b.dueAmount - a.dueAmount),
  }
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

