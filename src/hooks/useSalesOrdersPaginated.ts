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

export const useSalesOrdersPaginated = (page: number, pageSize: number) =>
  useQuery<PaginatedSalesOrdersResult>({
    queryKey: ['salesOrders', 'paginated', page, pageSize],
    queryFn: () => listSalesOrdersPaginated(page, pageSize),
    placeholderData: keepPreviousData,
  })

