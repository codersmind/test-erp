import type { SalesOrder, SalesOrderItem, PurchaseOrder, PurchaseOrderItem } from '../db/schema'
import type { Customer } from '../db/schema'
import { getProduct } from '../db/localDataService'
import { getPrintSettings } from './printSettings'
import { getTemplateByPaperSize, renderTemplate } from './invoiceTemplate'

// Check if we're in Electron by checking for exposed APIs
const isElectron = typeof window !== 'undefined' && !!(window as any).electronPDF

interface ElectronPDFAPI {
  generate(options: { html: string; filename: string }): Promise<{ success: boolean; filePath?: string; error?: string }>
}

const pdfAPI: ElectronPDFAPI | null = isElectron ? (window as any).electronPDF : null

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

    // Load products for items
    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        const product = await getProduct(item.productId)
        return {
          item,
          product: product || null,
          mrp: product?.mrp || item.unitPrice,
          salePrice: product?.salePrice || product?.price || item.unitPrice,
          discountPercent: item.discount > 0 ? (item.discount / (item.quantity * item.unitPrice)) * 100 : 0,
        }
      })
    )

    // Render invoice HTML
    const invoiceHTML = renderTemplate(template, {
      order,
      items: itemsWithProducts,
      customer: customer || { name: 'N/A', phone: '', email: '', address: '' },
      type: 'sales',
      printSettings,
    })

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

    // Load products for items
    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        const product = await getProduct(item.productId)
        return {
          item,
          product: product || null,
          mrp: product?.mrp || item.unitCost,
          salePrice: product?.salePrice || product?.price || item.unitCost,
          discountPercent: 0, // Purchase orders typically don't have discounts
        }
      })
    )

    // Render invoice HTML for purchase order
    const invoiceHTML = renderTemplate(template, {
      order,
      items: itemsWithProducts,
      customer: supplier || { name: order.supplierName || 'N/A', phone: '', email: '', address: '' },
      type: 'purchase',
      printSettings,
    })

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

