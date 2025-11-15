import { useQuery, keepPreviousData } from '@tanstack/react-query'

import { listPurchaseOrdersPaginated } from '../db/localDataService'
import type { PurchaseOrder } from '../db/schema'

export interface PaginatedPurchaseOrdersResult {
  items: PurchaseOrder[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const usePurchaseOrdersPaginated = (
  page: number,
  pageSize: number,
  filters?: { supplierName?: string; startDate?: string; endDate?: string },
) =>
  useQuery<PaginatedPurchaseOrdersResult>({
    queryKey: ['purchaseOrders', 'paginated', page, pageSize, filters],
    queryFn: () => listPurchaseOrdersPaginated(page, pageSize, filters),
    placeholderData: keepPreviousData,
  })

