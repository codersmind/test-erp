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
      {{#if logoUrl}}
      <img src="{{logoUrl}}" alt="Company Logo" class="logo" />
      {{/if}}
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

.header .logo {
  max-height: 80px;
  max-width: 200px;
  margin-bottom: 15px;
  object-fit: contain;
  display: block;
  margin-left: auto;
  margin-right: auto;
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
  const defaultId = await getDefaultTemplateId()
  if (defaultId === id) {
    throw new Error('Cannot delete the default template. Please reset it instead or set another template as default first.')
  }
  
  const templates = await getInvoiceTemplates()
  const updatedTemplates = templates.filter(t => t.id !== id)
  await set(INVOICE_TEMPLATES_KEY, updatedTemplates)
}

export const resetDefaultTemplate = async (): Promise<InvoiceTemplate> => {
  const defaultId = await getDefaultTemplateId()
  if (!defaultId) {
    // If no default template exists, create one
    return await initializeDefaultTemplate()
  }
  
  const templates = await getInvoiceTemplates()
  const defaultTemplate = templates.find(t => t.id === defaultId)
  
  if (!defaultTemplate) {
    // Default template was deleted somehow, create a new one
    const newDefault = await saveInvoiceTemplate({
      name: 'Default Template',
      html: DEFAULT_TEMPLATE_HTML,
      css: DEFAULT_TEMPLATE_CSS,
      isDefault: true,
    })
    await setDefaultTemplateId(newDefault.id)
    return newDefault
  }
  
  // Reset the default template to original content
  const resetTemplate = await saveInvoiceTemplate({
    id: defaultTemplate.id,
    name: 'Default Template',
    html: DEFAULT_TEMPLATE_HTML,
    css: DEFAULT_TEMPLATE_CSS,
    isDefault: true,
  })
  
  return resetTemplate
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
  
  // Replace simple variables (including ../parent references)
  const replaceVariables = (text: string, context: Record<string, any> = data): string => {
    let result = text
    // Replace ../parent variables first
    result = result.replace(/\{\{\s*\.\.\/(\w+)\s*\}\}/g, (_match, varName) => {
      return String(context[varName] || '')
    })
    // Replace regular variables
    Object.keys(context).forEach(key => {
      const value = context[key]
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(value))
      }
    })
    return result
  }
  
  // Handle each loops {{#each items}}...{{/each}} (process before conditionals to handle nested ../)
  html = html.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, arrayName, content) => {
    const items = data[arrayName] || []
    return items.map((item: any) => {
      let itemHtml = content
      // Replace item variables
      Object.keys(item).forEach(key => {
        itemHtml = itemHtml.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(item[key] || ''))
      })
      // Replace ../parent variables (access parent context)
      itemHtml = replaceVariables(itemHtml, data)
      return itemHtml
    }).join('')
  })
  
  // Helper function to resolve variable name (handles ../variable syntax)
  const resolveVariable = (varName: string, context: Record<string, any> = data): any => {
    // Handle ../variable syntax (parent context)
    if (varName.startsWith('../')) {
      const actualVarName = varName.substring(3) // Remove '../'
      return context[actualVarName]
    }
    return context[varName]
  }
  
  // Helper function to check if a condition is truthy
  const isTruthy = (value: any): boolean => {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.length > 0
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'boolean') return value
    return true
  }
  
  // Handle conditional blocks with else/else if support
  // Process from innermost to outermost by finding all if blocks
  let changed = true
  let iterations = 0
  while (changed && iterations < 10) {
    changed = false
    iterations++
    
    // Find the innermost {{#if}} block (supports ../variable syntax)
    // Pattern: {{#if variable}} or {{#if ../variable}}
    const ifBlockRegex = /\{\{#if\s+([\w\/\.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g
    html = html.replace(ifBlockRegex, (match, varName, content) => {
      // Check if this block contains another if (if so, skip for now)
      if (/\{\{#if\s+[\w\/\.]+\}\}/.test(content)) {
        return match
      }
      
      changed = true
      
      // Split content by else/else if markers to find all blocks
      const parts: Array<{ type: 'if' | 'elseif' | 'else'; condition?: string; content: string }> = []
      
      // Extract main if content (before any else/else if)
      const mainIfEnd = content.search(/\{\{else\s+if|\{\{else\}\}/)
      if (mainIfEnd === -1) {
        // No else/else if, just main content
        parts.push({ type: 'if', condition: varName.trim(), content })
      } else {
        parts.push({ type: 'if', condition: varName.trim(), content: content.substring(0, mainIfEnd) })
        
        // Extract else if and else blocks (supports ../variable in else if)
        let remaining = content.substring(mainIfEnd)
        // Updated regex to support ../variable in else if
        const elseIfRegex = /\{\{else\s+if\s+([\w\/\.]+)\}\}([\s\S]*?)(?=\{\{else\s+if|\{\{else\}\}|\{\{\/if\}\}|$)/g
        const elseRegex = /\{\{else\}\}([\s\S]*?)(?=\{\{\/if\}\}|$)/
        
        // Find all else if blocks
        let elseIfMatch
        while ((elseIfMatch = elseIfRegex.exec(remaining)) !== null) {
          parts.push({
            type: 'elseif',
            condition: elseIfMatch[1].trim(),
            content: elseIfMatch[2]
          })
          remaining = remaining.substring(elseIfMatch.index + elseIfMatch[0].length)
        }
        
        // Find else block
        const elseMatch = remaining.match(elseRegex)
        if (elseMatch) {
          parts.push({
            type: 'else',
            content: elseMatch[1]
          })
        }
      }
      
      // Evaluate conditions in order
      for (const part of parts) {
        if (part.type === 'if') {
          const value = resolveVariable(part.condition!, data)
          if (isTruthy(value)) {
            return replaceVariables(part.content)
          }
        }
        if (part.type === 'elseif') {
          const value = resolveVariable(part.condition!, data)
          if (isTruthy(value)) {
            return replaceVariables(part.content)
          }
        }
        if (part.type === 'else') {
          return replaceVariables(part.content)
        }
      }
      
      // No condition matched, return empty
      return ''
    })
  }
  
  // Replace remaining variables
  html = replaceVariables(html)
  
  return html
}

