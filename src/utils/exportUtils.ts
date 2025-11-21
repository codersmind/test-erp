import * as XLSX from 'xlsx'
import type { Customer, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem } from '../db/schema'
import { db } from '../db/database'

export interface DateFilter {
  startDate?: string
  endDate?: string
}

// Filter customers by date range
const filterCustomersByDate = (customers: Customer[], dateFilter?: DateFilter): Customer[] => {
  if (!dateFilter || (!dateFilter.startDate && !dateFilter.endDate)) {
    return customers
  }

  return customers.filter((customer) => {
    const createdAt = new Date(customer.createdAt)
    const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null
    const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null

    if (startDate && endDate) {
      return createdAt >= startDate && createdAt <= endDate
    } else if (startDate) {
      return createdAt >= startDate
    } else if (endDate) {
      return createdAt <= endDate
    }
    return true
  })
}

// Filter orders by date range
const filterOrdersByDate = <T extends SalesOrder | PurchaseOrder>(
  orders: T[],
  dateFilter?: DateFilter,
): T[] => {
  if (!dateFilter || (!dateFilter.startDate && !dateFilter.endDate)) {
    return orders
  }

  return orders.filter((order) => {
    const issuedDate = new Date(order.issuedDate)
    const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null
    const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null

    if (startDate && endDate) {
      return issuedDate >= startDate && issuedDate <= endDate
    } else if (startDate) {
      return issuedDate >= startDate
    } else if (endDate) {
      return issuedDate <= endDate
    }
    return true
  })
}

