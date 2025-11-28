import type { SalesOrder, SalesOrderItem, PurchaseOrder, PurchaseOrderItem } from '../db/schema'
import type { Customer } from '../db/schema'
import { getProduct } from '../db/localDataService'
import { getPrintSettings } from './printSettings'
import { getTemplateByPaperSize, renderTemplate } from './invoiceTemplate'

// Check if we're in Electron by checking for exposed APIs
// Try multiple ways to detect Electron environment
const isElectron = typeof window !== 'undefined' && (
  !!(window as any).electronPDF ||
  !!(window as any).electronSecureStorage ||
  !!(window as any).electronPrinter ||
  !!(window as any).electronUpdater ||
  (typeof process !== 'undefined' && process.versions && !!(process.versions as any).electron)
)

interface ElectronPDFAPI {
  generate(options: { html: string; filename: string }): Promise<{ success: boolean; filePath?: string; error?: string }>
}

// Get PDF API from window (may be exposed via contextBridge or directly)
// Also try to get it directly from electron if contextIsolation is false
const getPDFAPI = (): ElectronPDFAPI | null => {
  if (typeof window === 'undefined') return null
  
  // First try the exposed API
  if ((window as any).electronPDF) {
    return (window as any).electronPDF
  }
  
  // If contextIsolation is false, we can access ipcRenderer directly
  if (typeof process !== 'undefined' && process.versions && (process.versions as any).electron) {
    try {
      const { ipcRenderer } = require('electron')
      if (ipcRenderer) {
        return {
          async generate(options: { html: string; filename: string }) {
            return ipcRenderer.invoke('generate:pdf', options)
          }
        }
      }
    } catch (error) {
      // ipcRenderer not available, continue
    }
  }
  
  return null
}

const pdfAPI: ElectronPDFAPI | null = isElectron ? getPDFAPI() : null

