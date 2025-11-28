import type { SalesOrder, SalesOrderItem, PurchaseOrder, PurchaseOrderItem } from '../db/schema'
import type { Customer } from '../db/schema'

// Check if we're in Electron with Node.js access
const isElectron = typeof window !== 'undefined' && (window as any).process?.type === 'renderer'
const hasNodeAccess = isElectron && typeof require !== 'undefined'

export interface WhatsAppSettings {
  enabled: boolean
  isConnected: boolean
  messageTemplate?: string
}

class WhatsAppService {
  private client: any = null
  private isInitialized = false
  private isConnected = false
  private qrCode: string | null = null
  private onQRCallback: ((qr: string) => void) | null = null
  private onReadyCallback: (() => void) | null = null
  private onDisconnectedCallback: (() => void) | null = null
  private isInitializing = false

  async initialize(settings: WhatsAppSettings): Promise<void> {
    if (!settings.enabled) {
      throw new Error('WhatsApp integration is not enabled')
    }

    if (!hasNodeAccess) {
      throw new Error('WhatsApp integration requires Electron environment with Node.js access')
    }

    // Prevent concurrent initializations
    if (this.isInitializing) {
      console.log('WhatsApp initialization already in progress')
      // Don't throw error, just return - the existing initialization will handle it
      // But allow caller to check for QR code
      return
    }

    // If already initialized and connected, don't re-initialize
    if (this.isInitialized && this.client) {
      try {
        const isConnected = await this.checkConnection()
        if (isConnected) {
          console.log('WhatsApp already initialized and connected, skipping re-initialization')
          return
        }
      } catch (error) {
        // If check fails, proceed with re-initialization
        console.log('Connection check failed, proceeding with initialization')
      }
    }

    this.isInitializing = true

    try {
      // Dynamically import whatsapp-web.js (only works in Electron renderer)
      const { Client, LocalAuth } = require('whatsapp-web.js')
      const path = require('path')
      
      // Try to load qrcode-terminal (optional - only for terminal debugging)
      let qrcode: any = null
      try {
        qrcode = require('qrcode-terminal')
      } catch (error) {
        // qrcode-terminal is optional, continue without it
        console.log('qrcode-terminal not available, skipping terminal QR code output')
      }

      // Only destroy existing client if it's truly broken or we need to force re-initialize
      // IMPORTANT: Don't destroy if client exists - LocalAuth will restore session automatically
      if (this.client && this.isInitialized) {
        try {
          const isConnected = await this.checkConnection()
          if (isConnected) {
            // Client is connected, no need to re-initialize
            console.log('Client already connected, preserving session')
            this.isInitializing = false
            return
          } else {
            // Client exists but not connected - try to re-initialize without destroying
            // This preserves the session files on disk
            console.log('Client exists but not connected, will re-initialize (session preserved)')
            // Don't destroy - just set to null so we create a new client instance
            // The LocalAuth will use the existing session files
            this.client = null
            this.isInitialized = false
            this.isConnected = false
          }
        } catch (error) {
          // Check failed - client might be in bad state, but still preserve session files
          console.log('Connection check failed, will re-initialize (session preserved)')
          this.client = null
          this.isInitialized = false
          this.isConnected = false
        }
      } else if (this.client) {
        // Client exists but not initialized - clear it
        this.client = null
      }

      // Get session path using Electron app
      // In renderer process, we need to use remote.app or fallback to OS paths
      let sessionPath: string
      try {
        // Try electron.remote (works with enableRemoteModule: true)
        const electron = require('electron')
        if (electron.remote && electron.remote.app) {
          sessionPath = path.join(electron.remote.app.getPath('userData'), 'whatsapp-session')
        } else {
          throw new Error('remote.app not available')
        }
      } catch (error) {
        // Fallback to default userData location if remote is not available
        // This matches Electron's default userData path
        const os = require('os')
        const homeDir = os.homedir()
        const platform = process.platform
        let appDataPath: string
        
        if (platform === 'win32') {
          appDataPath = path.join(homeDir, 'AppData', 'Roaming', 'ponytory-erp')
        } else if (platform === 'darwin') {
          appDataPath = path.join(homeDir, 'Library', 'Application Support', 'ponytory-erp')
        } else {
          appDataPath = path.join(homeDir, '.config', 'ponytory-erp')
        }
        
        // Ensure directory exists
        const fs = require('fs')
        if (!fs.existsSync(appDataPath)) {
          fs.mkdirSync(appDataPath, { recursive: true })
        }
        
        sessionPath = path.join(appDataPath, 'whatsapp-session')
        console.warn('Using fallback path for WhatsApp session:', sessionPath)
      }

      // Create WhatsApp client
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: sessionPath,
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      })

