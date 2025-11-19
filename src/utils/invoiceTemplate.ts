import { get, set } from 'idb-keyval'
import { POS_TEMPLATE_HTML, POS_TEMPLATE_CSS } from './posTemplate'

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
          {{#if showDiscount}}
          <th class="text-right">MRP</th>
          <th class="text-right">Sale Price</th>
          <th class="text-right">Item Discount</th>
          {{else}}
          <th class="text-right">Price</th>
          {{/if}}
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {{#each items}}
        <tr>
          <td>{{productName}}</td>
          <td class="text-right">{{quantity}}</td>
          {{#if ../showDiscount}}
          <td class="text-right mrp-cell">
            {{#if mrp}}
            <span class="mrp-strikethrough">{{mrp}}</span>
            {{#if discountPercent}}
            <br><span class="discount-percent">{{discountPercent}}</span>
            {{/if}}
            {{else}}
            -
            {{/if}}
          </td>
          <td class="text-right">{{salePrice}}</td>
          <td class="text-right">{{discount}}</td>
          {{else}}
          <td class="text-right">{{unitPrice}}</td>
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
        <span>Discount (includes round off):</span>
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
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.invoice {
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  background: white;
  box-sizing: border-box;
  overflow-x: hidden;
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
  font-weight: bold;
}

.info-section {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 20px;
}

.bill-to, .order-details {
  flex: 1;
  min-width: 0;
}

.bill-to h3, .order-details h3 {
  font-size: 14px;
  margin-bottom: 10px;
  border-bottom: 1px solid #ccc;
  padding-bottom: 5px;
  font-weight: bold;
}

.bill-to p, .order-details p {
  margin: 4px 0;
  font-size: 12px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  font-size: 12px;
  table-layout: fixed;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.items-table th,
.items-table td {
  padding: 8px 6px;
  border-bottom: 1px solid #ddd;
  text-align: left;
  vertical-align: top;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  overflow: hidden;
}

.items-table th {
  background-color: #f5f5f5;
  font-weight: bold;
  font-size: 11px;
  white-space: normal;
  border-bottom: 2px solid #333;
  overflow: hidden;
}

.items-table td {
  font-size: 11px;
  white-space: normal;
}

/* First column (Item) - always present */
.items-table th:first-child,
.items-table td:first-child {
  padding-left: 8px;
  width: 25%;
  max-width: 25%;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* Second column (Qty) - always present */
.items-table th:nth-child(2),
.items-table td:nth-child(2) {
  width: 8%;
  max-width: 8%;
  overflow: hidden;
}

/* Third column - varies: MRP (with discount) or Price (without discount) */
.items-table th:nth-child(3),
.items-table td:nth-child(3) {
  width: 12%;
  max-width: 12%;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* Fourth column - varies: Sale Price (with discount) or Total (without discount) */
.items-table th:nth-child(4),
.items-table td:nth-child(4) {
  width: 15%;
  max-width: 15%;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* Fifth column - only when showDiscount: Item Discount */
.items-table th:nth-child(5),
.items-table td:nth-child(5) {
  width: 12%;
  max-width: 12%;
  overflow: hidden;
}

/* Last column (Total) - always present */
.items-table th:last-child,
.items-table td:last-child {
  padding-right: 8px;
  width: 28%;
  max-width: 28%;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

.items-table .text-right {
  text-align: right;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

.items-table .mrp-cell {
  line-height: 1.4;
  white-space: normal;
}

.items-table .mrp-strikethrough {
  text-decoration: line-through;
  color: #666;
  display: block;
}

.items-table .discount-percent {
  color: #2563eb;
  font-weight: 500;
  font-size: 10px;
  display: block;
  margin-top: 2px;
}

/* POS Receipt (80mm) and narrow paper specific styles - handled by printSettings.ts */

.text-right {
  text-align: right;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

.totals {
  margin-top: 20px;
  border-top: 2px solid #333;
  padding-top: 10px;
  width: 100%;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  margin: 6px 0;
  font-size: 12px;
}

.totals-row span:first-child {
  font-weight: 500;
}

.totals-row span:last-child {
  text-align: right;
  font-weight: 500;
}

.totals-row.total {
  font-weight: bold;
  font-size: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 2px solid #333;
}

.totals-row.total span {
  font-weight: bold;
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
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
  
  .invoice {
    max-width: 100%;
    width: 100%;
    overflow-x: hidden;
  }
  
  .items-table {
    width: 100%;
    max-width: 100%;
    table-layout: fixed;
  }
  
  .items-table th,
  .items-table td {
    overflow: hidden;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    white-space: normal;
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

// Get template by paper size (POS or A4)
export const getTemplateByPaperSize = async (paperSize: 'pos' | 'a4' | 'custom' | 'saved'): Promise<InvoiceTemplate | null> => {
  let templates = await getInvoiceTemplates()
  
  // If no templates exist, initialize them
  if (templates.length === 0) {
    await initializeDefaultTemplate()
    templates = await getInvoiceTemplates()
  }
  
  // Normalize paper size for template lookup
  const normalizedSize = paperSize === 'saved' || paperSize === 'custom' ? 'a4' : paperSize
  
  // Look for paper size specific templates first
  // Check for exact name matches or partial matches
  let sizeSpecificTemplate = templates.find(t => {
    const nameLower = t.name.toLowerCase()
    if (normalizedSize === 'pos') {
      return nameLower.includes('pos') || nameLower.includes('receipt')
    } else if (normalizedSize === 'a4') {
      // For A4, prefer templates that explicitly say A4, but also accept default/template
      return nameLower.includes('a4') || (nameLower.includes('default') && !nameLower.includes('pos'))
    }
    return false
  })
  
  if (sizeSpecificTemplate) {
    return sizeSpecificTemplate
  }
  
  // If no size-specific template found, ensure templates exist and return appropriate one
  if (normalizedSize === 'pos') {
    // Check if we need to create POS template
    const hasPosTemplate = templates.some(t => {
      const nameLower = t.name.toLowerCase()
      return nameLower.includes('pos') || nameLower.includes('receipt')
    })
    if (!hasPosTemplate) {
      // Create POS template
      const posTemplate = await saveInvoiceTemplate({
        name: 'POS Receipt Template',
        html: POS_TEMPLATE_HTML,
        css: POS_TEMPLATE_CSS,
        isDefault: false,
      })
      return posTemplate
    }
  } else if (normalizedSize === 'a4') {
    // For A4, if no specific template found, create one if needed
    const hasA4Template = templates.some(t => {
      const nameLower = t.name.toLowerCase()
      return nameLower.includes('a4') || (nameLower.includes('default') && !nameLower.includes('pos'))
    })
    if (!hasA4Template) {
      // Create A4 template
      const a4Template = await saveInvoiceTemplate({
        name: 'A4 Template',
        html: DEFAULT_TEMPLATE_HTML,
        css: DEFAULT_TEMPLATE_CSS,
        isDefault: true,
      })
      await setDefaultTemplateId(a4Template.id)
      return a4Template
    }
  }
  
  // Return default template (usually A4)
  const defaultTemplate = await getDefaultTemplate()
  if (defaultTemplate) {
    return defaultTemplate
  }
  
  // Last resort: return first available template
  return templates.length > 0 ? templates[0] : null
}

export const initializeDefaultTemplate = async (): Promise<InvoiceTemplate> => {
  const templates = await getInvoiceTemplates()
  if (templates.length > 0) {
    return templates[0]
  }
  
  // Create A4 template (default)
  const a4Template = await saveInvoiceTemplate({
    name: 'A4 Template',
    html: DEFAULT_TEMPLATE_HTML,
    css: DEFAULT_TEMPLATE_CSS,
    isDefault: true,
  })
  
  // Create POS template
  await saveInvoiceTemplate({
    name: 'POS Receipt Template',
    html: POS_TEMPLATE_HTML,
    css: POS_TEMPLATE_CSS,
    isDefault: false,
  })
  
  await setDefaultTemplateId(a4Template.id)
  return a4Template
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
  
  // Helper function to find matching closing tag for a {{#if}} block
  const findMatchingEndIf = (text: string, startPos: number): number => {
    let depth = 1
    let pos = startPos
    const ifStartRegex = /\{\{#if\s+[\w\/\.]+\}\}/g
    const ifEndRegex = /\{\{\/if\}\}/g
    
    // Find the position after the opening {{#if}}
    const openMatch = text.substring(startPos).match(/\{\{#if\s+[\w\/\.]+\}\}/)
    if (!openMatch) return -1
    pos = startPos + openMatch.index! + openMatch[0].length
    
    // Now search for matching {{/if}}
    while (pos < text.length && depth > 0) {
      // Check for opening {{#if}} first (before checking closing)
      ifStartRegex.lastIndex = pos
      const openIf = ifStartRegex.exec(text)
      ifEndRegex.lastIndex = pos
      const closeIf = ifEndRegex.exec(text)
      
      let nextOpen = openIf ? openIf.index : Infinity
      let nextClose = closeIf ? closeIf.index : Infinity
      
      if (nextClose < nextOpen) {
        // Found closing tag
        depth--
        if (depth === 0) {
          return nextClose + closeIf![0].length
        }
        pos = nextClose + closeIf![0].length
      } else if (nextOpen < Infinity) {
        // Found opening tag
        depth++
        pos = nextOpen + openIf![0].length
      } else {
        break // No more tags found
      }
    }
    
    return -1 // No matching closing tag found
  }
  
  // Helper function to process conditionals in a given context (recursively processes nested conditionals)
  const processConditionals = (htmlContent: string, context: Record<string, any>): string => {
    let result = htmlContent
    let changed = true
    let iterations = 0
    
    while (changed && iterations < 20) {
      changed = false
      iterations++
      
      // Find all {{#if}} blocks and process innermost first
      const ifStartRegex = /\{\{#if\s+([\w\/\.]+)\}\}/g
      let match
      const blocks: Array<{ start: number; end: number; varName: string; content: string; fullMatch: string; hasNestedIf: boolean }> = []
      
      // Find all if blocks
      while ((match = ifStartRegex.exec(result)) !== null) {
        const startPos = match.index
        const varName = match[1].trim()
        const endPos = findMatchingEndIf(result, startPos)
        
        if (endPos > startPos) {
          const fullMatch = result.substring(startPos, endPos)
          const contentStart = startPos + match[0].length
          const content = result.substring(contentStart, endPos - 7) // -7 for {{/if}}
          
          // Check if this block contains another if
          const hasNestedIf = /\{\{#if\s+[\w\/\.]+\}\}/.test(content)
          blocks.push({ start: startPos, end: endPos, varName, content, fullMatch, hasNestedIf })
        }
      }
      
      // Process innermost blocks first (those without nested ifs)
      const innermostBlocks = blocks.filter(b => !b.hasNestedIf)
      if (innermostBlocks.length === 0 && blocks.length > 0) {
        // If all blocks have nested ifs, process the first one anyway (shouldn't happen with proper recursion)
        break
      }
      
      // Process blocks from end to start to avoid position shifting issues
      innermostBlocks.sort((a, b) => b.start - a.start)
      
      for (const block of innermostBlocks) {
        changed = true
        
        // Resolve variable name (handles ../variable syntax)
        const value = resolveVariable(block.varName, context)
        const isTrue = isTruthy(value)
        
        // Split content by else/else if markers
        const parts: Array<{ type: 'if' | 'elseif' | 'else'; condition?: string; content: string }> = []
        
        const mainIfEnd = block.content.search(/\{\{else\s+if|\{\{else\}\}/)
        if (mainIfEnd === -1) {
          parts.push({ type: 'if', condition: block.varName, content: block.content })
        } else {
          parts.push({ type: 'if', condition: block.varName, content: block.content.substring(0, mainIfEnd) })
          
          let remaining = block.content.substring(mainIfEnd)
          const elseIfRegex = /\{\{else\s+if\s+([\w\/\.]+)\}\}([\s\S]*?)(?=\{\{else\s+if|\{\{else\}\}|\{\{\/if\}\}|$)/g
          const elseRegex = /\{\{else\}\}([\s\S]*?)(?=\{\{\/if\}\}|$)/
          
          let elseIfMatch
          while ((elseIfMatch = elseIfRegex.exec(remaining)) !== null) {
            parts.push({
              type: 'elseif',
              condition: elseIfMatch[1].trim(),
              content: elseIfMatch[2]
            })
            remaining = remaining.substring(elseIfMatch.index + elseIfMatch[0].length)
          }
          
          const elseMatch = remaining.match(elseRegex)
          if (elseMatch) {
            parts.push({ type: 'else', content: elseMatch[1] })
          }
        }
        
        // Evaluate conditions and get appropriate content
        let replacement = ''
        for (const part of parts) {
          if (part.type === 'if') {
            if (isTrue) {
              replacement = part.content
              break
            }
          } else if (part.type === 'elseif') {
            const elseifValue = resolveVariable(part.condition!, context)
            if (isTruthy(elseifValue)) {
              replacement = part.content
              break
            }
          } else if (part.type === 'else') {
            replacement = part.content
            break
          }
        }
        
        // Recursively process any nested conditionals in the replacement
        replacement = processConditionals(replacement, context)
        
        // Replace the block in the result
        result = result.substring(0, block.start) + replacement + result.substring(block.end)
        
        // Break to restart the loop (positions have changed)
        break
      }
    }
    
    return result
  }
  
  // Handle each loops {{#each items}}...{{/each}} (process before conditionals to handle nested ../)
  html = html.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, arrayName, content) => {
    const items = data[arrayName] || []
    return items.map((item: any) => {
      // Create a combined context (item + parent data) - item properties override parent
      const itemContext = { ...data, ...item }
      
      let itemHtml = content
      
      // First, process ALL nested conditionals recursively in the item context
      // This will process {{#if ../showDiscount}} and nested {{#if mrp}} blocks
      itemHtml = processConditionals(itemHtml, itemContext)
      
      // Then replace item variables (after conditionals are processed)
      Object.keys(item).forEach(key => {
        const value = item[key]
        if (value !== undefined && value !== null) {
          itemHtml = itemHtml.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(value))
        }
      })
      
      // Finally replace ../parent variables (access parent context only, not item context)
      // This handles any remaining ../ references
      itemHtml = replaceVariables(itemHtml, data)
      
      return itemHtml
    }).join('')
  })
  
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

