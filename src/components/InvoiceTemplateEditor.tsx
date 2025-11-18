import { useState, useEffect, useMemo } from 'react'
import { getInvoiceTemplates, saveInvoiceTemplate, deleteInvoiceTemplate, getDefaultTemplateId, setDefaultTemplateId, initializeDefaultTemplate, resetDefaultTemplate, renderTemplate, type InvoiceTemplate } from '../utils/invoiceTemplate'

interface InvoiceTemplateEditorProps {
  isOpen: boolean
  onClose: () => void
}

// Sample data for preview
const SAMPLE_TEMPLATE_DATA: Record<string, any> = {
  type: 'INVOICE',
  orderId: '123456',
  companyName: 'Your Company Name',
  companyAddress: '123 Business Street, City, State 12345',
  companyPhone: '+1 (555) 123-4567',
  companyEmail: 'info@company.com',
  companyGst: '27AAACC1234C1Z5',
  billToLabel: 'Bill To',
  customerName: 'John Doe',
  orderDate: new Date().toLocaleDateString(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 30 days from now
  status: 'confirmed',
  notes: 'Sample order notes',
  items: [
    {
      productName: 'Product A',
      quantity: '2',
      unitPrice: '₹500.00',
      discount: '₹50.00',
      lineTotal: '₹950.00',
    },
    {
      productName: 'Product B',
      quantity: '1',
      unitPrice: '₹1,200.00',
      discount: '₹0.00',
      lineTotal: '₹1,200.00',
    },
    {
      productName: 'Product C',
      quantity: '3',
      unitPrice: '₹300.00',
      discount: '₹30.00',
      lineTotal: '₹870.00',
    },
  ],
  showDiscount: true,
  subtotal: '₹3,020.00',
  discount: '₹80.00',
  tax: '',
  cgst: '₹147.00',
  sgst: '₹147.00',
  total: '₹3,234.00',
  paidAmount: '₹1,500.00',
  dueAmount: '₹1,734.00',
  footerText: 'Thank you for your business!',
}

interface TemplatePreviewProps {
  html: string
  css: string
}

const TemplatePreview = ({ html, css }: TemplatePreviewProps) => {
  const previewHtml = useMemo(() => {
    try {
      const tempTemplate: InvoiceTemplate = {
        id: 'preview',
        name: 'Preview',
        html,
        css,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return renderTemplate(tempTemplate, SAMPLE_TEMPLATE_DATA)
    } catch (error) {
      console.error('Preview render error:', error)
      return `<div style="padding: 20px; color: red;">Error rendering preview: ${error instanceof Error ? error.message : 'Unknown error'}</div>`
    }
  }, [html, css])

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Template Preview</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This is how your invoice will look with sample data. Make sure to save your changes before previewing.
        </p>
      </div>
      <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div
          dangerouslySetInnerHTML={{ __html: previewHtml }}
          className="invoice-preview"
          style={{ 
            maxWidth: '100%',
          }}
        />
        <style>{`
          .invoice-preview {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .invoice-preview body,
          .invoice-preview html {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .invoice-preview * {
            color: #000000 !important;
          }
          .invoice-preview h1,
          .invoice-preview h2,
          .invoice-preview h3,
          .invoice-preview h4,
          .invoice-preview h5,
          .invoice-preview h6 {
            color: #000000 !important;
          }
          .invoice-preview p,
          .invoice-preview span,
          .invoice-preview div,
          .invoice-preview td,
          .invoice-preview th {
            color: #000000 !important;
          }
          .invoice-preview table {
            border-color: #000000 !important;
          }
          .invoice-preview th,
          .invoice-preview td {
            border-color: #cccccc !important;
          }
        `}</style>
      </div>
    </div>
  )
}

export const InvoiceTemplateEditor = ({ isOpen, onClose }: InvoiceTemplateEditorProps) => {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateHtml, setTemplateHtml] = useState('')
  const [templateCss, setTemplateCss] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [defaultTemplateId, setDefaultTemplateIdState] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  const loadTemplates = async () => {
    const loadedTemplates = await getInvoiceTemplates()
    if (loadedTemplates.length === 0) {
      // Initialize with default template
      const defaultTemplate = await initializeDefaultTemplate()
      setTemplates([defaultTemplate])
      setSelectedTemplate(defaultTemplate)
      setTemplateName(defaultTemplate.name)
      setTemplateHtml(defaultTemplate.html)
      setTemplateCss(defaultTemplate.css)
      setDefaultTemplateIdState(defaultTemplate.id)
    } else {
      setTemplates(loadedTemplates)
      const defaultId = await getDefaultTemplateId()
      setDefaultTemplateIdState(defaultId)
      
      // Select default template or first one
      const defaultTemplate = defaultId 
        ? loadedTemplates.find(t => t.id === defaultId) || loadedTemplates[0]
        : loadedTemplates[0]
      setSelectedTemplate(defaultTemplate)
      setTemplateName(defaultTemplate.name)
      setTemplateHtml(defaultTemplate.html)
      setTemplateCss(defaultTemplate.css)
    }
  }

  const handleSelectTemplate = (template: InvoiceTemplate) => {
    setSelectedTemplate(template)
    setTemplateName(template.name)
    setTemplateHtml(template.html)
    setTemplateCss(template.css)
  }

  const handleSave = async () => {
    if (!templateName.trim() || !templateHtml.trim() || !templateCss.trim()) {
      alert('Please fill in all fields')
      return
    }

    setIsSaving(true)
    try {
      const saved = await saveInvoiceTemplate({
        id: selectedTemplate?.id,
        name: templateName,
        html: templateHtml,
        css: templateCss,
        isDefault: selectedTemplate?.isDefault || false,
      })
      
      await loadTemplates()
      setSelectedTemplate(saved)
      
      // If this was the default, update default ID
      if (defaultTemplateId === saved.id || (selectedTemplate?.isDefault && !defaultTemplateId)) {
        await setDefaultTemplateId(saved.id)
        setDefaultTemplateIdState(saved.id)
      }
    } catch (error) {
      console.error('Failed to save template:', error)
      alert('Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateNew = () => {
    setSelectedTemplate(null)
    setTemplateName('')
    setTemplateHtml(`<!DOCTYPE html>
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
    <!-- Your custom HTML here -->
    <!-- Available variables: {{companyName}}, {{orderId}}, {{customerName}}, {{items}}, etc. -->
  </div>
</body>
</html>`)
    setTemplateCss(`/* Your custom CSS here */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
}`)
  }

  const handleDelete = async () => {
    if (!selectedTemplate) return
    if (!window.confirm(`Are you sure you want to delete "${selectedTemplate.name}"?`)) return

    setIsDeleting(true)
    try {
      await deleteInvoiceTemplate(selectedTemplate.id)
      await loadTemplates()
      // Clear selection if deleted template was selected
      if (selectedTemplate.id === defaultTemplateId) {
        setSelectedTemplate(null)
        setTemplateName('')
        setTemplateHtml('')
        setTemplateCss('')
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete template')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleResetDefault = async () => {
    if (!selectedTemplate || defaultTemplateId !== selectedTemplate.id) return
    if (!window.confirm('Are you sure you want to reset the default template to its original state? All your customizations will be lost.')) return

    setIsResetting(true)
    try {
      const resetTemplate = await resetDefaultTemplate()
      await loadTemplates()
      setSelectedTemplate(resetTemplate)
      setTemplateName(resetTemplate.name)
      setTemplateHtml(resetTemplate.html)
      setTemplateCss(resetTemplate.css)
    } catch (error) {
      console.error('Failed to reset template:', error)
      alert('Failed to reset template')
    } finally {
      setIsResetting(false)
    }
  }

  const handleSetDefault = async () => {
    if (!selectedTemplate) return
    await setDefaultTemplateId(selectedTemplate.id)
    setDefaultTemplateIdState(selectedTemplate.id)
    await loadTemplates()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-lg font-semibold">Invoice Template Editor</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Customize your invoice design using HTML and CSS. Use placeholders like {'{{companyName}}'}, {'{{orderId}}'}, {'{{items}}'}, etc.
          </p>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Template List Sidebar */}
          <div className="w-64 border-r border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="mb-4">
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + New Template
              </button>
            </div>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="font-medium">{template.name}</div>
                  {defaultTemplateId === template.id && (
                    <div className="text-xs text-blue-600 dark:text-blue-400">Default</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Editor/Preview Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800">
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    !showPreview
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    showPreview
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {!showPreview ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="My Custom Template"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                      HTML Template
                    </label>
                    <textarea
                      value={templateHtml}
                      onChange={(e) => setTemplateHtml(e.target.value)}
                      rows={15}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                      placeholder="Enter HTML template..."
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Available placeholders: {'{{companyName}}'}, {'{{orderId}}'}, {'{{customerName}}'}, {'{{orderDate}}'}, {'{{dueDate}}'}, {'{{items}}'}, {'{{subtotal}}'}, {'{{total}}'}, {'{{paidAmount}}'}, {'{{dueAmount}}'}, etc.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                      CSS Styles
                    </label>
                    <textarea
                      value={templateCss}
                      onChange={(e) => setTemplateCss(e.target.value)}
                      rows={15}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                      placeholder="Enter CSS styles..."
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Use {'{{CSS}}'} placeholder in HTML to inject these styles.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
                <TemplatePreview html={templateHtml} css={templateCss} />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            <div className="flex justify-between">
            <div className="flex gap-2">
              {selectedTemplate && (
                <>
                  <button
                    type="button"
                    onClick={handleSetDefault}
                    disabled={defaultTemplateId === selectedTemplate.id}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Set as Default
                  </button>
                  {defaultTemplateId === selectedTemplate.id ? (
                    <button
                      type="button"
                      onClick={handleResetDefault}
                      disabled={isResetting}
                      className="rounded-md border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:bg-slate-800 dark:text-orange-300 dark:hover:bg-orange-900/20"
                    >
                      {isResetting ? 'Resetting...' : 'Reset to Default'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-900/20"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

