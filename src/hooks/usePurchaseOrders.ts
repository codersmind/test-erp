import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createPurchaseOrder, listPurchaseOrders, updatePurchaseOrderStatus, updatePurchaseOrderNotes } from '../db/localDataService'
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
      // Invalidate products queries to refresh stock after purchase order updates stock
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useUpdatePurchaseOrderStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PurchaseOrder['status'] }) =>
      updatePurchaseOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY })
      // Invalidate products queries to refresh stock after status change
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useUpdatePurchaseOrderNotes = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      updatePurchaseOrderNotes(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY })
    },
  })
}

