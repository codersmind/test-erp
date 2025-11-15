import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createCustomer, listCustomers, updateCustomer } from '../db/localDataService'
import type { Customer } from '../db/schema'

const CUSTOMERS_KEY = ['customers']

export const useCustomers = () =>
  useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: listCustomers,
  })

export const useCreateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: (customer: Customer) => {
      queryClient.setQueryData<Customer[]>(CUSTOMERS_KEY, (previous) =>
        previous ? [...previous, customer] : [customer],
      )
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY })
      queryClient.invalidateQueries({ queryKey: ['customers', customer.type] })
    },
  })
}

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateCustomer>[1] }) =>
      updateCustomer(id, input),
    onSuccess: (customer: Customer) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY })
      queryClient.invalidateQueries({ queryKey: ['customers', customer.type] })
      queryClient.invalidateQueries({ queryKey: ['customers', 'paginated'] })
    },
  })
}