export async function generateInvoicePDF(
  order: SalesOrder,
  items: SalesOrderItem[],
  customer: Customer | null,
): Promise<string> {
  if (!pdfAPI) {
    throw new Error('PDF generation requires Electron environment')
  }

  try {
    // Load print settings and template
    const printSettings = await getPrintSettings()
    const paperSize = printSettings.defaultPaperSize === 'saved' ? 'a4' : printSettings.defaultPaperSize
    const template = await getTemplateByPaperSize(paperSize)

    if (!template) {
      throw new Error('Invoice template not found')
    }

    // Get product names for items (format same as InvoicePrint.tsx)
    const itemsWithNames = await Promise.all(
      items.map(async (item) => {
        const product = await getProduct(item.productId)
        const unitPrice = item.unitPrice
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
          discount: item.discount.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
          discountPercent: discountPercent > 0 ? `${discountPercent}%` : '',
          lineTotal: item.lineTotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
        }
      })
    )

    // Prepare template data (format same as InvoicePrint.tsx)
    const orderDate = new Date(order.issuedDate || order.createdAt).toLocaleDateString()
    const orderTotal = order.total || 0
    const orderSubtotal = order.subtotal || 0
    const orderTax = order.tax || 0
    const orderDiscount = order.discount || 0
    const orderTaxType = order.taxType
    const orderCgst = order.cgst
    const orderSgst = order.sgst
    const paidAmount = order.paidAmount || 0
    const dueAmount = orderTotal - paidAmount
    const dueDate = order.dueDate ? new Date(order.dueDate).toLocaleDateString() : ''

    // Ensure logo is loaded from storage if showLogo is enabled but logoUrl is missing
    let logoUrl = printSettings.logoUrl || ''
    if (printSettings.showLogo && !logoUrl) {
      const { getLogo } = await import('./logoStorage')
      const logo = await getLogo()
      if (logo) {
        logoUrl = logo.dataUrl
      }
    }

    const templateData = {
      type: 'INVOICE',
      orderId: order.id.slice(-6),
      companyName: printSettings.companyName || '',
      companyAddress: printSettings.companyAddress || '',
      companyPhone: printSettings.companyPhone || '',
      companyEmail: printSettings.companyEmail || '',
      companyGst: printSettings.companyGst || '',
      logoUrl: printSettings.showLogo && logoUrl ? logoUrl : '',
      billToLabel: 'Bill To',
      customerName: customer?.name || 'N/A',
      orderDate,
      dueDate,
      status: order.status,
      notes: order.notes || '',
      items: itemsWithNames,
      showDiscount: true,
      subtotal: orderSubtotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
      discount: orderDiscount > 0 ? orderDiscount.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
      tax: orderTax > 0 && orderTaxType !== 'cgst_sgst' ? orderTax.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
      cgst: orderCgst && typeof orderCgst === 'number' && orderCgst > 0 ? Number(orderCgst).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '',
      sgst: orderSgst && typeof orderSgst === 'number' && orderSgst > 0 ? Number(orderSgst).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '',
      total: orderTotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
      paidAmount: paidAmount > 0 && dueAmount > 0 ? paidAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
      dueAmount: dueAmount > 0 ? dueAmount.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
      footerText: printSettings.footerText || 'Thank you for your business!',
    }

    // Render invoice HTML
    const invoiceHTML = renderTemplate(template, templateData)

    // Generate PDF via Electron main process
    const result = await pdfAPI.generate({
      html: invoiceHTML,
      filename: `invoice-${order.id.slice(0, 8)}.pdf`,
    })

    if (!result.success || !result.filePath) {
      throw new Error(result.error || 'Failed to generate PDF')
    }

    return result.filePath
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

export async function generatePurchaseOrderPDF(
  order: PurchaseOrder,
  items: PurchaseOrderItem[],
  supplier: Customer | null,
): Promise<string> {
  if (!pdfAPI) {
    throw new Error('PDF generation requires Electron environment')
  }

  try {
    // Load print settings and template
    const printSettings = await getPrintSettings()
    const paperSize = printSettings.defaultPaperSize === 'saved' ? 'a4' : printSettings.defaultPaperSize
    const template = await getTemplateByPaperSize(paperSize)

    if (!template) {
      throw new Error('Invoice template not found')
    }

    // Get product names for items (format same as InvoicePrint.tsx)
    const itemsWithNames = await Promise.all(
      items.map(async (item) => {
        const product = await getProduct(item.productId)
        const unitPrice = item.unitCost
        const mrp = product?.mrp || 0
        // Use the actual unitCost from order as sale price
        const salePrice = unitPrice
        // Purchase orders typically don't have discounts
        const discountPercent = 0
        
        return {
          productName: product?.title || item.productId,
          quantity: item.quantity,
          mrp: mrp > 0 ? mrp.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
          salePrice: salePrice.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
          unitPrice: unitPrice.toLocaleString(undefined, {
            style: 'currency',
            currency: 'INR',
          }),
          discount: '0.00',
          discountPercent: '',
          lineTotal: item.lineTotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
        }
      })
    )

    // Prepare template data (format same as InvoicePrint.tsx)
    const orderDate = new Date(order.issuedDate || order.createdAt).toLocaleDateString()
    const orderTotal = order.total || 0
    const orderSubtotal = order.subtotal || 0
    const orderTax = order.tax || 0
    const orderDiscount = 0 // Purchase orders typically don't have discounts
    const orderTaxType = order.taxType
    const orderCgst = order.cgst
    const orderSgst = order.sgst

    // Ensure logo is loaded from storage if showLogo is enabled but logoUrl is missing
    let logoUrl = printSettings.logoUrl || ''
    if (printSettings.showLogo && !logoUrl) {
      const { getLogo } = await import('./logoStorage')
      const logo = await getLogo()
      if (logo) {
        logoUrl = logo.dataUrl
      }
    }

    const templateData = {
      type: 'PURCHASE ORDER',
      orderId: order.id.slice(-6),
      companyName: printSettings.companyName || '',
      companyAddress: printSettings.companyAddress || '',
      companyPhone: printSettings.companyPhone || '',
      companyEmail: printSettings.companyEmail || '',
      companyGst: printSettings.companyGst || '',
      logoUrl: printSettings.showLogo && logoUrl ? logoUrl : '',
      billToLabel: 'Supplier',
      customerName: supplier?.name || order.supplierName || 'N/A',
      orderDate,
      dueDate: '',
      status: order.status,
      notes: order.notes || '',
      items: itemsWithNames,
      showDiscount: false, // Purchase orders typically don't show discounts
      subtotal: orderSubtotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
      discount: '',
      tax: orderTax > 0 && orderTaxType !== 'cgst_sgst' ? orderTax.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '',
      cgst: orderCgst && typeof orderCgst === 'number' && orderCgst > 0 ? Number(orderCgst).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '',
      sgst: orderSgst && typeof orderSgst === 'number' && orderSgst > 0 ? Number(orderSgst).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '',
      total: orderTotal.toLocaleString(undefined, { style: 'currency', currency: 'INR' }),
      paidAmount: '',
      dueAmount: '',
      footerText: printSettings.footerText || 'Thank you for your business!',
    }

    // Render invoice HTML for purchase order
    const invoiceHTML = renderTemplate(template, templateData)

    // Generate PDF via Electron main process
    const result = await pdfAPI.generate({
      html: invoiceHTML,
      filename: `purchase-order-${order.id.slice(0, 8)}.pdf`,
    })

    if (!result.success || !result.filePath) {
      throw new Error(result.error || 'Failed to generate PDF')
    }

    return result.filePath
  } catch (error) {
    console.error('Error generating purchase order PDF:', error)
    throw error
  }
}

