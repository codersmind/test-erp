import { db } from '../db/database'
import type { Customer, Invoice, Payment, Product, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem } from '../db/schema'
import { nowIso } from '../db/utils'
import type { SyncSnapshot } from './googleDriveClient'

type VersionedEntity = {
  id: string
  updatedAt?: string
  createdAt?: string
  version?: number
}

const selectLatest = <T extends VersionedEntity>(a: T, b: T): T => {
  const aVersion = a.version ?? 0
  const bVersion = b.version ?? 0
  if (aVersion !== bVersion) {
    return aVersion > bVersion ? a : b
  }

  const parse = (value?: string) => (value ? Date.parse(value) : 0)
  const aUpdated = parse(a.updatedAt) || parse(a.createdAt) || 0
  const bUpdated = parse(b.updatedAt) || parse(b.createdAt) || 0
  return aUpdated >= bUpdated ? a : b
}

const mergeCollections = <T extends VersionedEntity>(local: T[], remote: T[]): T[] => {
  const map = new Map<string, T>()
  remote.forEach((record) => map.set(record.id, record))
  local.forEach((record) => {
    const existing = map.get(record.id)
    if (!existing) {
      map.set(record.id, record)
      return
    }
    map.set(record.id, selectLatest(existing, record))
  })

  return Array.from(map.values())
}

export const mergeSnapshots = (local: SyncSnapshot, remote: SyncSnapshot): SyncSnapshot => {
  // For logo, prefer remote if it exists and is newer, otherwise use local
  let logo = local.logo || null
  if (remote.logo) {
    if (!local.logo) {
      logo = remote.logo
    } else {
      // Use the one with the latest uploadedAt timestamp
      const localTime = local.logo.uploadedAt ? Date.parse(local.logo.uploadedAt) : 0
      const remoteTime = remote.logo.uploadedAt ? Date.parse(remote.logo.uploadedAt) : 0
      logo = remoteTime > localTime ? remote.logo : local.logo
    }
  }
  
  return {
    exportedAt: nowIso(),
    customers: mergeCollections<Customer>(local.customers, remote.customers),
    products: mergeCollections<Product>(local.products, remote.products),
    salesOrders: mergeCollections<SalesOrder>(local.salesOrders, remote.salesOrders),
    salesOrderItems: mergeCollections<SalesOrderItem>(local.salesOrderItems, remote.salesOrderItems),
    purchaseOrders: mergeCollections<PurchaseOrder>(local.purchaseOrders, remote.purchaseOrders),
    purchaseOrderItems: mergeCollections<PurchaseOrderItem>(local.purchaseOrderItems, remote.purchaseOrderItems),
    invoices: mergeCollections<Invoice>(local.invoices || [], remote.invoices || []),
    payments: mergeCollections<Payment>(local.payments || [], remote.payments || []),
    // Preserve local unsynced events; remote queue represents historical uploads.
    syncQueue: local.syncQueue,
    logo,
  }
}

export const applySnapshotToLocal = async (snapshot: SyncSnapshot) => {
  await db.transaction('rw', [db.customers, db.products, db.salesOrders, db.salesOrderItems, db.purchaseOrders, db.purchaseOrderItems, db.invoices, db.payments], async () => {
    await db.customers.bulkPut(snapshot.customers)
    await db.products.bulkPut(snapshot.products)
    await db.salesOrders.bulkPut(snapshot.salesOrders)
    await db.salesOrderItems.bulkPut(snapshot.salesOrderItems)
    await db.purchaseOrders.bulkPut(snapshot.purchaseOrders)
    await db.purchaseOrderItems.bulkPut(snapshot.purchaseOrderItems)
    await db.invoices.bulkPut(snapshot.invoices || [])
    await db.payments.bulkPut(snapshot.payments || [])
  })
  
  // Apply logo if present
  if (snapshot.logo) {
    const { saveLogo } = await import('../utils/logoStorage')
    await saveLogo(snapshot.logo)
  }
}

