import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { zipSync, unzipSync } from 'fflate'

import type {
  Customer,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  SalesOrder,
  SalesOrderItem,
  SyncRecord,
} from '../db/schema'
import { nowIso } from '../db/utils'
import type { SyncSnapshot } from './googleDriveClient'

const wasmUrl = new URL('sql.js/dist/sql-wasm.wasm', import.meta.url).toString()

let sqlPromise: Promise<SqlJsStatic> | null = null

const getSqlModule = () => {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: () => wasmUrl })
  }
  return sqlPromise
}

const toBoolean = (value: number | undefined | null) => value === 1

const toNumberValue = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

const toStringValue = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value
  if (value == null) return fallback
  return String(value)
}

const toOptionalString = (value: unknown) => {
  if (value == null) return undefined
  return toStringValue(value)
}

const mapCustomerRow = (row: Record<string, unknown>): Customer => ({
  id: toStringValue(row.id),
  tenantId: toStringValue(row.tenantId),
  createdAt: toStringValue(row.createdAt, nowIso()),
  updatedAt: toStringValue(row.updatedAt, nowIso()),
  version: toNumberValue(row.version),
  balance: toNumberValue(row.balance),
  isArchived: toBoolean(toNumberValue(row.isArchived)),
  name: toStringValue(row.name),
  email: toOptionalString(row.email),
  phone: toOptionalString(row.phone),
  address: toOptionalString(row.address),
  state: toOptionalString(row.state),
  notes: toOptionalString(row.notes),
  type: toStringValue(row.type) as Customer['type'],
})

const mapProductRow = (row: Record<string, unknown>): Product => ({
  id: toStringValue(row.id),
  tenantId: toStringValue(row.tenantId),
  createdAt: toStringValue(row.createdAt, nowIso()),
  updatedAt: toStringValue(row.updatedAt, nowIso()),
  version: toNumberValue(row.version),
  sku: toStringValue(row.sku),
  barcode: toOptionalString(row.barcode),
  title: toStringValue(row.title),
  description: toOptionalString(row.description),
  mrp: toNumberValue(row.mrp ?? row.price ?? 0),
  salePrice: toNumberValue(row.salePrice ?? row.price ?? 0),
  price: toNumberValue(row.price ?? row.salePrice ?? 0),
  cost: toNumberValue(row.cost),
  defaultDiscount: toNumberValue(row.defaultDiscount ?? 0),
  defaultDiscountType: (toStringValue(row.defaultDiscountType ?? 'amount')) as 'amount' | 'percentage',
  unitId: toOptionalString(row.unitId),
  stockOnHand: toNumberValue(row.stockOnHand),
  reorderLevel: row.reorderLevel != null ? toNumberValue(row.reorderLevel) : undefined,
  isArchived: toBoolean(toNumberValue(row.isArchived)),
})

const mapSalesOrderRow = (row: Record<string, unknown>): SalesOrder => ({
  id: toStringValue(row.id),
  tenantId: toStringValue(row.tenantId),
  createdAt: toStringValue(row.createdAt, nowIso()),
  updatedAt: toStringValue(row.updatedAt, nowIso()),
  version: toNumberValue(row.version),
  customerId: toStringValue(row.customerId),
  status: toStringValue(row.status) as SalesOrder['status'],
  discount: toNumberValue(row.discount ?? 0),
  discountType: (toStringValue(row.discountType ?? 'amount')) as 'amount' | 'percentage',
  issuedDate: toStringValue(row.issuedDate, nowIso()),
  dueDate: toOptionalString(row.dueDate),
  subtotal: toNumberValue(row.subtotal),
  tax: toNumberValue(row.tax),
  total: toNumberValue(row.total),
  notes: toOptionalString(row.notes),
})

const mapSalesOrderItemRow = (row: Record<string, unknown>): SalesOrderItem => ({
  id: toStringValue(row.id),
  orderId: toStringValue(row.orderId),
  productId: toStringValue(row.productId),
  quantity: toNumberValue(row.quantity),
  unitPrice: toNumberValue(row.unitPrice),
  discount: toNumberValue(row.discount),
  lineTotal: toNumberValue(row.lineTotal),
})

