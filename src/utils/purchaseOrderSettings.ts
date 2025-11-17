import { get, set } from 'idb-keyval'

export interface PurchaseOrderSettings {
  defaultAddToInventory: boolean
}

const PURCHASE_ORDER_SETTINGS_KEY = 'erp_purchase_order_settings'

const DEFAULT_PURCHASE_ORDER_SETTINGS: PurchaseOrderSettings = {
  defaultAddToInventory: true,
}

export const getPurchaseOrderSettings = async (): Promise<PurchaseOrderSettings> => {
  const settings = await get<PurchaseOrderSettings>(PURCHASE_ORDER_SETTINGS_KEY)
  return settings ?? DEFAULT_PURCHASE_ORDER_SETTINGS
}

export const setPurchaseOrderSettings = async (settings: PurchaseOrderSettings): Promise<void> => {
  await set(PURCHASE_ORDER_SETTINGS_KEY, settings)
}

