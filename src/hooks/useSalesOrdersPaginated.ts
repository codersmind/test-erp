import { useQuery, keepPreviousData } from '@tanstack/react-query'

import { listSalesOrdersPaginated } from '../db/localDataService'
import type { SalesOrder } from '../db/schema'

export interface PaginatedSalesOrdersResult {
  items: SalesOrder[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const useSalesOrdersPaginated = (
  page: number,
  pageSize: number,
  filters?: { customerId?: string; startDate?: string; endDate?: string } | undefined,
) =>
  useQuery<PaginatedSalesOrdersResult>({
    queryKey: ['salesOrders', 'paginated', page, pageSize, filters],
    queryFn: () => listSalesOrdersPaginated(page, pageSize, filters),
    placeholderData: keepPreviousData,
  })

