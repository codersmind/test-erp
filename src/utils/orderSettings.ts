import { get, set } from 'idb-keyval'

export interface OrderSettings {
  defaultRoundFigure: boolean
}

const ORDER_SETTINGS_KEY = 'erp_order_settings'

const DEFAULT_ORDER_SETTINGS: OrderSettings = {
  defaultRoundFigure: false,
}

export const getOrderSettings = async (): Promise<OrderSettings> => {
  const settings = await get<OrderSettings>(ORDER_SETTINGS_KEY)
  return settings ?? DEFAULT_ORDER_SETTINGS
}

export const setOrderSettings = async (settings: OrderSettings): Promise<void> => {
  await set(ORDER_SETTINGS_KEY, settings)
}

