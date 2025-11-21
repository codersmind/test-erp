import type { WhatsAppSettings } from '../utils/integrationSettings'
import type { SalesOrder, SalesOrderItem, PurchaseOrder, PurchaseOrderItem } from '../db/schema'
import type { Customer } from '../db/schema'

// Check if we're in Electron by checking for exposed APIs
const isElectron = typeof window !== 'undefined' && !!(window as any).electronWhatsApp

// Type definitions for the exposed Electron APIs
interface ElectronWhatsAppAPI {
  initialize(options: { sessionPath?: string }): Promise<{ success: boolean; connected?: boolean; error?: string }>
  getQR(): Promise<{ qrCode: string | null }>
  checkConnection(): Promise<{ connected: boolean }>
  sendMessage(options: { to: string; message: string; mediaPath?: string; caption?: string }): Promise<{ success: boolean; error?: string }>
  disconnect(): Promise<{ success: boolean; error?: string }>
  onQR(callback: (qr: string) => void): () => void
  onReady(callback: () => void): () => void
  onAuthFailure(callback: (msg: string) => void): () => void
  onDisconnected(callback: () => void): () => void
}

const whatsAppAPI: ElectronWhatsAppAPI | null = isElectron ? (window as any).electronWhatsApp : null

export interface WhatsAppMessage {
  to: string
  message: string
  media?: {
    path: string
    caption?: string
  }
}

class WhatsAppService {
  private isInitialized = false
  private isConnected = false

  async initialize(settings: WhatsAppSettings): Promise<void> {
    if (!settings.enabled) {
      throw new Error('WhatsApp integration is not enabled')
    }

    if (!whatsAppAPI) {
      throw new Error('WhatsApp integration requires Electron environment')
    }

    try {
      // Send initialization request to main process
      const result = await whatsAppAPI.initialize({
        sessionPath: settings.sessionPath,
      })

      if (result.success) {
        this.isInitialized = true
        this.isConnected = result.connected || false
      } else {
        throw new Error(result.error || 'Failed to initialize WhatsApp')
      }
    } catch (error) {
      console.error('WhatsApp initialization error:', error)
      throw error
    }
  }

  async getQRCode(): Promise<string | null> {
    if (!whatsAppAPI) {
      return null
    }

    try {
      const result = await whatsAppAPI.getQR()
      let qrCode = result.qrCode || null
      
      if (!qrCode) {
        console.log('No QR code received')
        return null
      }
      
      console.log('Raw QR code received, length:', qrCode.length, 'starts with:', qrCode.substring(0, 50))
      
      // If already a data URL, return as is
      if (qrCode.startsWith('data:')) {
        console.log('QR code is already a data URL')
        return qrCode
      }
      
      // wwebjs-electron returns QR codes as base64 strings
      // First remove @ (not valid base64)
      qrCode = qrCode.replace(/@/g, '')
      
      // Remove whitespace, commas, newlines
      qrCode = qrCode.replace(/[\s\n\r,]/g, '')
      
      // The QR code is split by = characters (used as separators, not just padding)
      // Join all parts together and calculate proper base64 padding
      const parts = qrCode.split('=')
      if (parts.length > 1) {
        // Join all parts (removing the = separators)
        const joined = parts.join('')
        // Calculate proper base64 padding (base64 strings must be multiple of 4)
        const remainder = joined.length % 4
        const padding = remainder ? '='.repeat(4 - remainder) : ''
        qrCode = joined + padding
      }
      
      console.log('Cleaned QR code, length:', qrCode.length)
      
      // Check if it's long enough to be a base64 PNG image (typically > 1000 chars)
      // If it's too short, it's likely the QR code data, not the image
      if (qrCode.length < 1000) {
        console.log('QR code is too short for PNG, returning as QR data string')
        // Return the cleaned QR code string - it will be rendered using QRCodeSVG component
        return qrCode
      }
      
      // Validate it's a valid base64 string
      if (!/^[A-Za-z0-9+/=]+$/.test(qrCode)) {
        console.error('Invalid QR code format after cleaning')
        return null
      }
      
      // Format as data URL for PNG image
      const dataUrl = `data:image/png;base64,${qrCode}`
      console.log('Formatted data URL, length:', dataUrl.length)
      return dataUrl
    } catch (error) {
      console.error('Error getting QR code:', error)
      return null
    }
  }

  async checkConnection(): Promise<boolean> {
    if (!whatsAppAPI) {
      return false
    }

    try {
      const result = await whatsAppAPI.checkConnection()
      this.isConnected = result.connected || false
      return this.isConnected
    } catch (error) {
      console.error('Error checking connection:', error)
      return false
    }
  }

  async sendMessage(to: string, message: string, mediaPath?: string, caption?: string): Promise<boolean> {
    if (!whatsAppAPI) {
      throw new Error('WhatsApp integration requires Electron environment')
    }

    if (!this.isInitialized) {
      throw new Error('WhatsApp service is not initialized')
    }

    try {
      const result = await whatsAppAPI.sendMessage({
        to,
        message,
        mediaPath,
        caption,
      })

      return result.success || false
    } catch (error) {
      console.error('Error sending WhatsApp message:', error)
      throw error
    }
  }

