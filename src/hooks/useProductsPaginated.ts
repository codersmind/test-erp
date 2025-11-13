import { useQuery, keepPreviousData } from '@tanstack/react-query'

import { listProductsPaginated } from '../db/localDataService'
import type { Product } from '../db/schema'

export interface PaginatedProductsResult {
  items: Product[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const useProductsPaginated = (page: number, pageSize: number, searchQuery?: string) =>
  useQuery<PaginatedProductsResult>({
    queryKey: ['products', 'paginated', page, pageSize, searchQuery],
    queryFn: () => listProductsPaginated(page, pageSize, searchQuery),
    placeholderData: keepPreviousData,
  })