const mapPurchaseOrderRow = (row: Record<string, unknown>): PurchaseOrder => ({
  id: toStringValue(row.id),
  tenantId: toStringValue(row.tenantId),
  createdAt: toStringValue(row.createdAt, nowIso()),
  updatedAt: toStringValue(row.updatedAt, nowIso()),
  version: toNumberValue(row.version),
  supplierName: toStringValue(row.supplierName),
  status: toStringValue(row.status) as PurchaseOrder['status'],
  issuedDate: toStringValue(row.issuedDate, nowIso()),
  expectedDate: toOptionalString(row.expectedDate),
  subtotal: toNumberValue(row.subtotal),
  tax: toNumberValue(row.tax),
  total: toNumberValue(row.total),
  notes: toOptionalString(row.notes),
  addToInventory: row.addToInventory != null ? toBoolean(toNumberValue(row.addToInventory)) : true, // Default to true if not set
})

const mapPurchaseOrderItemRow = (row: Record<string, unknown>): PurchaseOrderItem => ({
  id: toStringValue(row.id),
  orderId: toStringValue(row.orderId),
  productId: toStringValue(row.productId),
  quantity: toNumberValue(row.quantity),
  unitCost: toNumberValue(row.unitCost),
  lineTotal: toNumberValue(row.lineTotal),
})

const tableCreators = [
  `CREATE TABLE customers (
      id TEXT PRIMARY KEY,
      tenantId TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      version INTEGER,
      balance REAL,
      isArchived INTEGER,
      name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      state TEXT,
      notes TEXT,
      type TEXT
    );`,
  `CREATE TABLE products (
      id TEXT PRIMARY KEY,
      tenantId TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      version INTEGER,
      sku TEXT,
      barcode TEXT,
      title TEXT,
      description TEXT,
      mrp REAL,
      salePrice REAL,
      price REAL,
      cost REAL,
      defaultDiscount REAL,
      defaultDiscountType TEXT,
      unitId TEXT,
      stockOnHand REAL,
      reorderLevel REAL,
      isArchived INTEGER
    );`,
  `CREATE TABLE sales_orders (
      id TEXT PRIMARY KEY,
      tenantId TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      version INTEGER,
      customerId TEXT,
      status TEXT,
      issuedDate TEXT,
      dueDate TEXT,
      subtotal REAL,
      discount REAL,
      discountType TEXT,
      tax REAL,
      total REAL,
      notes TEXT
    );`,
  `CREATE TABLE sales_order_items (
      id TEXT PRIMARY KEY,
      orderId TEXT,
      productId TEXT,
      quantity REAL,
      unitPrice REAL,
      discount REAL,
      lineTotal REAL
    );`,
  `CREATE TABLE purchase_orders (
      id TEXT PRIMARY KEY,
      tenantId TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      version INTEGER,
      supplierName TEXT,
      status TEXT,
      issuedDate TEXT,
      expectedDate TEXT,
      subtotal REAL,
      tax REAL,
      total REAL,
      notes TEXT,
      addToInventory INTEGER
    );`,
  `CREATE TABLE purchase_order_items (
      id TEXT PRIMARY KEY,
      orderId TEXT,
      productId TEXT,
      quantity REAL,
      unitCost REAL,
      lineTotal REAL
    );`,
  `CREATE TABLE sync_metadata (
      exportedAt TEXT
    );`,
]

const insertCustomers = (db: Database, customers: Customer[]) => {
  const stmt = db.prepare(
    `INSERT INTO customers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      tenantId=excluded.tenantId,
      createdAt=excluded.createdAt,
      updatedAt=excluded.updatedAt,
      version=excluded.version,
      balance=excluded.balance,
      isArchived=excluded.isArchived,
      name=excluded.name,
      email=excluded.email,
      phone=excluded.phone,
      address=excluded.address,
      state=excluded.state,
      notes=excluded.notes,
      type=excluded.type`,
  )
  customers.forEach((customer) => {
    stmt.run([
      customer.id,
      customer.tenantId,
      customer.createdAt,
      customer.updatedAt,
      customer.version,
      customer.balance,
      customer.isArchived ? 1 : 0,
      customer.name,
      customer.email ?? null,
      customer.phone ?? null,
      customer.address ?? null,
      customer.state ?? null,
      customer.notes ?? null,
      customer.type,
    ])
  })
  stmt.free()
}

