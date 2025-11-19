import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createSalesOrder, listSalesOrders, updateSalesOrderStatus, updateSalesOrderNotes } from '../db/localDataService'
import type { SalesOrder } from '../db/schema'

const SALES_ORDERS_KEY = ['salesOrders']

export const useSalesOrders = () =>
  useQuery({
    queryKey: SALES_ORDERS_KEY,
    queryFn: listSalesOrders,
  })

export const useCreateSalesOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSalesOrder,
    onSuccess: ({ salesOrder }) => {
      queryClient.setQueryData<SalesOrder[]>(SALES_ORDERS_KEY, (previous) =>
        previous ? [salesOrder, ...previous] : [salesOrder],
      )
      queryClient.invalidateQueries({ queryKey: SALES_ORDERS_KEY })
      // Invalidate products queries to refresh stock after sales order decreases stock
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useUpdateSalesOrderStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SalesOrder['status'] }) =>
      updateSalesOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_ORDERS_KEY })
      // Invalidate products queries to refresh stock after status change
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useUpdateSalesOrderNotes = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      updateSalesOrderNotes(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_ORDERS_KEY })
    },
  })
}

export const useDeleteSalesOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { deleteSalesOrder } = await import('../db/localDataService')
      return deleteSalesOrder(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_ORDERS_KEY })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

