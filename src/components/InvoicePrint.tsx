import { useRef } from 'react'
import type { SalesOrder, SalesOrderItem, PurchaseOrder, PurchaseOrderItem } from '../db/schema'

interface InvoicePrintProps {
  order: SalesOrder | PurchaseOrder
  items: SalesOrderItem[] | PurchaseOrderItem[]
  customerName?: string
  supplierName?: string
  type: 'sales' | 'purchase'
}

export const InvoicePrint = ({ order, items, customerName, supplierName, type }: InvoicePrintProps) => {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (!printRef.current) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${type === 'sales' ? 'Invoice' : 'Purchase Order'} - ${order.id.slice(-6)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .header h1 { font-size: 24px; margin-bottom: 10px; }
            .info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .info-section { flex: 1; }
            .info-section h3 { font-size: 14px; margin-bottom: 10px; text-transform: uppercase; }
            .info-section p { font-size: 12px; margin: 3px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            table th, table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            table th { background-color: #f5f5f5; font-weight: bold; text-transform: uppercase; font-size: 12px; }
            table td { font-size: 12px; }
            .text-right { text-align: right; }
            .totals { margin-top: 20px; margin-left: auto; width: 300px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
            .totals-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; margin-top: 10px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #666; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const orderDate = new Date(order.issuedDate || order.createdAt).toLocaleDateString()
  const orderTotal = 'total' in order ? order.total : 0
  const orderSubtotal = 'subtotal' in order ? order.subtotal : 0
  const orderTax = 'tax' in order ? order.tax : 0
  const orderDiscount = 'discount' in order ? order.discount || 0 : 0

  return (
    <>
      <div className="no-print mb-4">
        <button
          onClick={handlePrint}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
        >
          🖨️ Print {type === 'sales' ? 'Invoice' : 'Purchase Order'}
        </button>
      </div>
      <div ref={printRef} className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="header">
          <h1>{type === 'sales' ? 'INVOICE' : 'PURCHASE ORDER'}</h1>
          <p>#{order.id.slice(-6)}</p>
        </div>

        <div className="info">
          <div className="info-section">
            <h3>{type === 'sales' ? 'Bill To' : 'Supplier'}</h3>
            <p>{type === 'sales' ? customerName || 'N/A' : supplierName || 'N/A'}</p>
          </div>
          <div className="info-section">
            <h3>Order Details</h3>
            <p>Date: {orderDate}</p>
            <p>Status: {order.status}</p>
            {order.notes && <p>Notes: {order.notes}</p>}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Price</th>
              {type === 'sales' && <th className="text-right">Discount</th>}
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || index}>
                <td>{item.productId}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">
                  {('unitPrice' in item ? item.unitPrice : 'unitCost' in item ? item.unitCost : 0).toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </td>
                {type === 'sales' && 'discount' in item && (
                  <td className="text-right">
                    {item.discount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                  </td>
                )}
                <td className="text-right">
                  {item.lineTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <div className="totals-row">
            <span>Subtotal:</span>
            <span>{orderSubtotal.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
          </div>
          {orderDiscount > 0 && (
            <div className="totals-row">
              <span>Discount:</span>
              <span>-{orderDiscount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
            </div>
          )}
          {orderTax > 0 && (
            <div className="totals-row">
              <span>Tax:</span>
              <span>{orderTax.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
            </div>
          )}
          <div className="totals-row total">
            <span>Total:</span>
            <span>{orderTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
          </div>
        </div>

        <div className="footer">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </>
  )
}