  async sendInvoice(
    order: SalesOrder,
    items: SalesOrderItem[],
    customer: Customer,
    settings: WhatsAppSettings,
  ): Promise<boolean> {
    if (!this.isValidPhoneNumber(customer.phone)) {
      throw new Error('Customer phone number is required and must be valid (at least 10 digits)')
    }

    const phoneNumber = this.formatPhoneNumber(customer.phone || '')

    if (!phoneNumber) {
      throw new Error('Invalid phone number format')
    }

    // Generate PDF
    const { generateInvoicePDF } = await import('../utils/pdfGenerator')
    const pdfPath = await generateInvoicePDF(order, items, customer)

    // Format message for caption
    const message = this.formatInvoiceMessage(order, items, customer, settings.messageTemplate)

    // Send PDF with message as caption
    try {
      return await this.sendMessage(phoneNumber, message, pdfPath, message)
    } catch (error: any) {
      // Check if error indicates number not on WhatsApp
      if (error.message?.includes('not registered') || error.message?.includes('not found') || error.message?.includes('invalid')) {
        throw new Error('This phone number is not registered on WhatsApp. Please verify the phone number.')
      }
      throw error
    }
  }

  async sendPurchaseOrderInvoice(
    order: PurchaseOrder,
    items: PurchaseOrderItem[],
    supplier: Customer,
    settings: WhatsAppSettings,
  ): Promise<boolean> {
    if (!this.isValidPhoneNumber(supplier.phone)) {
      throw new Error('Supplier phone number is required and must be valid (at least 10 digits)')
    }

    const phoneNumber = this.formatPhoneNumber(supplier.phone || '')

    if (!phoneNumber) {
      throw new Error('Invalid phone number format')
    }

    // Generate PDF
    const { generatePurchaseOrderPDF } = await import('../utils/pdfGenerator')
    const pdfPath = await generatePurchaseOrderPDF(order, items, supplier)

    // Format message for caption
    const message = this.formatPurchaseOrderMessage(order, items, supplier, settings.messageTemplate)

    // Send PDF with message as caption
    try {
      return await this.sendMessage(phoneNumber, message, pdfPath, message)
    } catch (error: any) {
      // Check if error indicates number not on WhatsApp
      if (error.message?.includes('not registered') || error.message?.includes('not found') || error.message?.includes('invalid')) {
        throw new Error('This phone number is not registered on WhatsApp. Please verify the phone number.')
      }
      throw error
    }
  }

  private formatInvoiceMessage(
    order: SalesOrder,
    items: SalesOrderItem[],
    customer: Customer,
    template?: string,
  ): string {
    const defaultTemplate = `Hello {{customerName}},

Your invoice #{{invoiceNumber}} for ₹{{total}} is ready.

Items:
{{items}}

Subtotal: ₹{{subtotal}}
Tax: ₹{{tax}}
Total: ₹{{total}}
Paid: ₹{{paidAmount}}
Due: ₹{{dueAmount}}

Thank you for your business!`

    const templateText = template || defaultTemplate

    const itemsList = items
      .map((item, index) => {
        return `${index + 1}. Item - Qty: ${item.quantity}, Amount: ₹${item.lineTotal}`
      })
      .join('\n')

    return templateText
      .replace(/\{\{customerName\}\}/g, customer.name)
      .replace(/\{\{invoiceNumber\}\}/g, order.id.slice(0, 8))
      .replace(/\{\{subtotal\}\}/g, order.subtotal.toFixed(2))
      .replace(/\{\{tax\}\}/g, order.tax.toFixed(2))
      .replace(/\{\{total\}\}/g, order.total.toFixed(2))
      .replace(/\{\{paidAmount\}\}/g, (order.paidAmount || 0).toFixed(2))
      .replace(/\{\{dueAmount\}\}/g, (order.total - (order.paidAmount || 0)).toFixed(2))
      .replace(/\{\{items\}\}/g, itemsList)
  }

  private formatPurchaseOrderMessage(
    order: PurchaseOrder,
    items: PurchaseOrderItem[],
    supplier: Customer,
    template?: string,
  ): string {
    const defaultTemplate = `Hello {{supplierName}},

Your purchase order #{{orderNumber}} for ₹{{total}} is ready.

Items:
{{items}}

Subtotal: ₹{{subtotal}}
Tax: ₹{{tax}}
Total: ₹{{total}}
Paid: ₹{{paidAmount}}
Due: ₹{{dueAmount}}

Thank you!`

    const templateText = template || defaultTemplate

    const itemsList = items
      .map((item, index) => {
        return `${index + 1}. Item - Qty: ${item.quantity}, Amount: ₹${item.lineTotal}`
      })
      .join('\n')

    return templateText
      .replace(/\{\{supplierName\}\}/g, supplier.name)
      .replace(/\{\{orderNumber\}\}/g, order.id.slice(0, 8))
      .replace(/\{\{subtotal\}\}/g, order.subtotal.toFixed(2))
      .replace(/\{\{tax\}\}/g, order.tax.toFixed(2))
      .replace(/\{\{total\}\}/g, order.total.toFixed(2))
      .replace(/\{\{paidAmount\}\}/g, (order.paidAmount || 0).toFixed(2))
      .replace(/\{\{dueAmount\}\}/g, (order.total - (order.paidAmount || 0)).toFixed(2))
      .replace(/\{\{items\}\}/g, itemsList)
  }

  private formatPhoneNumber(phone: string): string {
    if (!phone || phone.trim() === '') {
      return ''
    }
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '')

    // If phone starts with country code, return as is
    if (digits.length >= 10) {
      // If it's 10 digits (Indian number), add 91 country code
      if (digits.length === 10) {
        return `91${digits}`
      }
      return digits
    }

    return ''
  }

  isValidPhoneNumber(phone: string | undefined | null): boolean {
    if (!phone || phone.trim() === '') {
      return false
    }
    
    const digits = phone.replace(/\D/g, '')
    // Phone number should have at least 10 digits
    return digits.length >= 10
  }

  async disconnect(): Promise<void> {
    if (!whatsAppAPI) {
      return
    }

    try {
      await whatsAppAPI.disconnect()
      this.isInitialized = false
      this.isConnected = false
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error)
    }
  }
}

export const whatsappService = new WhatsAppService()