const insertProducts = (db: Database, products: Product[]) => {
  const stmt = db.prepare(
    `INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      tenantId=excluded.tenantId,
      createdAt=excluded.createdAt,
      updatedAt=excluded.updatedAt,
      version=excluded.version,
      sku=excluded.sku,
      barcode=excluded.barcode,
      title=excluded.title,
      description=excluded.description,
      mrp=excluded.mrp,
      salePrice=excluded.salePrice,
      price=excluded.price,
      cost=excluded.cost,
      defaultDiscount=excluded.defaultDiscount,
      defaultDiscountType=excluded.defaultDiscountType,
      unitId=excluded.unitId,
      stockOnHand=excluded.stockOnHand,
      reorderLevel=excluded.reorderLevel,
      isArchived=excluded.isArchived`,
  )
  products.forEach((product) => {
    stmt.run([
      product.id,
      product.tenantId,
      product.createdAt,
      product.updatedAt,
      product.version,
      product.sku,
      product.barcode ?? null,
      product.title,
      product.description ?? null,
      product.mrp,
      product.salePrice,
      product.price,
      product.cost,
      product.defaultDiscount,
      product.defaultDiscountType,
      product.unitId ?? null,
      product.stockOnHand,
      product.reorderLevel ?? null,
      product.isArchived ? 1 : 0,
    ])
  })
  stmt.free()
}

const insertSalesOrders = (db: Database, salesOrders: SalesOrder[]) => {
  const stmt = db.prepare(
    `INSERT INTO sales_orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      tenantId=excluded.tenantId,
      createdAt=excluded.createdAt,
      updatedAt=excluded.updatedAt,
      version=excluded.version,
      customerId=excluded.customerId,
      status=excluded.status,
      issuedDate=excluded.issuedDate,
      dueDate=excluded.dueDate,
      subtotal=excluded.subtotal,
      discount=excluded.discount,
      discountType=excluded.discountType,
      tax=excluded.tax,
      total=excluded.total,
      notes=excluded.notes`,
  )
  salesOrders.forEach((order) => {
    stmt.run([
      order.id,
      order.tenantId,
      order.createdAt,
      order.updatedAt,
      order.version,
      order.customerId,
      order.status,
      order.issuedDate,
      order.dueDate ?? null,
      order.subtotal,
      order.discount,
      order.discountType,
      order.tax,
      order.total,
      order.notes ?? null,
    ])
  })
  stmt.free()
}

const insertSalesOrderItems = (db: Database, items: SalesOrderItem[]) => {
  const stmt = db.prepare(
    `INSERT INTO sales_order_items VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      orderId=excluded.orderId,
      productId=excluded.productId,
      quantity=excluded.quantity,
      unitPrice=excluded.unitPrice,
      discount=excluded.discount,
      lineTotal=excluded.lineTotal`,
  )
  items.forEach((item) => {
    stmt.run([
      item.id,
      item.orderId,
      item.productId,
      item.quantity,
      item.unitPrice,
      item.discount,
      item.lineTotal,
    ])
  })
  stmt.free()
}

const insertPurchaseOrders = (db: Database, purchaseOrders: PurchaseOrder[]) => {
  const stmt = db.prepare(
    `INSERT INTO purchase_orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      tenantId=excluded.tenantId,
      createdAt=excluded.createdAt,
      updatedAt=excluded.updatedAt,
      version=excluded.version,
      supplierName=excluded.supplierName,
      status=excluded.status,
      issuedDate=excluded.issuedDate,
      expectedDate=excluded.expectedDate,
      subtotal=excluded.subtotal,
      tax=excluded.tax,
      total=excluded.total,
      notes=excluded.notes,
      addToInventory=excluded.addToInventory`,
  )
  purchaseOrders.forEach((order) => {
    stmt.run([
      order.id,
      order.tenantId,
      order.createdAt,
      order.updatedAt,
      order.version,
      order.supplierName,
      order.status,
      order.issuedDate,
      order.expectedDate ?? null,
      order.subtotal,
      order.tax,
      order.total,
      order.notes ?? null,
      order.addToInventory ?? true ? 1 : 0,
    ])
  })
  stmt.free()
}

