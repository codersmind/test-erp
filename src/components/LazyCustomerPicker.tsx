import { useEffect, useMemo, useState } from 'react'

import { searchCustomers } from '../db/localDataService'
import type { Customer, CustomerType } from '../db/schema'

interface LazyCustomerPickerProps {
  value: string
  onChange: (customerId: string) => void
  onQuickCreate?: () => void
  type?: CustomerType
  placeholder?: string
  className?: string
}

export const LazyCustomerPicker = ({
  value,
  onChange,
  onQuickCreate,
  type = 'customer',
  placeholder = 'Search customers...',
  className = '',
}: LazyCustomerPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const loadCustomers = async () => {
      setIsLoading(true)
      try {
        const results = await searchCustomers(searchQuery || '', type, 20)
        setCustomers(results)
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(loadCustomers, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, isOpen, type])

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === value), [customers, value])

  const handleSelect = (customerId: string) => {
    onChange(customerId)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={selectedCustomer ? selectedCustomer.name : searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setIsOpen(true)
              if (value) onChange('')
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 ${className}`}
          />
          {isOpen && (customers.length > 0 || isLoading || searchQuery) && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {isLoading ? (
                <div className="px-3 py-2 text-sm text-slate-500">Loading...</div>
              ) : customers.length > 0 ? (
                <>
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelect(customer.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <div className="font-medium">{customer.name}</div>
                      {(customer.email || customer.phone) && (
                        <div className="text-xs text-slate-500">
                          {customer.email ?? ''} {customer.email && customer.phone ? '·' : ''} {customer.phone ?? ''}
                        </div>
                      )}
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
                      + Create new {type === 'customer' ? 'customer' : 'supplier'}
                    </button>
                  )}
                </>
              ) : searchQuery ? (
                <div className="px-3 py-2 text-sm text-slate-500">
                  No {type === 'customer' ? 'customers' : 'suppliers'} found. {onQuickCreate && (
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
            setSearchQuery('')
          }}
        />
      )}
    </div>
  )
}

