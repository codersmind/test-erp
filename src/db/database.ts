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

    this.version(9)
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
      .upgrade(async () => {
        // Version 9: Added gst field to customers
        // This is an optional field, so existing customers will have undefined values
        // No migration needed - Dexie will handle missing fields automatically
      })

    this.version(8)
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
      .upgrade(async () => {
        // Version 8: Added taxType, cgst, sgst fields to salesOrders and purchaseOrders
        // These are optional fields, so existing orders will have undefined values
        // No migration needed - Dexie will handle missing fields automatically
      })

    this.version(7)
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
        // Migrate purchaseOrders: add addToInventory field (default to true for existing orders)
        await transaction.table('purchaseOrders').toCollection().modify((order) => {
          if (order.addToInventory === undefined) {
            order.addToInventory = true // Default to true for backward compatibility
          }
        })
      })

    this.version(6)
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
        // Migrate products: add unitId field
        await transaction.table('products').toCollection().modify((product) => {
          if (product.unitId === undefined) {
            product.unitId = undefined // Default to undefined, will use default unit from settings
          }
        })
      })

    this.version(5)
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
        // Migrate products: add mrp, salePrice, defaultDiscount fields
        await transaction.table('products').toCollection().modify((product) => {
          if (product.mrp === undefined) {
            product.mrp = product.price ?? 0
          }
          if (product.salePrice === undefined) {
            product.salePrice = product.price ?? 0
          }
          if (product.defaultDiscount === undefined) {
            product.defaultDiscount = 0
          }
          if (product.defaultDiscountType === undefined) {
            product.defaultDiscountType = 'amount'
          }
        })
        // Migrate salesOrders: add discount fields
        await transaction.table('salesOrders').toCollection().modify((order) => {
          if (order.discount === undefined) {
            order.discount = 0
          }
          if (order.discountType === undefined) {
            order.discountType = 'amount'
          }
        })
        // Migrate customers: add state field
        await transaction.table('customers').toCollection().modify((customer) => {
          if (customer.state === undefined) {
            customer.state = undefined
          }
        })
      })

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

