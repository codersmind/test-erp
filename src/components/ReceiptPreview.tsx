import type { SalesOrder, SalesOrderItem } from '../db/schema'

interface ReceiptPreviewProps {
  order: SalesOrder
  items: SalesOrderItem[]
}

export const ReceiptPreview = ({ order, items }: ReceiptPreviewProps) => {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-center text-base font-semibold">Sale receipt</h3>
      <p className="mt-1 text-center text-xs text-slate-500">
        Order #{order.id.slice(-6)} · {new Date(order.createdAt).toLocaleString()}
      </p>
      <table className="mt-4 w-full text-xs">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="pb-1">Item</th>
            <th className="pb-1 text-right">Qty</th>
            <th className="pb-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-1">{item.productId}</td>
              <td className="py-1 text-right">{item.quantity}</td>
              <td className="py-1 text-right">
                {item.lineTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-dashed border-slate-300 text-xs font-semibold dark:border-slate-700">
            <td className="pt-2">Items: {totalQuantity}</td>
            <td />
            <td className="pt-2 text-right">
              {order.total.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-4 text-center text-xs text-slate-400">Thank you for your purchase!</p>
    </div>
  )
}