      // Set up event listeners
      // Note: 'qr' event only fires if there's NO existing session
      // If session exists, 'authenticated' or 'ready' will fire instead
      this.client.on('qr', (qr: string) => {
        console.log('QR code event received - no existing session found')
        this.qrCode = qr
        // Generate QR code in terminal for debugging (if available)
        if (qrcode) {
          try {
            qrcode.generate(qr, { small: true })
          } catch (error) {
            // Ignore terminal QR code errors
          }
        }
        // Call callback if set
        if (this.onQRCallback) {
          console.log('Calling QR callback')
          this.onQRCallback(qr)
        } else {
          console.warn('QR callback not set when QR code was generated')
        }
      })

      this.client.on('ready', () => {
        this.qrCode = null
        this.isConnected = true
        if (this.onReadyCallback) {
          this.onReadyCallback()
        }
      })

      this.client.on('authenticated', () => {
        console.log('WhatsApp authenticated - session restored')
        this.qrCode = null
        this.isConnected = true
        // If we have a ready callback, call it (session restored means we're ready)
        if (this.onReadyCallback) {
          this.onReadyCallback()
        }
      })

      this.client.on('auth_failure', (msg: string) => {
        console.error('WhatsApp authentication failed:', msg)
        this.isConnected = false
      })

      this.client.on('disconnected', (reason: string) => {
        console.log('WhatsApp disconnected:', reason)
        this.isConnected = false
        if (this.onDisconnectedCallback) {
          this.onDisconnectedCallback()
        }
      })

      // Listen for incoming messages (optional - for future features)
      this.client.on('message_create', (_message: any) => {
        // Handle incoming messages if needed
        // Example: if (message.body === '!ping') {
        //   this.client.sendMessage(message.from, 'pong')
        // }
      })

      // Initialize the client
      await this.client.initialize()

