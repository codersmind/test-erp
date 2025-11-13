import { useQuery } from '@tanstack/react-query'

import { listCustomersByType } from '../db/localDataService'
import type { CustomerType } from '../db/schema'

const CUSTOMERS_BY_TYPE_KEY = (type: CustomerType) => ['customers', type]

export const useCustomersByType = (type: CustomerType) =>
  useQuery({
    queryKey: CUSTOMERS_BY_TYPE_KEY(type),
    queryFn: () => listCustomersByType(type),
  })

