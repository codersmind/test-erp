import { useQuery } from '@tanstack/react-query'
import { getLowStockProducts, getEarningsByDateRange, getTotalCustomerDueAmount } from '../db/localDataService'
import type { Product } from '../db/schema'

export const useLowStockProducts = () =>
  useQuery<Product[]>({
    queryKey: ['dashboard', 'lowStock'],
    queryFn: getLowStockProducts,
  })

export const useEarningsByDateRange = (startDate: string, endDate: string, groupBy: 'day' | 'month' | 'year' = 'day') =>
  useQuery({
    queryKey: ['dashboard', 'earnings', startDate, endDate, groupBy],
    queryFn: () => getEarningsByDateRange(startDate, endDate, groupBy),
    enabled: !!startDate && !!endDate,
  })

export const useTotalCustomerDue = () =>
  useQuery({
    queryKey: ['dashboard', 'customerDue'],
    queryFn: getTotalCustomerDueAmount,
  })

