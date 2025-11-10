import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createSalesOrder, listSalesOrders } from '../db/localDataService'
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
    },
  })
}

