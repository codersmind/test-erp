import Dexie, { type Table } from 'dexie'

import type {
  Customer,
  Invoice,
  Payment,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  SalesOrder,
  SalesOrderItem,
  SyncRecord,
} from './schema'

export class ErpDatabase extends Dexie {
  customers!: Table<Customer, string>
  products!: Table<Product, string>
  salesOrders!: Table<SalesOrder, string>
  salesOrderItems!: Table<SalesOrderItem, string>
  purchaseOrders!: Table<PurchaseOrder, string>
  purchaseOrderItems!: Table<PurchaseOrderItem, string>
  invoices!: Table<Invoice, string>
  payments!: Table<Payment, string>
  syncQueue!: Table<SyncRecord, string>

  constructor() {
    super('erp_offline_db')

    this.version(4)
      .stores({
        customers: 'id, tenantId, type, name, updatedAt, isArchived',
        products: 'id, tenantId, sku, barcode, title, updatedAt, isArchived',
        salesOrders: 'id, tenantId, customerId, status, issuedDate, updatedAt',
        salesOrderItems: 'id, orderId, productId',
        purchaseOrders: 'id, tenantId, supplierName, status, issuedDate, updatedAt',
        purchaseOrderItems: 'id, orderId, productId',
        invoices: 'id, tenantId, invoiceNumber, salesOrderId, customerId, status, issuedDate, dueDate',
        payments: 'id, tenantId, invoiceId, customerId, paymentDate',
        syncQueue: 'id, entity, entityId, timestamp, syncedAt',
      })
      .upgrade(async (transaction) => {
        // Set default type to 'customer' for existing customers
        await transaction.table('customers').toCollection().modify((customer) => {
          if (customer.type === undefined) {
            customer.type = 'customer'
          }
        })
      })

    this.version(3).stores({
      customers: 'id, tenantId, type, name, updatedAt, isArchived',
      products: 'id, tenantId, sku, barcode, title, updatedAt, isArchived',
      salesOrders: 'id, tenantId, customerId, status, issuedDate, updatedAt',
      salesOrderItems: 'id, orderId, productId',
      purchaseOrders: 'id, tenantId, supplierName, status, issuedDate, updatedAt',
      purchaseOrderItems: 'id, orderId, productId',
      invoices: 'id, tenantId, invoiceNumber, salesOrderId, customerId, status, issuedDate, dueDate',
      payments: 'id, tenantId, invoiceId, customerId, paymentDate',
      syncQueue: 'id, entity, entityId, timestamp, syncedAt',
    })

    this.version(2).stores({
      customers: 'id, tenantId, name, updatedAt, isArchived',
      products: 'id, tenantId, sku, barcode, title, updatedAt, isArchived',
      salesOrders: 'id, tenantId, customerId, status, issuedDate, updatedAt',
      salesOrderItems: 'id, orderId, productId',
      purchaseOrders: 'id, tenantId, supplierName, status, issuedDate, updatedAt',
      purchaseOrderItems: 'id, orderId, productId',
      syncQueue: 'id, entity, entityId, timestamp, syncedAt',
    })

    this.version(1).stores({
      customers: 'id, tenantId, name, updatedAt, isArchived',
      products: 'id, tenantId, sku, barcode, updatedAt, isArchived',
      salesOrders: 'id, tenantId, customerId, status, issuedDate, updatedAt',
      salesOrderItems: 'id, orderId, productId',
      purchaseOrders: 'id, tenantId, supplierName, status, issuedDate, updatedAt',
      purchaseOrderItems: 'id, orderId, productId',
      syncQueue: 'id, entity, entityId, timestamp, syncedAt',
    }).upgrade(async (transaction) => {
      await transaction.table('products').toCollection().modify((product) => {
        if (product.title === undefined) {
          product.title = product.sku ?? 'Untitled product'
        }
      })
    })
  }
}

export const db = new ErpDatabase()

