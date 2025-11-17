import { useEffect, useState, useRef } from 'react'
import { InvoicePrint, type InvoicePrintRef } from './InvoicePrint'
import { getCustomer } from '../db/localDataService'
import type { SalesOrder, SalesOrderItem, Customer } from '../db/schema'

interface SalesOrderPrintModalProps {
  isOpen: boolean
  onClose: () => void
  order: SalesOrder | null
  items: SalesOrderItem[]
}

export const SalesOrderPrintModal = ({ isOpen, onClose, order, items }: SalesOrderPrintModalProps) => {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const printRef = useRef<InvoicePrintRef>(null)

  useEffect(() => {
    if (order?.customerId) {
      getCustomer(order.customerId).then((cust) => {
        setCustomer(cust || null)
      })
    }
  }, [order?.customerId])

  const handlePrint = () => {
    setIsPrinting(true)
    printRef.current?.print()
    setTimeout(() => {
      setIsPrinting(false)
    }, 500)
  }

  if (!isOpen || !order) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-lg font-semibold">Sale Order Created</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Order #{order.id.slice(0, 8)} has been created successfully
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <InvoicePrint 
              ref={printRef}
              order={order} 
              items={items} 
              customerName={customer?.name} 
              type="sales" 
              hideControls={true}
            />
          </div>
        </div>
        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPrinting ? 'Printing...' : 'Print'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

