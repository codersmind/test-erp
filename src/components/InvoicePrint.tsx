import { useEffect, useRef, useState } from 'react'
import type { SalesOrder, SalesOrderItem, PurchaseOrder, PurchaseOrderItem } from '../db/schema'
import { getPrintSettings, getPrintStyles, type PrintPaperSize, type CustomPrintFormat } from '../utils/printSettings'

interface InvoicePrintProps {
  order: SalesOrder | PurchaseOrder
  items: SalesOrderItem[] | PurchaseOrderItem[]
  customerName?: string
  supplierName?: string
  type: 'sales' | 'purchase'
}

export const InvoicePrint = ({ order, items, customerName, supplierName, type }: InvoicePrintProps) => {
  const printRef = useRef<HTMLDivElement>(null)
  const [printSettings, setPrintSettings] = useState<Awaited<ReturnType<typeof getPrintSettings>> | null>(null)
  const [selectedPaperSize, setSelectedPaperSize] = useState<PrintPaperSize>('a4')
  const [selectedFormatId, setSelectedFormatId] = useState<string | undefined>(undefined)

  useEffect(() => {
    getPrintSettings().then((settings) => {
      setPrintSettings(settings)
      if (settings.defaultPaperSize === 'saved' && settings.defaultFormatId) {
        setSelectedPaperSize('saved')
        setSelectedFormatId(settings.defaultFormatId)
      } else {
        setSelectedPaperSize(settings.defaultPaperSize)
      }
    })
  }, [])

  const handlePrint = async () => {
    if (!printRef.current) return
    
    const settings = await getPrintSettings()
    const paperSize = selectedPaperSize || settings.defaultPaperSize
    const formatId = paperSize === 'saved' ? selectedFormatId : undefined
    const styles = await getPrintStyles(paperSize, settings.customWidth, settings.customHeight, formatId)
    
    // Get format details if using saved format
    let formatDetails: CustomPrintFormat | null = null
    if (paperSize === 'saved' && formatId) {
      const { getCustomFormat } = await import('../utils/printSettings')
      formatDetails = await getCustomFormat(formatId)
    }
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Use format details if available, otherwise use settings
    const companyInfo = formatDetails || settings
    const showLogo = formatDetails?.showLogo ?? settings.showLogo
    const logoUrl = formatDetails?.logoUrl ?? settings.logoUrl
    const companyName = formatDetails?.companyName || settings.companyName
    const companyGST = formatDetails?.companyGst || settings.companyGst
    const companyAddress = formatDetails?.companyAddress || settings.companyAddress
    const companyPhone = formatDetails?.companyPhone || settings.companyPhone
    const companyEmail = formatDetails?.companyEmail || settings.companyEmail
    const footerText = formatDetails?.footerText || settings.footerText || 'Thank you for your business!'
    
    // Build header with company info if available
    let headerContent = `
      <div class="header">
        ${showLogo && logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height: 50px; margin-bottom: 10px;" />` : ''}
        ${companyName ? `<h1>${companyName}</h1>` : `<h1>${type === 'sales' ? 'INVOICE' : 'PURCHASE ORDER'}</h1>`}
        ${companyAddress ? `<p style="font-size: 10px; margin: 3px 0;">${companyAddress}</p>` : ''}
        ${companyPhone ? `<p style="font-size: 10px; margin: 3px 0;">Phone: ${companyPhone}</p>` : ''}
        ${companyEmail ? `<p style="font-size: 10px; margin: 3px 0;">Email: ${companyEmail}</p>` : ''}
        ${companyGST ? `<p style="font-size: 10px; margin: 3px 0;">GST: ${companyGST}</p>` : ''}
        <p style="margin-top: 10px;">${type === 'sales' ? 'INVOICE' : 'PURCHASE ORDER'} #${order.id.slice(-6)}</p>
      </div>
    `

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${type === 'sales' ? 'Invoice' : 'Purchase Order'} - ${order.id.slice(-6)}</title>
          <style>
            ${styles}
          </style>
        </head>
        <body>
          ${headerContent}
          ${printRef.current.innerHTML.replace(/<div[^>]*class="[^"]*header[^"]*"[^>]*>[\s\S]*?<\/div>/i, '')}
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
      <div className="no-print mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Paper Size:</label>
          <select
            value={selectedPaperSize}
            onChange={(e) => {
              const newSize = e.target.value as PrintPaperSize
              setSelectedPaperSize(newSize)
              if (newSize !== 'saved') {
                setSelectedFormatId(undefined)
              } else if (printSettings?.savedFormats && printSettings.savedFormats.length > 0) {
                setSelectedFormatId(printSettings.savedFormats[0].id)
              }
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          >
            <option value="pos">POS/Receipt (80mm)</option>
            <option value="a4">A4 (210mm)</option>
            <option value="custom">Custom Size</option>
            {printSettings?.savedFormats && printSettings.savedFormats.length > 0 && (
              <option value="saved">Saved Formats</option>
            )}
          </select>
          {selectedPaperSize === 'saved' && printSettings?.savedFormats && printSettings.savedFormats.length > 0 && (
            <select
              value={selectedFormatId || ''}
              onChange={(e) => setSelectedFormatId(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            >
              {printSettings.savedFormats.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.name} ({format.width}mm × {format.height}mm)
                </option>
              ))}
            </select>
          )}
          {selectedPaperSize !== printSettings?.defaultPaperSize && 
           !(selectedPaperSize === 'saved' && selectedFormatId === printSettings?.defaultFormatId) && (
            <button
              onClick={() => {
                if (printSettings) {
                  if (printSettings.defaultPaperSize === 'saved' && printSettings.defaultFormatId) {
                    setSelectedPaperSize('saved')
                    setSelectedFormatId(printSettings.defaultFormatId)
                  } else {
                    setSelectedPaperSize(printSettings.defaultPaperSize)
                    setSelectedFormatId(undefined)
                  }
                }
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Use default from settings"
            >
              Use Default
            </button>
          )}
          <button
            onClick={handlePrint}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            🖨️ Print {type === 'sales' ? 'Invoice' : 'Purchase Order'}
          </button>
        </div>
        {printSettings && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Default: {
              printSettings.defaultPaperSize === 'pos' 
                ? 'POS/Receipt (80mm)' 
                : printSettings.defaultPaperSize === 'a4' 
                ? 'A4 (210mm)' 
                : printSettings.defaultPaperSize === 'saved' && printSettings.defaultFormatId
                ? printSettings.savedFormats?.find(f => f.id === printSettings.defaultFormatId)?.name || 'Saved Format'
                : `Custom (${printSettings.customWidth}mm × ${printSettings.customHeight}mm)`
            } • Change in Settings
          </p>
        )}
      </div>
      <div ref={printRef} className="rounded-lg border border-slate-200 bg-white p-6 text-stone-600">
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
                    currency: 'INR',
                  })}
                </td>
                {type === 'sales' && 'discount' in item && (
                  <td className="text-right">
                    {item.discount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                  </td>
                )}
                <td className="text-right">
                  {item.lineTotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <div className="totals-row">
            <span>Subtotal:</span>
            <span>{orderSubtotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}</span>
          </div>
          {orderDiscount > 0 && (
            <div className="totals-row">
              <span>Discount:</span>
              <span>-{orderDiscount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}</span>
            </div>
          )}
          {orderTax > 0 && (
            <div className="totals-row">
              <span>GST:</span>
              <span>{orderTax.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}</span>
            </div>
          )}
          <div className="totals-row total">
            <span>Total:</span>
            <span>{orderTotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}</span>
          </div>
        </div>

        <div className="footer">
          <p>{printSettings?.footerText || 'Thank you for your business!'}</p>
        </div>
      </div>
    </>
  )
}