// Export customers to Excel
export const exportCustomersToExcel = async (
  customers: Customer[],
  filename: string = 'customers',
  dateFilter?: DateFilter,
) => {
  const filteredCustomers = filterCustomersByDate(customers, dateFilter)
  const worksheet = XLSX.utils.json_to_sheet(
    filteredCustomers.map((customer) => ({
      'ID': customer.id,
      'Name': customer.name,
      'Type': customer.type === 'customer' ? 'Customer' : 'Supplier',
      'Email': customer.email || '',
      'Phone': customer.phone || '',
      'Address': customer.address || '',
      'State': customer.state || '',
      'GST Number': customer.gst || '',
      'Balance': customer.balance,
      'Notes': customer.notes || '',
      'Created At': new Date(customer.createdAt).toLocaleString(),
      'Updated At': new Date(customer.updatedAt).toLocaleString(),
    }))
  )

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

// Export customers to CSV
export const exportCustomersToCSV = async (
  customers: Customer[],
  filename: string = 'customers',
  dateFilter?: DateFilter,
) => {
  const filteredCustomers = filterCustomersByDate(customers, dateFilter)
  const headers = ['ID', 'Name', 'Type', 'Email', 'Phone', 'Address', 'State', 'GST Number', 'Balance', 'Notes', 'Created At', 'Updated At']
  const rows = filteredCustomers.map((customer) => [
    customer.id,
    customer.name,
    customer.type === 'customer' ? 'Customer' : 'Supplier',
    customer.email || '',
    customer.phone || '',
    customer.address || '',
    customer.state || '',
    customer.gst || '',
    customer.balance,
    customer.notes || '',
    new Date(customer.createdAt).toLocaleString(),
    new Date(customer.updatedAt).toLocaleString(),
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Export sales orders to Excel
export const exportSalesOrdersToExcel = async (
  orders: SalesOrder[],
  filename: string = 'sales_orders',
  dateFilter?: DateFilter,
) => {
  const filteredOrders = filterOrdersByDate(orders, dateFilter)
  // Get all order items
  const allItems = await db.salesOrderItems.toArray()
  const itemsMap = new Map<string, SalesOrderItem[]>()
  allItems.forEach((item) => {
    if (!itemsMap.has(item.orderId)) {
      itemsMap.set(item.orderId, [])
    }
    itemsMap.get(item.orderId)!.push(item)
  })

  // Get all products for product names
  const allProducts = await db.products.toArray()
  const productsMap = new Map(allProducts.map((p) => [p.id, p]))

  // Get all customers for customer names
  const allCustomers = await db.customers.toArray()
  const customersMap = new Map(allCustomers.map((c) => [c.id, c]))

  // Main orders sheet
  const ordersData = filteredOrders.map((order) => {
    const customer = customersMap.get(order.customerId)
    const items = itemsMap.get(order.id) || []
    const itemDetails = items
      .map((item) => {
        const product = productsMap.get(item.productId)
        return `${product?.title || item.productId} (Qty: ${item.quantity})`
      })
      .join('; ')

    return {
      'Order ID': order.id,
      'Customer': customer?.name || 'N/A',
      'Customer ID': order.customerId,
      'Status': order.status,
      'Issue Date': new Date(order.issuedDate).toLocaleDateString(),
      'Due Date': order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '',
      'Subtotal': order.subtotal,
      'Discount': order.discount,
      'Tax': order.tax,
      'Tax Type': order.taxType || '',
      'CGST': order.cgst || 0,
      'SGST': order.sgst || 0,
      'Total': order.total,
      'Paid Amount': order.paidAmount || 0,
      'Due Amount': order.total - (order.paidAmount || 0),
      'Items Count': items.length,
      'Items': itemDetails,
      'Notes': order.notes || '',
      'Created At': new Date(order.createdAt).toLocaleString(),
      'Updated At': new Date(order.updatedAt).toLocaleString(),
    }
  })

  // Order items sheet
  const itemsData = filteredOrders.flatMap((order) => {
    const items = itemsMap.get(order.id) || []
    return items.map((item) => {
      const product = productsMap.get(item.productId)
      const customer = customersMap.get(order.customerId)
      return {
        'Order ID': order.id,
        'Order Date': new Date(order.issuedDate).toLocaleDateString(),
        'Customer': customer?.name || 'N/A',
        'Product ID': item.productId,
        'Product Name': product?.title || 'N/A',
        'SKU': product?.sku || '',
        'Quantity': item.quantity,
        'Unit Price': item.unitPrice,
        'Discount': item.discount,
        'Line Total': item.lineTotal,
      }
    })
  })

  const workbook = XLSX.utils.book_new()
  const ordersSheet = XLSX.utils.json_to_sheet(ordersData)
  const itemsSheet = XLSX.utils.json_to_sheet(itemsData)

  XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Sales Orders')
  XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Order Items')

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

// Export sales orders to CSV
export const exportSalesOrdersToCSV = async (
  orders: SalesOrder[],
  filename: string = 'sales_orders',
  dateFilter?: DateFilter,
) => {
  const filteredOrders = filterOrdersByDate(orders, dateFilter)
  // Get all order items
  const allItems = await db.salesOrderItems.toArray()
  const itemsMap = new Map<string, SalesOrderItem[]>()
  allItems.forEach((item) => {
    if (!itemsMap.has(item.orderId)) {
      itemsMap.set(item.orderId, [])
    }
    itemsMap.get(item.orderId)!.push(item)
  })

  // Get all customers for customer names
  const allCustomers = await db.customers.toArray()
  const customersMap = new Map(allCustomers.map((c) => [c.id, c]))

  const headers = [
    'Order ID',
    'Customer',
    'Status',
    'Issue Date',
    'Due Date',
    'Subtotal',
    'Discount',
    'Tax',
    'Total',
    'Paid Amount',
    'Due Amount',
    'Items Count',
    'Notes',
    'Created At',
    'Updated At',
  ]

  const rows = filteredOrders.map((order) => {
    const customer = customersMap.get(order.customerId)
    const items = itemsMap.get(order.id) || []
    return [
      order.id,
      customer?.name || 'N/A',
      order.status,
      new Date(order.issuedDate).toLocaleDateString(),
      order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '',
      order.subtotal,
      order.discount,
      order.tax,
      order.total,
      order.paidAmount || 0,
      order.total - (order.paidAmount || 0),
      items.length,
      order.notes || '',
      new Date(order.createdAt).toLocaleString(),
      new Date(order.updatedAt).toLocaleString(),
    ]
  })

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Export purchase orders to Excel
export const exportPurchaseOrdersToExcel = async (
  orders: PurchaseOrder[],
  filename: string = 'purchase_orders',
  dateFilter?: DateFilter,
) => {
  const filteredOrders = filterOrdersByDate(orders, dateFilter)
  // Get all order items
  const allItems = await db.purchaseOrderItems.toArray()
  const itemsMap = new Map<string, PurchaseOrderItem[]>()
  allItems.forEach((item) => {
    if (!itemsMap.has(item.orderId)) {
      itemsMap.set(item.orderId, [])
    }
    itemsMap.get(item.orderId)!.push(item)
  })

  // Get all products for product names
  const allProducts = await db.products.toArray()
  const productsMap = new Map(allProducts.map((p) => [p.id, p]))

  // Main orders sheet
  const ordersData = filteredOrders.map((order) => {
    const items = itemsMap.get(order.id) || []
    const itemDetails = items
      .map((item) => {
        const product = productsMap.get(item.productId)
        return `${product?.title || item.productId} (Qty: ${item.quantity})`
      })
      .join('; ')

    return {
      'Order ID': order.id,
      'Supplier': order.supplierName,
      'Status': order.status,
      'Issue Date': new Date(order.issuedDate).toLocaleDateString(),
      'Expected Date': order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '',
      'Due Date': order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '',
      'Subtotal': order.subtotal,
      'Tax': order.tax,
      'Tax Type': order.taxType || '',
      'CGST': order.cgst || 0,
      'SGST': order.sgst || 0,
      'Total': order.total,
      'Paid Amount': order.paidAmount || 0,
      'Due Amount': order.total - (order.paidAmount || 0),
      'Items Count': items.length,
      'Items': itemDetails,
      'Add to Inventory': order.addToInventory ? 'Yes' : 'No',
      'Notes': order.notes || '',
      'Created At': new Date(order.createdAt).toLocaleString(),
      'Updated At': new Date(order.updatedAt).toLocaleString(),
    }
  })

  // Order items sheet
  const itemsData = filteredOrders.flatMap((order) => {
    const items = itemsMap.get(order.id) || []
    return items.map((item) => {
      const product = productsMap.get(item.productId)
      return {
        'Order ID': order.id,
        'Order Date': new Date(order.issuedDate).toLocaleDateString(),
        'Supplier': order.supplierName,
        'Product ID': item.productId,
        'Product Name': product?.title || 'N/A',
        'SKU': product?.sku || '',
        'Quantity': item.quantity,
        'Unit Cost': item.unitCost,
        'Line Total': item.lineTotal,
      }
    })
  })

  const workbook = XLSX.utils.book_new()
  const ordersSheet = XLSX.utils.json_to_sheet(ordersData)
  const itemsSheet = XLSX.utils.json_to_sheet(itemsData)

  XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Purchase Orders')
  XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Order Items')

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

// Export purchase orders to CSV
export const exportPurchaseOrdersToCSV = async (
  orders: PurchaseOrder[],
  filename: string = 'purchase_orders',
  dateFilter?: DateFilter,
) => {
  const filteredOrders = filterOrdersByDate(orders, dateFilter)
  // Get all order items
  const allItems = await db.purchaseOrderItems.toArray()
  const itemsMap = new Map<string, PurchaseOrderItem[]>()
  allItems.forEach((item) => {
    if (!itemsMap.has(item.orderId)) {
      itemsMap.set(item.orderId, [])
    }
    itemsMap.get(item.orderId)!.push(item)
  })

  const headers = [
    'Order ID',
    'Supplier',
    'Status',
    'Issue Date',
    'Expected Date',
    'Due Date',
    'Subtotal',
    'Tax',
    'Total',
    'Paid Amount',
    'Due Amount',
    'Items Count',
    'Add to Inventory',
    'Notes',
    'Created At',
    'Updated At',
  ]

  const rows = filteredOrders.map((order) => {
    const items = itemsMap.get(order.id) || []
    return [
      order.id,
      order.supplierName,
      order.status,
      new Date(order.issuedDate).toLocaleDateString(),
      order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '',
      order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '',
      order.subtotal,
      order.tax,
      order.total,
      order.paidAmount || 0,
      order.total - (order.paidAmount || 0),
      items.length,
      order.addToInventory ? 'Yes' : 'No',
      order.notes || '',
      new Date(order.createdAt).toLocaleString(),
      new Date(order.updatedAt).toLocaleString(),
    ]
  })

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

