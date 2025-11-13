import { get, set } from 'idb-keyval'

export type OrderIdFormat = 'random' | 'manual'

export interface OrderIdSettings {
  salesOrderFormat: OrderIdFormat
  salesOrderPrefix: string // e.g., "SO-"
  salesOrderLastNumber: number // Last used number for auto-increment
  purchaseOrderFormat: OrderIdFormat
  purchaseOrderPrefix: string // e.g., "PO-"
  purchaseOrderLastNumber: number // Last used number for auto-increment
}

const ORDER_ID_SETTINGS_KEY = 'erp_order_id_settings'

const DEFAULT_ORDER_ID_SETTINGS: OrderIdSettings = {
  salesOrderFormat: 'random',
  salesOrderPrefix: 'SO-',
  salesOrderLastNumber: 0,
  purchaseOrderFormat: 'random',
  purchaseOrderPrefix: 'PO-',
  purchaseOrderLastNumber: 0,
}

export const getOrderIdSettings = async (): Promise<OrderIdSettings> => {
  const settings = await get<OrderIdSettings>(ORDER_ID_SETTINGS_KEY)
  return settings ?? DEFAULT_ORDER_ID_SETTINGS
}

export const setOrderIdSettings = async (settings: OrderIdSettings): Promise<void> => {
  await set(ORDER_ID_SETTINGS_KEY, settings)
}

/**
 * Generate next order ID based on settings
 * @param type 'sales' or 'purchase'
 * @returns Generated order ID
 */
export const generateOrderId = async (type: 'sales' | 'purchase'): Promise<string> => {
  const settings = await getOrderIdSettings()
  const format = type === 'sales' ? settings.salesOrderFormat : settings.purchaseOrderFormat
  const prefix = type === 'sales' ? settings.salesOrderPrefix : settings.purchaseOrderPrefix
  const lastNumber = type === 'sales' ? settings.salesOrderLastNumber : settings.purchaseOrderLastNumber

  if (format === 'random') {
    const { nanoid } = await import('nanoid')
    return nanoid()
  }

  // Manual format with auto-increment
  const nextNumber = lastNumber + 1
  const paddedNumber = String(nextNumber).padStart(3, '0') // e.g., 001, 002, 010, 100
  const orderId = `${prefix}${paddedNumber}`

  // Update last number in settings
  if (type === 'sales') {
    await setOrderIdSettings({
      ...settings,
      salesOrderLastNumber: nextNumber,
    })
  } else {
    await setOrderIdSettings({
      ...settings,
      purchaseOrderLastNumber: nextNumber,
    })
  }

  return orderId
}

/**
 * Parse order number from an order ID (for manual format)
 * Returns null if not in manual format
 */
export const parseOrderNumber = (orderId: string, prefix: string): number | null => {
  if (!orderId.startsWith(prefix)) return null
  const numberPart = orderId.slice(prefix.length)
  const number = Number.parseInt(numberPart, 10)
  return Number.isNaN(number) ? null : number
}

/**
 * Initialize order number from existing orders
 * This should be called on app startup to sync with existing orders
 * Checks all orders to find the highest number matching the prefix
 */
export const initializeOrderNumbers = async (): Promise<void> => {
  const { db } = await import('../db/database')
  const settings = await getOrderIdSettings()

  // Get all sales orders and find the highest number matching the prefix
  const salesOrders = await db.salesOrders.toArray()
  let maxSalesNumber = settings.salesOrderLastNumber
  for (const order of salesOrders) {
    const number = parseOrderNumber(order.id, settings.salesOrderPrefix)
    if (number !== null && number > maxSalesNumber) {
      maxSalesNumber = number
    }
  }
  if (maxSalesNumber > settings.salesOrderLastNumber) {
    await setOrderIdSettings({
      ...settings,
      salesOrderLastNumber: maxSalesNumber,
    })
  }

  // Get all purchase orders and find the highest number matching the prefix
  const purchaseOrders = await db.purchaseOrders.toArray()
  let maxPurchaseNumber = settings.purchaseOrderLastNumber
  for (const order of purchaseOrders) {
    const number = parseOrderNumber(order.id, settings.purchaseOrderPrefix)
    if (number !== null && number > maxPurchaseNumber) {
      maxPurchaseNumber = number
    }
  }
  if (maxPurchaseNumber > settings.purchaseOrderLastNumber) {
    const updatedSettings = await getOrderIdSettings() // Get fresh settings in case sales was updated
    await setOrderIdSettings({
      ...updatedSettings,
      purchaseOrderLastNumber: maxPurchaseNumber,
    })
  }
}

