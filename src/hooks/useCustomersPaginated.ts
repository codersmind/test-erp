import { useQuery, keepPreviousData } from '@tanstack/react-query'

import { listCustomersByTypePaginated } from '../db/localDataService'
import type { Customer, CustomerType } from '../db/schema'

export interface PaginatedCustomersResult {
  items: Customer[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const useCustomersPaginated = (type: CustomerType, page: number, pageSize: number, searchQuery?: string) =>
  useQuery<PaginatedCustomersResult>({
    queryKey: ['customers', type, 'paginated', page, pageSize, searchQuery],
    queryFn: () => listCustomersByTypePaginated(type, page, pageSize, searchQuery),
    placeholderData: keepPreviousData,
  })

