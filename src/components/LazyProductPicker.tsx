import { useEffect, useMemo, useRef, useState } from 'react'

import { searchProducts } from '../db/localDataService'
import type { Product } from '../db/schema'

interface LazyProductPickerProps {
  value: string
  onChange: (productId: string) => void
  onQuickCreate?: () => void
  onSearchStart?: () => void
  onSearchEnd?: () => void
  placeholder?: string
  className?: string
}

export const LazyProductPicker = ({
  value,
  onChange,
  onQuickCreate,
  onSearchStart,
  onSearchEnd,
  placeholder = 'Search products...',
  className = '',
}: LazyProductPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const isSearchingRef = useRef(false)
  const previousValueRef = useRef<string>(value)

  // Update ref when value changes
  useEffect(() => {
    previousValueRef.current = value
  }, [value])

  useEffect(() => {
    if (!isOpen) return

    const loadProducts = async () => {
      setIsLoading(true)
      try {
        const results = await searchProducts(searchQuery || '', 20)
        setProducts(results)
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(loadProducts, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, isOpen])

  const selectedProduct = useMemo(() => products.find((p) => p.id === value), [products, value])

  const handleSelect = (productId: string) => {
    isSearchingRef.current = false
    onChange(productId)
    setIsOpen(false)
    setSearchQuery('') // Clear search query when a product is selected
    onSearchEnd?.() // Notify that search has ended
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery || (selectedProduct ? `${selectedProduct.title} - ${(selectedProduct.salePrice ?? selectedProduct.price ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'INR' })}` : '')}
            onChange={(event) => {
              const newQuery = event.target.value
              const wasSearching = !!searchQuery
              const hadValue = !!value
              const isStartingSearch = newQuery && !wasSearching && hadValue
              
              // When user starts typing to search on an existing product, notify parent
              if (isStartingSearch) {
                isSearchingRef.current = true
                onSearchStart?.()
                // Clear the productId to allow searching
                setTimeout(() => {
                  onChange('')
                }, 10)
              }
              
              setSearchQuery(newQuery)
              setIsOpen(true)
              
              // If user clears the search query completely
              if (!newQuery) {
                if (wasSearching) {
                  // User was searching and cleared it - keep it cleared
                  isSearchingRef.current = false
                  onSearchEnd?.()
                  onChange('')
                } else if (hadValue && !wasSearching) {
                  // User selected all text and deleted it - clear the product
                  onChange('')
                }
              }
            }}
            onFocus={() => {
              setIsOpen(true)
              // When focusing, if there's a selected product, allow typing to search
              // but don't clear the selection yet
            }}
            onBlur={() => {
              // Reset search query on blur to restore selected product display
              // Use setTimeout to allow handleSelect to complete first
              setTimeout(() => {
                if (value) {
                  setSearchQuery('')
                }
              }, 200)
            }}
            placeholder={placeholder}
            className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 ${className}`}
          />
          {isOpen && (products.length > 0 || isLoading || searchQuery) && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {isLoading ? (
                <div className="px-3 py-2 text-sm text-slate-500">Loading...</div>
              ) : products.length > 0 ? (
                <>
                  {products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelect(product.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <div className="font-medium">{product.title}</div>
                      <div className="text-xs text-slate-500">
                        {product.sku} · MRP:{' '}
                        {(product.mrp ?? product.price ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        {' · '}Sale:{' '}
                        <span className="font-semibold">
                          {(product.salePrice ?? product.price ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                    </button>
                  ))}
                  {onQuickCreate && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        onQuickCreate()
                      }}
                      className="w-full border-t border-slate-200 px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      + Create new product
                    </button>
                  )}
                </>
              ) : searchQuery ? (
                <div className="px-3 py-2 text-sm text-slate-500">
                  No products found. {onQuickCreate && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        onQuickCreate()
                      }}
                      className="ml-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Create one?
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
        {onQuickCreate && (
          <button
            type="button"
            onClick={onQuickCreate}
            className="rounded-md border border-blue-600 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
          >
            + New
          </button>
        )}
      </div>
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false)
            // Only clear search query if no product is selected
            // If a product is selected, keep it displayed
            if (!value) {
              setSearchQuery('')
            } else {
              setSearchQuery('')
            }
          }}
        />
      )}
    </div>
  )
}

