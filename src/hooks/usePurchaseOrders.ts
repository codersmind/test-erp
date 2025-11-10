import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createPurchaseOrder, listPurchaseOrders } from '../db/localDataService'
import type { PurchaseOrder } from '../db/schema'

const PURCHASE_ORDERS_KEY = ['purchaseOrders']

export const usePurchaseOrders = () =>
  useQuery({
    queryKey: PURCHASE_ORDERS_KEY,
    queryFn: listPurchaseOrders,
  })

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: ({ purchaseOrder }) => {
      queryClient.setQueryData<PurchaseOrder[]>(PURCHASE_ORDERS_KEY, (previous) =>
        previous ? [purchaseOrder, ...previous] : [purchaseOrder],
      )
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY })
    },
  })
}