      this.isInitialized = true
      this.isInitializing = false
    } catch (error: any) {
      this.isInitializing = false
      console.error('WhatsApp initialization error:', error)
      // Reset state on error
      this.isInitialized = false
      this.isConnected = false
      this.client = null
      throw new Error(error.message || 'Failed to initialize WhatsApp')
    }
  }

  async getQRCode(): Promise<string | null> {
    // If we have a QR code stored, return it
    if (this.qrCode) {
      return this.qrCode
    }
    
    // If client exists but no QR code yet, wait a bit and check again
    // (QR code might be generated asynchronously)
    if (this.client && this.isInitializing) {
      // Wait a bit for QR code to be generated
      await new Promise(resolve => setTimeout(resolve, 1000))
      return this.qrCode
    }
    
    return this.qrCode
  }

  async checkConnection(): Promise<boolean> {
    if (!this.client || !this.isInitialized) {
      return false
    }

    try {
      const info = this.client.info
      this.isConnected = !!info
      return this.isConnected
    } catch (error) {
      this.isConnected = false
      return false
    }
  }

  getInitializationStatus(): boolean {
    return this.isInitialized
  }

  async sendMessage(to: string, message: string, mediaPath?: string, caption?: string): Promise<boolean> {
    if (!this.client || !this.isInitialized) {
      throw new Error('WhatsApp client is not initialized')
    }

    if (!this.isConnected) {
      throw new Error('WhatsApp client is not connected')
    }

    try {
      // Format phone number
      const phoneNumber = this.formatPhoneNumber(to)
      if (!phoneNumber) {
        throw new Error('Invalid phone number format')
      }

      const chatId = `${phoneNumber}@c.us`

      if (mediaPath) {
        const { MessageMedia } = require('whatsapp-web.js')
        const media = MessageMedia.fromFilePath(mediaPath)
        await this.client.sendMessage(chatId, media, { caption: caption || message })
      } else {
        await this.client.sendMessage(chatId, message)
      }

      return true
    } catch (error: any) {
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

    // Format message
    const message = this.formatInvoiceMessage(order, items, customer, settings.messageTemplate)

    // Send PDF with message as caption
    try {
      return await this.sendMessage(phoneNumber, message, pdfPath, message)
    } catch (error: any) {
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

    // Format message
    const message = this.formatPurchaseOrderMessage(order, items, supplier, settings.messageTemplate)

    // Send PDF with message as caption
    try {
      return await this.sendMessage(phoneNumber, message, pdfPath, message)
    } catch (error: any) {
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
    
    const digits = phone.replace(/\D/g, '')

    if (digits.length >= 10) {
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
    return digits.length >= 10
  }

  // Event listener methods
  onQR(callback: (qr: string) => void): void {
    this.onQRCallback = callback
  }

  onReady(callback: () => void): void {
    this.onReadyCallback = callback
  }

  onDisconnected(callback: () => void): void {
    this.onDisconnectedCallback = callback
  }

  async disconnect(): Promise<void> {
    // IMPORTANT: Don't destroy the client or session files
    // LocalAuth automatically saves session to disk in the dataPath directory
    // We want to preserve it so the user doesn't need to reconnect
    // Just mark as disconnected - the session files remain on disk
    if (this.client) {
      try {
        // Try to close browser pages gracefully without destroying the session
        // The session data in the dataPath directory will be preserved
        if (this.client.pupBrowser) {
          const browser = this.client.pupBrowser
          if (browser && browser.isConnected()) {
            const pages = await browser.pages()
            for (const page of pages) {
              try {
                await page.close()
              } catch (e) {
                // Ignore errors closing pages
              }
            }
            // Close browser but don't destroy - session files remain
            try {
              await browser.close()
            } catch (e) {
              // Ignore errors closing browser
            }
          }
        }
      } catch (error) {
        // If closing fails, that's okay - session files are still preserved on disk
        console.warn('Error closing WhatsApp browser:', error)
      }
      // Set client to null but session files remain on disk
      // Next time we initialize with the same dataPath, LocalAuth will automatically restore the session
      this.client = null
    }
    this.isInitialized = false
    this.isConnected = false
    this.qrCode = null
    console.log('WhatsApp disconnected (session files preserved - will auto-restore on next connect)')
  }

  // Method to completely remove session (use when user wants to disconnect permanently)
  async removeSession(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy()
      } catch (error) {
        console.warn('Error destroying WhatsApp client:', error)
      }
      this.client = null
    }
    this.isInitialized = false
    this.isConnected = false
    this.qrCode = null
    
    // Also remove the session files from disk
    try {
      const path = require('path')
      const fs = require('fs')
      const os = require('os')
      
      let sessionPath: string
      try {
        const electron = require('electron')
        if (electron.remote && electron.remote.app) {
          sessionPath = path.join(electron.remote.app.getPath('userData'), 'whatsapp-session')
        } else {
          throw new Error('remote.app not available')
        }
      } catch (error) {
        const homeDir = os.homedir()
        const platform = process.platform
        let appDataPath: string
        
        if (platform === 'win32') {
          appDataPath = path.join(homeDir, 'AppData', 'Roaming', 'ponytory-erp')
        } else if (platform === 'darwin') {
          appDataPath = path.join(homeDir, 'Library', 'Application Support', 'ponytory-erp')
        } else {
          appDataPath = path.join(homeDir, '.config', 'ponytory-erp')
        }
        sessionPath = path.join(appDataPath, 'whatsapp-session')
      }
      
      // Remove session directory if it exists
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true })
        console.log('WhatsApp session removed from:', sessionPath)
      }
    } catch (error) {
      console.warn('Error removing WhatsApp session files:', error)
    }
  }
}

export const whatsappService = new WhatsAppService()
