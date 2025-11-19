import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import type { SalesOrder, SalesOrderItem, PurchaseOrder, PurchaseOrderItem } from '../db/schema'
import { getPrintSettings, getPrintStyles, type PrintPaperSize, type CustomPrintFormat } from '../utils/printSettings'
import { getDefaultTemplate, getTemplateByPaperSize, renderTemplate } from '../utils/invoiceTemplate'
import { getProduct } from '../db/localDataService'

interface InvoicePrintProps {
  order: SalesOrder | PurchaseOrder
  items: SalesOrderItem[] | PurchaseOrderItem[]
  customerName?: string
  supplierName?: string
  type: 'sales' | 'purchase'
  hideControls?: boolean
}

export interface InvoicePrintRef {
  print: () => void
}

export const InvoicePrint = forwardRef<InvoicePrintRef, InvoicePrintProps>(
  ({ order, items, customerName, supplierName, type, hideControls = false }, ref) => {
    const printRef = useRef<HTMLDivElement>(null)
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [printSettings, setPrintSettings] = useState<Awaited<ReturnType<typeof getPrintSettings>> | null>(null)
    const [selectedPaperSize, setSelectedPaperSize] = useState<PrintPaperSize>('a4')
    const [selectedFormatId, setSelectedFormatId] = useState<string | undefined>(undefined)
    const [customTemplate, setCustomTemplate] = useState<Awaited<ReturnType<typeof getDefaultTemplate>> | null>(null)
    const [previewStyles, setPreviewStyles] = useState<string>('')
    const [itemsWithProducts, setItemsWithProducts] = useState<Array<{
      item: SalesOrderItem | PurchaseOrderItem
      product: Awaited<ReturnType<typeof getProduct>> | null
      mrp: number
      salePrice: number
      discountPercent: number
    }>>([])

    useEffect(() => {
      const loadSettings = async () => {
        const settings = await getPrintSettings()
        setPrintSettings(settings)
        
        // Load template based on default paper size
        const paperSize = settings.defaultPaperSize === 'saved' ? 'a4' : settings.defaultPaperSize
        const template = await getTemplateByPaperSize(paperSize)
        setCustomTemplate(template)
        
        if (settings.defaultPaperSize === 'saved' && settings.defaultFormatId) {
          setSelectedPaperSize('saved')
          setSelectedFormatId(settings.defaultFormatId)
        } else {
          setSelectedPaperSize(settings.defaultPaperSize)
        }
      }
      loadSettings()
    }, [])

    // Update template and preview styles when page size changes
    useEffect(() => {
      const updateTemplateAndStyles = async () => {
        if (!printSettings) return

        // Get template based on selected paper size
        const paperSizeForTemplate = selectedPaperSize === 'saved' ? 'a4' : selectedPaperSize
        const template = await getTemplateByPaperSize(paperSizeForTemplate)
        if (template) {
          setCustomTemplate(template)
        }

        const formatId = selectedPaperSize === 'saved' ? selectedFormatId : undefined
        const styles = await getPrintStyles(selectedPaperSize, printSettings.customWidth, printSettings.customHeight, formatId)
        setPreviewStyles(styles)
      }
      updateTemplateAndStyles()
    }, [selectedPaperSize, selectedFormatId, printSettings])

    const handlePrint = async () => {
      const settings = await getPrintSettings()
      
      // Ensure logo is loaded from storage if showLogo is enabled but logoUrl is missing
      if (settings.showLogo && !settings.logoUrl) {
        const { getLogo } = await import('../utils/logoStorage')
        const logo = await getLogo()
        if (logo) {
          settings.logoUrl = logo.dataUrl
        }
      }
      
      const paperSize = selectedPaperSize || settings.defaultPaperSize
      const formatId = paperSize === 'saved' ? selectedFormatId : undefined
      const styles = await getPrintStyles(paperSize, settings.customWidth, settings.customHeight, formatId)
      
      // Get format details if using saved format
      let formatDetails: CustomPrintFormat | null = null
      if (paperSize === 'saved' && formatId) {
        const { getCustomFormat } = await import('../utils/printSettings')
        formatDetails = await getCustomFormat(formatId)
        // Also check logo for format details
        if (formatDetails?.showLogo && !formatDetails.logoUrl) {
          const { getLogo } = await import('../utils/logoStorage')
          const logo = await getLogo()
          if (logo) {
            formatDetails.logoUrl = logo.dataUrl
          }
        }
      }

      // Get template based on paper size
      const paperSizeForTemplate = paperSize === 'saved' ? 'a4' : paperSize
      const customTemplate = await getTemplateByPaperSize(paperSizeForTemplate)
      
      let htmlContent: string

      // Use custom template if available
      if (customTemplate) {
        // Prepare data for template
        const companyInfo = formatDetails || settings
        const orderDate = new Date(order.issuedDate || order.createdAt).toLocaleDateString()
        const orderTotal = 'total' in order ? order.total : 0
        const orderSubtotal = 'subtotal' in order ? order.subtotal : 0
        const orderTax = 'tax' in order ? order.tax : 0
        // Discount already includes round figure discount (added in createSalesOrder)
        const orderDiscount = 'discount' in order ? order.discount || 0 : 0
        const orderTaxType = 'taxType' in order ? order.taxType : undefined
        const orderCgst = 'cgst' in order ? order.cgst : undefined
        const orderSgst = 'sgst' in order ? order.sgst : undefined
        
        // Get product names for items
        const itemsWithNames = await Promise.all(
          items.map(async (item) => {
            const product = await getProduct(item.productId)
            const unitPrice = 'unitPrice' in item ? item.unitPrice : 'unitCost' in item ? item.unitCost : 0
            const mrp = product?.mrp || 0
            // Use the actual unitPrice from order as sale price (what was actually charged)
            const salePrice = unitPrice
            // Calculate discount percentage from MRP to sale price
            const discountPercent = mrp > 0 && salePrice < mrp 
              ? Math.round(((mrp - salePrice) / mrp) * 100) 
              : 0
            
            return {
              productName: product?.title || item.productId,
              quantity: item.quantity,
              mrp: mrp > 0 ? mrp.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
              salePrice: salePrice.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
              unitPrice: unitPrice.toLocaleString(undefined, {
                style: 'currency',
                currency: 'INR',
              }),
              discount: ('discount' in item ? item.discount : 0).toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
              discountPercent: discountPercent > 0 ? `${discountPercent}%` : '',
              lineTotal: item.lineTotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
            }
          })
        )
        
        const paidAmount = 'paidAmount' in order ? (order.paidAmount || 0) : 0
        const dueAmount = orderTotal - paidAmount
        const dueDate = 'dueDate' in order && order.dueDate ? new Date(order.dueDate).toLocaleDateString() : ''
        
        const templateData = {
          type: type === 'sales' ? 'INVOICE' : 'PURCHASE ORDER',
          orderId: order.id.slice(-6),
          companyName: companyInfo.companyName || '',
          companyAddress: companyInfo.companyAddress || '',
          companyPhone: companyInfo.companyPhone || '',
          companyEmail: companyInfo.companyEmail || '',
          companyGst: companyInfo.companyGst || '',
          logoUrl: companyInfo.showLogo && companyInfo.logoUrl ? companyInfo.logoUrl : '',
          billToLabel: type === 'sales' ? 'Bill To' : 'Supplier',
          customerName: customerName || supplierName || 'N/A',
          orderDate,
          dueDate,
          status: order.status,
          notes: order.notes || '',
          items: itemsWithNames,
          showDiscount: type === 'sales',
          subtotal: orderSubtotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
          discount: orderDiscount > 0 ? orderDiscount.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
          // Note: orderDiscount already includes round figure discount (added in createSalesOrder)
          tax: orderTax > 0 && orderTaxType !== 'cgst_sgst' ? orderTax.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
          cgst: orderCgst && typeof orderCgst === 'number' && orderCgst > 0 ? Number(orderCgst).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '',
          sgst: orderSgst && typeof orderSgst === 'number' && orderSgst > 0 ? Number(orderSgst).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '',
          total: orderTotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
          paidAmount: paidAmount > 0 && dueAmount > 0 ? paidAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
          dueAmount: dueAmount > 0 ? dueAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
          footerText: companyInfo.footerText || 'Thank you for your business!',
        }
        
        // Render template first
        let renderedHtml = renderTemplate(customTemplate, templateData)
        
        // Inject print styles into the template's style tag
        // The template has {{CSS}} placeholder that gets replaced with template.css
        // We need to add the print styles (page size) after the template CSS
        // Use a more robust approach: find the last </style> tag and inject before it
        const styleTagRegex = /<\/style>/gi
        const styleMatches = [...renderedHtml.matchAll(styleTagRegex)]
        
        if (styleMatches.length > 0) {
          // Get the last </style> tag position
          const lastMatch = styleMatches[styleMatches.length - 1]
          const insertPosition = lastMatch.index!
          // Insert print styles before the closing </style> tag
          renderedHtml = renderedHtml.slice(0, insertPosition) + 
            `\n    /* Print Styles - Page Size: ${paperSize} */\n    ${styles}\n  ` + 
            renderedHtml.slice(insertPosition)
        } else if (renderedHtml.includes('<head>')) {
          // If no style tag, add one in the head
          renderedHtml = renderedHtml.replace('<head>', `<head>\n  <style>\n    ${styles}\n  </style>`)
        } else if (renderedHtml.includes('<html>')) {
          // If has html tag but no head, add head with styles
          renderedHtml = renderedHtml.replace('<html>', `<html>\n  <head>\n    <style>\n      ${styles}\n    </style>\n  </head>`)
        } else {
          // Fallback: wrap in proper HTML structure
          renderedHtml = `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <style>\n    ${styles}\n  </style>\n</head>\n<body>\n${renderedHtml}\n</body>\n</html>`
        }
        
        htmlContent = renderedHtml
      } else {
        // Use default template (existing code)
        const showLogo = formatDetails?.showLogo ?? settings.showLogo
        const logoUrl = formatDetails?.logoUrl ?? settings.logoUrl
        const companyName = formatDetails?.companyName || settings.companyName
        const companyGST = formatDetails?.companyGst || settings.companyGst
        const companyAddress = formatDetails?.companyAddress || settings.companyAddress
        const companyPhone = formatDetails?.companyPhone || settings.companyPhone
        const companyEmail = formatDetails?.companyEmail || settings.companyEmail
        
        // Build header with company info if available
        let headerContent = `
          <div class="header" style="text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #333;">
            ${showLogo && logoUrl ? `<img src="${logoUrl}" alt="Company Logo" style="max-height: 80px; max-width: 200px; margin-bottom: 15px; object-fit: contain; display: block; margin-left: auto; margin-right: auto;" />` : ''}
            ${companyName ? `<h1 style="font-size: 24px; margin-bottom: 10px;">${companyName}</h1>` : `<h1 style="font-size: 24px; margin-bottom: 10px;">${type === 'sales' ? 'INVOICE' : 'PURCHASE ORDER'}</h1>`}
            ${companyAddress ? `<p style="font-size: 11px; margin: 3px 0;">${companyAddress}</p>` : ''}
            ${companyPhone ? `<p style="font-size: 11px; margin: 3px 0;">Phone: ${companyPhone}</p>` : ''}
            ${companyEmail ? `<p style="font-size: 11px; margin: 3px 0;">Email: ${companyEmail}</p>` : ''}
            ${companyGST ? `<p style="font-size: 11px; margin: 3px 0;">GST: ${companyGST}</p>` : ''}
            <p style="margin-top: 10px; font-size: 12px;">${type === 'sales' ? 'INVOICE' : 'PURCHASE ORDER'} #${order.id.slice(-6)}</p>
          </div>
        `

        htmlContent = `
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
              ${printRef.current ? printRef.current.innerHTML.replace(/<div[^>]*class="[^"]*header[^"]*"[^>]*>[\s\S]*?<\/div>/i, '') : ''}
            </body>
          </html>
        `
      }

    // Use Electron printer if available
    if (window.electronPrinter) {
      try {
        // Get printer settings
        const { getPrinterSettings } = await import('../utils/printerSettings')
        const printerSettings = await getPrinterSettings()
        
        let printerName: string | undefined = undefined
        let silent = false

        if (printerSettings.defaultPrinterName) {
          // Use default printer, print silently
          printerName = printerSettings.defaultPrinterName
          silent = true
        } else {
          // Show printer selection dialog
          const dialogResult = await window.electronPrinter.showDialog()
          if (!dialogResult.success || !dialogResult.printer) {
            return // User cancelled
          }
          printerName = dialogResult.printer.name
          silent = false
        }

        // Print using Electron
        const result = await window.electronPrinter.print({
          html: htmlContent,
          printerName,
          silent,
        })

        if (!result.success) {
          console.error('Print failed:', result.error)
          alert(`Print failed: ${result.error || 'Unknown error'}`)
        }
        return
      } catch (error) {
        console.error('Error using Electron printer:', error)
        // Fall through to browser print
      }
    }

    // Fallback to browser print dialog
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.open('text/html', 'replace')
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
      }, 250)
    }

    useImperativeHandle(ref, () => ({
      print: handlePrint,
    }))

    const orderDate = new Date(order.issuedDate || order.createdAt).toLocaleDateString()
    const orderTotal = 'total' in order ? order.total : 0
    const orderSubtotal = 'subtotal' in order ? order.subtotal : 0
    const orderTax = 'tax' in order ? order.tax : 0
    // Discount already includes round figure discount (added in createSalesOrder)
    const orderDiscount = 'discount' in order ? order.discount || 0 : 0
    const orderTaxType = 'taxType' in order ? order.taxType : undefined
    const orderCgst = 'cgst' in order ? order.cgst : undefined
    const orderSgst = 'sgst' in order ? order.sgst : undefined

    // Prepare template data for preview
    const prepareTemplateData = async () => {
      if (!printSettings) return null
      
      const formatId = selectedPaperSize === 'saved' ? selectedFormatId : undefined
      let formatDetails: CustomPrintFormat | null = null
      if (selectedPaperSize === 'saved' && formatId) {
        const { getCustomFormat } = await import('../utils/printSettings')
        formatDetails = await getCustomFormat(formatId)
      }
      
      const companyInfo = formatDetails || printSettings
      const itemsWithNames = await Promise.all(
        items.map(async (item) => {
            const product = await getProduct(item.productId)
            const unitPrice = 'unitPrice' in item ? item.unitPrice : 'unitCost' in item ? item.unitCost : 0
            const mrp = product?.mrp || 0
            // Use the actual unitPrice from order as sale price (what was actually charged)
            const salePrice = unitPrice
            // Calculate discount percentage from MRP to sale price
            const discountPercent = mrp > 0 && salePrice < mrp 
              ? Math.round(((mrp - salePrice) / mrp) * 100) 
              : 0
          
          return {
            productName: product?.title || item.productId,
            quantity: item.quantity,
            mrp: mrp > 0 ? mrp.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
            salePrice: salePrice.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
            unitPrice: unitPrice.toLocaleString(undefined, {
              style: 'currency',
              currency: 'INR',
            }),
            discount: ('discount' in item ? item.discount : 0).toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
            discountPercent: discountPercent > 0 ? `${discountPercent}%` : '',
            lineTotal: item.lineTotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
          }
        })
      )
      
      const paidAmount = 'paidAmount' in order ? (order.paidAmount || 0) : 0
      const dueAmount = orderTotal - paidAmount
      const dueDate = 'dueDate' in order && order.dueDate ? new Date(order.dueDate).toLocaleDateString() : ''
      
      return {
        type: type === 'sales' ? 'INVOICE' : 'PURCHASE ORDER',
        orderId: order.id.slice(-6),
        companyName: companyInfo.companyName || '',
        companyAddress: companyInfo.companyAddress || '',
        companyPhone: companyInfo.companyPhone || '',
        companyEmail: companyInfo.companyEmail || '',
        companyGst: companyInfo.companyGst || '',
        logoUrl: companyInfo.showLogo && companyInfo.logoUrl ? companyInfo.logoUrl : '',
        billToLabel: type === 'sales' ? 'Bill To' : 'Supplier',
        customerName: customerName || supplierName || 'N/A',
        orderDate,
        dueDate,
        status: order.status,
        notes: order.notes || '',
        items: itemsWithNames,
        showDiscount: type === 'sales',
        subtotal: orderSubtotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
        discount: orderDiscount > 0 ? orderDiscount.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
        // Note: orderDiscount already includes round figure discount (added in createSalesOrder)
        tax: orderTax > 0 && orderTaxType !== 'cgst_sgst' ? orderTax.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
        cgst: orderCgst && typeof orderCgst === 'number' && orderCgst > 0 ? Number(orderCgst).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '',
        sgst: orderSgst && typeof orderSgst === 'number' && orderSgst > 0 ? Number(orderSgst).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '',
        total: orderTotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
        paidAmount: paidAmount > 0 && dueAmount > 0 ? paidAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
        dueAmount: dueAmount > 0 ? dueAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
        footerText: companyInfo.footerText || 'Thank you for your business!',
      }
    }

    const [previewHtml, setPreviewHtml] = useState<string>('')

    // Load product data for items
    useEffect(() => {
      const loadProducts = async () => {
        const itemsData = await Promise.all(
          items.map(async (item) => {
            const product = await getProduct(item.productId)
            const unitPrice = 'unitPrice' in item ? item.unitPrice : 'unitCost' in item ? item.unitCost : 0
            const mrp = product?.mrp || 0
            // Use the actual unitPrice from order as sale price (what was actually charged)
            const salePrice = unitPrice
            const discountPercent = mrp > 0 && salePrice < mrp 
              ? Math.round(((mrp - salePrice) / mrp) * 100) 
              : 0
            return { item, product, mrp, salePrice, discountPercent }
          })
        )
        setItemsWithProducts(itemsData)
      }
      loadProducts()
    }, [items])

    // Update preview when template, page size, or data changes
    useEffect(() => {
      const updatePreview = async () => {
        if (!printSettings || !previewStyles) {
          setPreviewHtml('')
          return
        }
        
        // Get template based on selected paper size
        const paperSizeForTemplate = selectedPaperSize === 'saved' ? 'a4' : selectedPaperSize
        const template = await getTemplateByPaperSize(paperSizeForTemplate)
        
        if (!template) {
          setPreviewHtml('')
          return
        }
        
        setCustomTemplate(template)
        
        const templateData = await prepareTemplateData()
        if (!templateData) {
          setPreviewHtml('')
          return
        }
        
        let renderedHtml = renderTemplate(template, templateData)
        
        // Inject preview styles
        const styleTagRegex = /<\/style>/gi
        const styleMatches = [...renderedHtml.matchAll(styleTagRegex)]
        
        if (styleMatches.length > 0) {
          const lastMatch = styleMatches[styleMatches.length - 1]
          const insertPosition = lastMatch.index!
          renderedHtml = renderedHtml.slice(0, insertPosition) + 
            `\n    /* Print Styles - Page Size: ${selectedPaperSize} */\n    ${previewStyles}\n  ` + 
            renderedHtml.slice(insertPosition)
        }
        
        // Keep full HTML for iframe rendering
        setPreviewHtml(renderedHtml)
      }
      updatePreview()
    }, [previewStyles, selectedPaperSize, selectedFormatId, order.id, order.issuedDate, order.createdAt, order.status, order.notes, items.length, customerName, supplierName, printSettings])

    return (
      <>
        {!hideControls && (
          <div className="no-print mb-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Paper Size:</label>
          <select
            value={selectedPaperSize}
            onChange={async (e) => {
              const newSize = e.target.value as PrintPaperSize
              setSelectedPaperSize(newSize)
              if (newSize !== 'saved') {
                setSelectedFormatId(undefined)
              } else if (printSettings?.savedFormats && printSettings.savedFormats.length > 0) {
                setSelectedFormatId(printSettings.savedFormats[0].id)
              }
              // Immediately update template when paper size changes
              if (printSettings) {
                const paperSizeForTemplate = newSize === 'saved' ? 'a4' : newSize
                const template = await getTemplateByPaperSize(paperSizeForTemplate)
                if (template) {
                  setCustomTemplate(template)
                }
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
        )}
        {customTemplate && previewHtml ? (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <iframe
              ref={iframeRef}
              title="Invoice Preview"
              srcDoc={previewHtml}
              className="w-full border-0"
              style={{ minHeight: '600px' }}
            />
          </div>
        ) : (
          <div
            ref={printRef} 
            className="rounded-lg border border-slate-200 bg-white p-6 text-stone-600"
            style={previewStyles ? { 
              maxWidth: '100%',
              ...(previewStyles.includes('width:') ? {} : {}),
            } : {}}
          >
            <div className="header">
              {printSettings?.showLogo && printSettings?.logoUrl && (
                <img 
                  src={printSettings.logoUrl} 
                  alt="Company Logo" 
                  className="logo"
                  style={{ maxHeight: '80px', maxWidth: '200px', marginBottom: '15px', objectFit: 'contain', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
                />
              )}
              <h1>{printSettings?.companyName || (type === 'sales' ? 'INVOICE' : 'PURCHASE ORDER')}</h1>
              {printSettings?.companyAddress && <p className="address">{printSettings.companyAddress}</p>}
              {printSettings?.companyPhone && <p>Phone: {printSettings.companyPhone}</p>}
              {printSettings?.companyEmail && <p>Email: {printSettings.companyEmail}</p>}
              {printSettings?.companyGst && <p>GST: {printSettings.companyGst}</p>}
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
                {'dueDate' in order && order.dueDate && <p>Due Date: {new Date(order.dueDate).toLocaleDateString()}</p>}
                <p>Status: {order.status}</p>
                {order.notes && <p>Notes: {order.notes}</p>}
              </div>
            </div>

            <table className='my-4' style={{ width: '100%', tableLayout: selectedPaperSize === 'pos' ? 'fixed' : 'auto' }}>
              <thead>
                <tr>
                  <th style={selectedPaperSize === 'pos' ? { width: '20%', fontSize: '8px', padding: '3px 1px' } : {}}>Item</th>
                  <th className="text-right" style={selectedPaperSize === 'pos' ? { width: '8%', fontSize: '8px', padding: '3px 1px' } : {}}>Qty</th>
                  {type === 'sales' && <th className="text-right" style={selectedPaperSize === 'pos' ? { width: '18%', fontSize: '8px', padding: '3px 1px' } : {}}>MRP</th>}
                  {type === 'sales' && <th className="text-right" style={selectedPaperSize === 'pos' ? { width: '18%', fontSize: '8px', padding: '3px 1px' } : {}}>Sale Price</th>}
                  {type === 'sales' && <th className="text-right" style={selectedPaperSize === 'pos' ? { width: '18%', fontSize: '8px', padding: '3px 1px' } : {}}>Item Discount</th>}
                  <th className="text-right" style={selectedPaperSize === 'pos' ? { width: '18%', fontSize: '8px', padding: '3px 1px' } : {}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {itemsWithProducts.map(({ item, product, mrp, salePrice, discountPercent }, index) => (
                  <tr key={item.id || index}>
                    <td style={selectedPaperSize === 'pos' ? { fontSize: '7px', padding: '3px 1px', wordWrap: 'break-word' } : {}}>{product?.title || item.productId}</td>
                    <td className="text-right" style={selectedPaperSize === 'pos' ? { fontSize: '7px', padding: '3px 1px' } : {}}>{item.quantity}</td>
                    {type === 'sales' && (
                      <td className="text-right" style={{ lineHeight: '1.4', ...(selectedPaperSize === 'pos' ? { fontSize: '6px', padding: '3px 1px' } : {}) }}>
                        {mrp > 0 ? (
                          <>
                            <span style={{ textDecoration: 'line-through', color: '#666', display: 'block' }}>
                              {mrp.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                            </span>
                            {discountPercent > 0 && (
                              <span style={{ color: '#2563eb', fontWeight: 500, fontSize: selectedPaperSize === 'pos' ? '6px' : '10px', display: 'block', marginTop: '2px' }}>
                                {discountPercent}%
                              </span>
                            )}
                          </>
                        ) : '-'}
                      </td>
                    )}
                    {type === 'sales' && (
                      <td className="text-right" style={selectedPaperSize === 'pos' ? { fontSize: '7px', padding: '3px 1px', whiteSpace: 'normal' } : {}}>
                        {salePrice.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                      </td>
                    )}
                    {type === 'sales' && 'discount' in item && (
                      <td className="text-right" style={selectedPaperSize === 'pos' ? { fontSize: '7px', padding: '3px 1px', whiteSpace: 'normal' } : {}}>
                        {item.discount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}
                      </td>
                    )}
                    <td className="text-right" style={selectedPaperSize === 'pos' ? { fontSize: '7px', padding: '3px 1px', whiteSpace: 'normal' } : {}}>
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
                  <span>Discount (includes round off):</span>
                  <span>-{orderDiscount.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}</span>
                </div>
              )}
              {orderTax > 0 && orderTaxType === 'cgst_sgst' && orderCgst !== undefined && orderSgst !== undefined && orderCgst !== null && orderSgst !== null ? (
                <>
                  <div className="totals-row">
                    <span>CGST:</span>
                    <span>{Number(orderCgst).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                  </div>
                  <div className="totals-row">
                    <span>SGST:</span>
                    <span>{Number(orderSgst).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                  </div>
                </>
              ) : orderTax > 0 ? (
                <div className="totals-row">
                  <span>GST:</span>
                  <span>{orderTax.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}</span>
                </div>
              ) : null}
              <div className="totals-row total">
                <span>Total:</span>
                <span>{orderTotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' })}</span>
              </div>
              {'paidAmount' in order && (order.paidAmount || 0) > 0 && (
                <div className="totals-row">
                  <span>Paid:</span>
                  <span>{(order.paidAmount || 0).toLocaleString(undefined, { style: 'currency', currency: 'INR' })}</span>
                </div>
              )}
              {'paidAmount' in order && (orderTotal - (order.paidAmount || 0)) > 0 && (
                <div className="totals-row" style={{ color: '#dc2626', fontWeight: 'bold' }}>
                  <span>Due Amount:</span>
                  <span>{(orderTotal - (order.paidAmount || 0)).toLocaleString(undefined, { style: 'currency', currency: 'INR' })}</span>
                </div>
              )}
            </div>

            <div className="footer">
              <p>{printSettings?.footerText || 'Thank you for your business!'}</p>
            </div>
          </div>
        )}
      </>
    )
  })

