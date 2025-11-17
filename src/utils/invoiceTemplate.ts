import { get, set } from 'idb-keyval'

export interface InvoiceTemplate {
  id: string
  name: string
  html: string
  css: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

const INVOICE_TEMPLATES_KEY = 'erp_invoice_templates'
const DEFAULT_TEMPLATE_ID_KEY = 'erp_default_template_id'

const DEFAULT_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice</title>
  <style>
    {{CSS}}
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      {{#if companyName}}
      <h1>{{companyName}}</h1>
      {{/if}}
      {{#if companyAddress}}
      <p class="address">{{companyAddress}}</p>
      {{/if}}
      {{#if companyPhone}}
      <p>Phone: {{companyPhone}}</p>
      {{/if}}
      {{#if companyEmail}}
      <p>Email: {{companyEmail}}</p>
      {{/if}}
      {{#if companyGst}}
      <p>GST: {{companyGst}}</p>
      {{/if}}
    </div>
    
    <div class="invoice-title">
      <h2>{{type}}</h2>
      <p>#{{orderId}}</p>
    </div>
    
    <div class="info-section">
      <div class="bill-to">
        <h3>{{billToLabel}}</h3>
        <p>{{customerName}}</p>
      </div>
      <div class="order-details">
        <h3>Order Details</h3>
        <p>Date: {{orderDate}}</p>
        {{#if dueDate}}
        <p>Due Date: {{dueDate}}</p>
        {{/if}}
        <p>Status: {{status}}</p>
        {{#if notes}}
        <p>Notes: {{notes}}</p>
        {{/if}}
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Price</th>
          {{#if showDiscount}}
          <th class="text-right">Discount</th>
          {{/if}}
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {{#each items}}
        <tr>
          <td>{{productName}}</td>
          <td class="text-right">{{quantity}}</td>
          <td class="text-right">{{unitPrice}}</td>
          {{#if ../showDiscount}}
          <td class="text-right">{{discount}}</td>
          {{/if}}
          <td class="text-right">{{lineTotal}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    
    <div class="totals">
      <div class="totals-row">
        <span>Subtotal:</span>
        <span>{{subtotal}}</span>
      </div>
      {{#if discount}}
      <div class="totals-row">
        <span>Discount:</span>
        <span>-{{discount}}</span>
      </div>
      {{/if}}
      {{#if cgst}}
      <div class="totals-row">
        <span>CGST:</span>
        <span>{{cgst}}</span>
      </div>
      <div class="totals-row">
        <span>SGST:</span>
        <span>{{sgst}}</span>
      </div>
      {{else if tax}}
      <div class="totals-row">
        <span>GST:</span>
        <span>{{tax}}</span>
      </div>
      {{/if}}
      <div class="totals-row total">
        <span>Total:</span>
        <span>{{total}}</span>
      </div>
      {{#if paidAmount}}
      <div class="totals-row">
        <span>Paid:</span>
        <span>{{paidAmount}}</span>
      </div>
      {{/if}}
      {{#if dueAmount}}
      <div class="totals-row" style="color: #dc2626; font-weight: bold;">
        <span>Due Amount:</span>
        <span>{{dueAmount}}</span>
      </div>
      {{/if}}
    </div>
    
    {{#if footerText}}
    <div class="footer">
      <p>{{footerText}}</p>
    </div>
    {{/if}}
  </div>
</body>
</html>`

const DEFAULT_TEMPLATE_CSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  font-size: 12px;
  color: #333;
  padding: 20px;
}

.invoice {
  max-width: 800px;
  margin: 0 auto;
  background: white;
}

.header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 2px solid #333;
}

.header h1 {
  font-size: 24px;
  margin-bottom: 10px;
}

.header p {
  margin: 5px 0;
  font-size: 11px;
}

.invoice-title {
  text-align: center;
  margin: 20px 0;
}

.invoice-title h2 {
  font-size: 20px;
  margin-bottom: 5px;
}

.info-section {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.bill-to, .order-details {
  flex: 1;
}

.bill-to h3, .order-details h3 {
  font-size: 14px;
  margin-bottom: 10px;
  border-bottom: 1px solid #ccc;
  padding-bottom: 5px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.items-table th,
.items-table td {
  padding: 8px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

.items-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.text-right {
  text-align: right;
}

.totals {
  margin-top: 20px;
  border-top: 2px solid #333;
  padding-top: 10px;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  margin: 5px 0;
}

.totals-row.total {
  font-weight: bold;
  font-size: 16px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #333;
}

.footer {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
  font-style: italic;
}

@media print {
  body {
    padding: 0;
  }
}`

export const getInvoiceTemplates = async (): Promise<InvoiceTemplate[]> => {
  const templates = await get<InvoiceTemplate[]>(INVOICE_TEMPLATES_KEY)
  return templates || []
}

export const saveInvoiceTemplate = async (template: Omit<InvoiceTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<InvoiceTemplate> => {
  const templates = await getInvoiceTemplates()
  const now = new Date().toISOString()
  
  let updatedTemplate: InvoiceTemplate
  
  if (template.id) {
    // Update existing template
    const existing = templates.find(t => t.id === template.id)
    if (!existing) {
      throw new Error('Template not found')
    }
    updatedTemplate = {
      ...existing,
      ...template,
      updatedAt: now,
    }
    const updatedTemplates = templates.map(t => t.id === template.id ? updatedTemplate : t)
    await set(INVOICE_TEMPLATES_KEY, updatedTemplates)
  } else {
    // Create new template
    const { nanoid } = await import('nanoid')
    updatedTemplate = {
      ...template,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }
    await set(INVOICE_TEMPLATES_KEY, [...templates, updatedTemplate])
  }
  
  return updatedTemplate
}

export const deleteInvoiceTemplate = async (id: string): Promise<void> => {
  const templates = await getInvoiceTemplates()
  const updatedTemplates = templates.filter(t => t.id !== id)
  await set(INVOICE_TEMPLATES_KEY, updatedTemplates)
  
  // If deleted template was default, clear default
  const defaultId = await getDefaultTemplateId()
  if (defaultId === id) {
    await set(DEFAULT_TEMPLATE_ID_KEY, null)
  }
}

export const getDefaultTemplateId = async (): Promise<string | null> => {
  return await get<string | null>(DEFAULT_TEMPLATE_ID_KEY) || null
}

export const setDefaultTemplateId = async (id: string | null): Promise<void> => {
  await set(DEFAULT_TEMPLATE_ID_KEY, id)
}

export const getDefaultTemplate = async (): Promise<InvoiceTemplate | null> => {
  const defaultId = await getDefaultTemplateId()
  if (!defaultId) return null
  
  const templates = await getInvoiceTemplates()
  return templates.find(t => t.id === defaultId) || null
}

export const initializeDefaultTemplate = async (): Promise<InvoiceTemplate> => {
  const templates = await getInvoiceTemplates()
  if (templates.length > 0) {
    return templates[0]
  }
  
  // Create default template
  const defaultTemplate = await saveInvoiceTemplate({
    name: 'Default Template',
    html: DEFAULT_TEMPLATE_HTML,
    css: DEFAULT_TEMPLATE_CSS,
    isDefault: true,
  })
  
  await setDefaultTemplateId(defaultTemplate.id)
  return defaultTemplate
}

// Simple template engine to replace placeholders
export const renderTemplate = (template: InvoiceTemplate, data: Record<string, any>): string => {
  let html = template.html
  
  // Replace CSS placeholder
  html = html.replace(/\{\{CSS\}\}/g, template.css)
  
  // Replace simple variables
  Object.keys(data).forEach(key => {
    const value = data[key]
    if (typeof value === 'string' || typeof value === 'number') {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
    }
  })
  
  // Handle conditional blocks {{#if variable}}...{{/if}}
  html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, varName, content) => {
    return data[varName] ? content : ''
  })
  
  // Handle each loops {{#each items}}...{{/each}}
  html = html.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, arrayName, content) => {
    const items = data[arrayName] || []
    return items.map((item: any) => {
      let itemHtml = content
      // Replace item variables
      Object.keys(item).forEach(key => {
        itemHtml = itemHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(item[key] || ''))
      })
      // Replace ../parent variables
      Object.keys(data).forEach(key => {
        if (key !== arrayName) {
          itemHtml = itemHtml.replace(new RegExp(`\\{\\{\\.\\./${key}\\}\\}`, 'g'), String(data[key] || ''))
        }
      })
      return itemHtml
    }).join('')
  })
  
  return html
}

