import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adjustProductStock, createProduct, listProducts, updateProduct } from '../db/localDataService'
import type { Product } from '../db/schema'

const PRODUCTS_KEY = ['products']

export const useProducts = () =>
  useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: listProducts,
  })

export const useCreateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      queryClient.setQueryData<Product[]>(PRODUCTS_KEY, (previous) => (previous ? [...previous, product] : [product]))
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
    },
  })
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Parameters<typeof updateProduct>[1]) =>
      updateProduct(id, input),
    onSuccess: (product) => {
      queryClient.setQueryData<Product[]>(PRODUCTS_KEY, (previous) =>
        previous ? previous.map((item) => (item.id === product.id ? product : item)) : [product],
      )
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
    },
  })
}

export const useAdjustProductStock = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => adjustProductStock(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
    },
  })
}