const insertPurchaseOrderItems = (db: Database, items: PurchaseOrderItem[]) => {
  const stmt = db.prepare(
    `INSERT INTO purchase_order_items VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      orderId=excluded.orderId,
      productId=excluded.productId,
      quantity=excluded.quantity,
      unitCost=excluded.unitCost,
      lineTotal=excluded.lineTotal`,
  )
  items.forEach((item) => {
    stmt.run([item.id, item.orderId, item.productId, item.quantity, item.unitCost, item.lineTotal])
  })
  stmt.free()
}

const selectAll = (db: Database, query: string): Array<Record<string, unknown>> => {
  const results = db.exec(query)
  if (!results.length) return []
  const { columns, values } = results[0]
  return values.map((row) => {
    const record: Record<string, unknown> = {}
    columns.forEach((column, index) => {
      record[column] = row[index]
    })
    return record
  })
}

export const snapshotToSqliteZip = async (snapshot: SyncSnapshot) => {
  const SQL = await getSqlModule()
  const db = new SQL.Database()
  tableCreators.forEach((ddl) => db.run(ddl))

  insertCustomers(db, snapshot.customers)
  insertProducts(db, snapshot.products)
  insertSalesOrders(db, snapshot.salesOrders)
  insertSalesOrderItems(db, snapshot.salesOrderItems)
  insertPurchaseOrders(db, snapshot.purchaseOrders)
  insertPurchaseOrderItems(db, snapshot.purchaseOrderItems)

  const metaStmt = db.prepare('INSERT INTO sync_metadata (exportedAt) VALUES (?)')
  metaStmt.run([snapshot.exportedAt ?? nowIso()])
  metaStmt.free()

  const sqliteBinary = db.export()
  db.close()

  const archive = zipSync({ 'bookstore-erp.sqlite': sqliteBinary })
  return archive
}

export const sqliteZipToSnapshot = async (archive: Uint8Array): Promise<SyncSnapshot> => {
  const SQL = await getSqlModule()
  const unzipped = unzipSync(archive)
  const [sqliteFile] = Object.keys(unzipped)
  if (!sqliteFile) {
    throw new Error('Uploaded archive did not contain a SQLite database')
  }

  const sqliteBinary = unzipped[sqliteFile]
  const db = new SQL.Database(sqliteBinary)

  const customers = selectAll(db, 'SELECT * FROM customers').map((row) => mapCustomerRow(row))

  const products = selectAll(db, 'SELECT * FROM products').map((row) => mapProductRow(row))

  const salesOrders = selectAll(db, 'SELECT * FROM sales_orders').map((row) => mapSalesOrderRow(row))

  const salesOrderItems = selectAll(db, 'SELECT * FROM sales_order_items').map((row) => mapSalesOrderItemRow(row))

  const purchaseOrders = selectAll(db, 'SELECT * FROM purchase_orders').map((row) => mapPurchaseOrderRow(row))

  const purchaseOrderItems = selectAll(db, 'SELECT * FROM purchase_order_items').map((row) =>
    mapPurchaseOrderItemRow(row),
  )

  const metadataRow = selectAll(db, 'SELECT exportedAt FROM sync_metadata LIMIT 1')[0]
  const metadata = metadataRow as { exportedAt?: string } | undefined
  db.close()

  const exportedAt = metadata?.exportedAt ?? nowIso()

  return {
    exportedAt,
    customers,
    products,
    salesOrders,
    salesOrderItems,
    purchaseOrders,
    purchaseOrderItems,
    syncQueue: [] as SyncRecord[],
  }
}

