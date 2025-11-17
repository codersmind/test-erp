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

export type ProductSortField = 'title' | 'stockOnHand' | 'salePrice' | 'mrp' | 'createdAt'
export type SortOrder = 'asc' | 'desc'

export const useProductsPaginated = (
  page: number,
  pageSize: number,
  searchQuery?: string,
  sortBy?: ProductSortField,
  sortOrder?: SortOrder,
) =>
  useQuery<PaginatedProductsResult>({
    queryKey: ['products', 'paginated', page, pageSize, searchQuery, sortBy, sortOrder],
    queryFn: () => listProductsPaginated(page, pageSize, searchQuery, sortBy, sortOrder),
    placeholderData: keepPreviousData,
  })

