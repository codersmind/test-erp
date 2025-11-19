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
  // Ref to track the input element
  const inputRef = useRef<HTMLInputElement>(null)

  // UseMemo to find the selected product object
  const selectedProduct = useMemo(() => {
    // Look in the current products list first, or fallback if the list is empty/re-searched
    // NOTE: For production, you might need an additional 'fetchProductById' if not found in the search results
    return products.find((p) => p.id === value)
  }, [products, value])

  // Effect for debounced product search
  useEffect(() => {
    if (!isOpen) return

    const loadProducts = async () => {
      if (isSearchingRef.current || searchQuery) {
        setIsLoading(true)
        try {
          const results = await searchProducts(searchQuery || '', 20)
          setProducts(results)
        } finally {
          setIsLoading(false)
        }
      }
    }

    // Debounce the search
    const timeoutId = setTimeout(loadProducts, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, isOpen])


  // Determine the current value displayed in the input field
  const inputValue = useMemo(() => {
    // If the user is actively typing a search query, show the query
    if (searchQuery) {
      return searchQuery
    }
    // If a product is selected, show its title and price (as seen in your image's item field)
    if (selectedProduct) {
      return `${selectedProduct?.title}`
//       return `${selectedProduct.title} - ${(selectedProduct.salePrice ?? selectedProduct.price ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'INR' })}`
    }
    // Otherwise, the input is empty
    return ''
  }, [searchQuery, selectedProduct])


  // Handle item selection
  const handleSelect = (productId: string) => {
    isSearchingRef.current = false
    onSearchEnd?.() // Notify search ended
    onChange(productId) // Update product ID
    setIsOpen(false) // Close dropdown
    setSearchQuery('') // Clear search query to show selected product's full name/price
    inputRef.current?.blur() // Remove focus from the input
  }

  // Handle input change (typing)
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value
    const wasSearching = !!searchQuery
    const hadValue = !!value

    // 1. User starts typing on a selected product (initiate search)
    if (newQuery && !wasSearching && hadValue) {
      isSearchingRef.current = true
      onSearchStart?.()
      // Clear the productId immediately to allow searching and display the query
      onChange('')
    }

    setSearchQuery(newQuery)
    setIsOpen(true)

    // 2. User clears the search query completely
    if (!newQuery) {
      // If they were searching, stop searching and notify parent
      if (isSearchingRef.current) {
        isSearchingRef.current = false
        onSearchEnd?.()
      }
      // In all cases, if the input is cleared, clear the selected product ID
      onChange('')
    }
  }
  
  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true)
    // If a product is already selected, clear the search query
    // This ensures that if they start typing, the handleInputChange logic runs correctly
    if (value && !searchQuery) {
      setSearchQuery('')
    }
  }

  // Handle input blur
  const handleBlur = () => {
    // Use setTimeout to allow the item selection (handleSelect) to register
    setTimeout(() => {
      // Check if the dropdown is still open (i.e., focus moved outside of the whole component)
      if (document.activeElement?.closest('.relative') !== inputRef.current?.parentElement?.parentElement) {
        setIsOpen(false)
        // If the user was searching and didn't select anything, restore the previous value (if any) or clear the query.
        if (isSearchingRef.current) {
          isSearchingRef.current = false
          onSearchEnd?.()
        }
        
        // Restore selected product display by clearing search query
        if (value) {
          setSearchQuery('')
        } else if (!value) {
          // If nothing selected, clear any remaining query
          setSearchQuery('')
        }
      }
    }, 150) // Short delay
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue} // Use the consolidated display value
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            // **DARK MODE STYLES APPLIED HERE**
            className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 
                dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 
                ${className}`}
          />
          {/* Dropdown Container */}
          {isOpen && (products.length > 0 || isLoading || searchQuery) && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg 
                dark:border-slate-700 dark:bg-slate-800">
              {isLoading ? (
                <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Loading...</div>
              ) : products.length > 0 ? (
                <>
                  {/* Product List */}
                  {products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelect(product.id)}
                      className={`w-full px-3 py-2 text-left text-sm 
                        hover:bg-slate-100 dark:hover:bg-slate-700 
                        ${product.id === value ? 'bg-blue-50 dark:bg-blue-900/40' : ''}`}
                    >
                      <div className="font-medium dark:text-white">{product.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {product.sku} · MRP:{' '}
                        {(product.mrp ?? product.price ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        {' · '}Sale:{' '}
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {(product.salePrice ?? product.price ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                    </button>
                  ))}
                  {/* Quick Create Button at the end of the list */}
                  {onQuickCreate && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        onQuickCreate()
                      }}
                      className="w-full border-t border-slate-200 px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 
                        dark:border-slate-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      + Add New Item
                    </button>
                  )}
                </>
              ) : searchQuery ? (
                <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
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
        {/* Optional +New button */}
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
      {/* Background overlay to close the dropdown on outside click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            // Close the dropdown
            setIsOpen(false)
            
            // If nothing is selected, clear the search query
            if (!value) {
              setSearchQuery('')
            } else {
              // If a product is selected, clear search query to restore the display of the selected product
              setSearchQuery('')
            }
          }}
        />
      )}
    </div>
  )
}