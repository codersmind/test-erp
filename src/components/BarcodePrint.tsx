import { useEffect, useRef, useState } from 'react'
// @ts-ignore - jsbarcode doesn't have proper TypeScript definitions
import JsBarcode from 'jsbarcode'
import { getBarcodePaperSettings, type BarcodePaperSize, type BarcodeFormat } from '../utils/barcodePaperSettings'

interface BarcodePrintProps {
  barcode: string
  productTitle?: string
  productSku?: string
  onClose?: () => void
}

export const BarcodePrint = ({ barcode, productTitle, productSku, onClose }: BarcodePrintProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const [quantity, setQuantity] = useState(1)
  const [paperSizes, setPaperSizes] = useState<BarcodePaperSize[]>([])
  const [selectedPaperSizeId, setSelectedPaperSizeId] = useState<string>('a4')
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('CODE128')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadPaperSizes = async () => {
      try {
        const settings = await getBarcodePaperSettings()
        setPaperSizes(settings.paperSizes)
        setBarcodeFormat(settings.defaultFormat || 'CODE128')
        if (settings.paperSizes.length > 0 && !settings.paperSizes.find((s) => s.id === selectedPaperSizeId)) {
          setSelectedPaperSizeId(settings.paperSizes[0].id)
        }
      } catch (error) {
        console.error('Failed to load paper sizes:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadPaperSizes()
  }, [])

  const renderBarcode = (targetSvg: SVGSVGElement | null, barcodeValue: string, format: BarcodeFormat) => {
    if (!targetSvg || !barcodeValue || barcodeValue.trim() === '') return false
    
    // Clear previous content
    targetSvg.innerHTML = ''
    
    try {
      // Try with the selected format
      JsBarcode(targetSvg, barcodeValue.trim(), {
        format: format,
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 16,
        margin: 10,
        background: 'transparent',
      })
      return true
    } catch (error) {
      console.error('Failed to generate barcode with format', format, ':', error)
      // Fallback to CODE128 if format fails
      try {
        targetSvg.innerHTML = ''
        JsBarcode(targetSvg, barcodeValue.trim(), {
          format: 'CODE128',
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 16,
          margin: 10,
          background: 'transparent',
        })
        return true
      } catch (fallbackError) {
        console.error('Failed to generate barcode with fallback:', fallbackError)
        // Show error message in SVG
        targetSvg.innerHTML = `
          <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
            <text x="100" y="50" text-anchor="middle" fill="red" font-size="12" font-family="Arial">
              Barcode generation failed
            </text>
            <text x="100" y="70" text-anchor="middle" fill="gray" font-size="10" font-family="Arial">
              Value: ${barcodeValue.substring(0, 20)}
            </text>
          </svg>
        `
        return false
      }
    }
  }

  // Render barcode immediately when barcode value changes
  useEffect(() => {
    if (!barcode || barcode.trim() === '') {
      if (svgRef.current) {
        svgRef.current.innerHTML = `
          <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
            <text x="100" y="50" text-anchor="middle" fill="gray" font-size="12" font-family="Arial">
              No barcode available
            </text>
          </svg>
        `
      }
      return
    }
    
    // Render immediately with CODE128 first (most compatible)
    const renderImmediate = () => {
      if (!svgRef.current) {
        console.warn('SVG ref is not available')
        return
      }
      
      try {
        console.log('Rendering barcode:', barcode.trim())
        svgRef.current.innerHTML = ''
        JsBarcode(svgRef.current, barcode.trim(), {
          format: 'CODE128',
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 16,
          margin: 10,
          background: 'transparent',
        })
        console.log('Barcode rendered successfully, SVG content length:', svgRef.current.innerHTML.length)
      } catch (error) {
        console.error('Failed to render barcode:', error)
        if (svgRef.current) {
          svgRef.current.innerHTML = `
            <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
              <text x="100" y="50" text-anchor="middle" fill="red" font-size="12" font-family="Arial">
                Error: ${error instanceof Error ? error.message : 'Unknown error'}
              </text>
            </svg>
          `
        }
      }
    }
    
    // Try immediate render, then retry after a short delay
    renderImmediate()
    const timeoutId = setTimeout(() => {
      if (svgRef.current && svgRef.current.innerHTML.length < 100) {
        // If SVG is still empty, try again
        renderImmediate()
      }
    }, 200)
    
    return () => clearTimeout(timeoutId)
  }, [barcode])

  // Update barcode format when format changes (if barcode already exists)
  useEffect(() => {
    if (!svgRef.current || !barcode || barcode.trim() === '' || !barcodeFormat) return
    
    // Only update if format is different from CODE128 (which was rendered initially)
    if (barcodeFormat === 'CODE128') return
    
    const timeoutId = setTimeout(() => {
      if (svgRef.current) {
        renderBarcode(svgRef.current, barcode, barcodeFormat)
      }
    }, 200)
    
    return () => clearTimeout(timeoutId)
  }, [barcodeFormat, barcode])

  const generateBarcodeSVG = (barcodeValue: string): string => {
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    try {
      JsBarcode(tempSvg, barcodeValue, {
        format: barcodeFormat,
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 12,
        margin: 5,
      })
      return tempSvg.outerHTML
    } catch (error) {
      console.error('Failed to generate barcode SVG:', error)
      // Fallback to CODE128
      try {
        JsBarcode(tempSvg, barcodeValue, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 12,
          margin: 5,
        })
        return tempSvg.outerHTML
      } catch (fallbackError) {
        console.error('Failed to generate barcode SVG with fallback:', fallbackError)
        return ''
      }
    }
  }

  const handlePrint = () => {
    if (!barcode) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const paperConfig = paperSizes.find((s) => s.id === selectedPaperSizeId)
    if (!paperConfig) {
      alert('Selected paper size not found')
      printWindow.close()
      return
    }

    const totalLabels = quantity
    const labelsPerPage = paperConfig.cols * paperConfig.rows
    const totalPages = Math.ceil(totalLabels / labelsPerPage)

    // Generate barcode SVG once
    const barcodeSvg = generateBarcodeSVG(barcode)
    if (!barcodeSvg) {
      alert('Failed to generate barcode')
      printWindow.close()
      return
    }

    // Generate label HTML
    const labelHtml = `
      <div class="label">
        ${barcodeSvg}
        ${productTitle ? `<div class="product-info">${productTitle}${productSku ? `<div>SKU: ${productSku}</div>` : ''}</div>` : ''}
        <div class="barcode-value">${barcode}</div>
      </div>
    `

    // Generate grid of labels
    let labelsGrid = ''
    for (let i = 0; i < totalLabels; i++) {
      labelsGrid += labelHtml
    }

    const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Barcode Labels - ${productTitle || barcode}</title>
    <style>
      @media print {
        @page {
          size: ${paperConfig.width}mm ${paperConfig.height}mm;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
        }
        .labels-grid {
          page-break-after: always;
        }
        .labels-grid:last-child {
          page-break-after: auto;
        }
      }
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
      }
      .labels-grid {
        display: grid;
        grid-template-columns: repeat(${paperConfig.cols}, 1fr);
        gap: 2mm;
        padding: 5mm;
        width: ${paperConfig.width}mm;
        min-height: ${paperConfig.height}mm;
        box-sizing: border-box;
      }
      .label {
        width: ${paperConfig.labelWidth}mm;
        height: ${paperConfig.labelHeight}mm;
        border: 1px dashed #ccc;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2mm;
        box-sizing: border-box;
        text-align: center;
      }
      .label svg {
        max-width: 100%;
        max-height: 60%;
      }
      .product-info {
        margin-top: 2px;
        font-size: 8px;
        max-width: 100%;
        word-wrap: break-word;
        line-height: 1.2;
      }
      .barcode-value {
        margin-top: 2px;
        font-size: 10px;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    ${Array.from({ length: totalPages }, (_, pageIndex) => {
      const startIndex = pageIndex * labelsPerPage
      const endIndex = Math.min(startIndex + labelsPerPage, totalLabels)
      const pageLabels = Array.from({ length: endIndex - startIndex }, () => labelHtml).join('')
      return `<div class="labels-grid">${pageLabels}</div>`
    }).join('')}
  </body>
</html>`

    // Use document.write for printing (necessary for print functionality)
    printWindow.document.open('text/html', 'replace')
    // @ts-ignore - document.write is deprecated but necessary for printing custom content
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  if (!barcode) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">No barcode available</p>
      </div>
    )
  }

  const paperConfig = paperSizes.find((s) => s.id === selectedPaperSizeId)
  if (!paperConfig) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading paper sizes...</p>
      </div>
    )
  }

  const labelsPerPage = paperConfig.cols * paperConfig.rows
  const totalPages = Math.ceil(quantity / labelsPerPage)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div ref={printRef} className="barcode-container mb-4">
        <div className="flex justify-center items-center min-h-[120px] bg-white dark:bg-slate-200 rounded border border-slate-200 dark:border-slate-700 p-4">
          <svg 
            ref={svgRef} 
            className="mx-auto"
            style={{ display: 'block', minWidth: '200px', minHeight: '80px' }}
            xmlns="http://www.w3.org/2000/svg"
          />
        </div>
        {productTitle && (
          <div className="product-info mt-2 text-center text-xs text-slate-600 dark:text-slate-400">
            {productTitle}
            {productSku && <div className="mt-1">SKU: {productSku}</div>}
          </div>
        )}
        <div className="barcode-value mt-2 text-center text-sm font-semibold text-slate-900 dark:text-slate-50">
          {barcode}
        </div>
      </div>

      {/* Print Settings */}
      <div className="mb-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Number of Labels
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Paper Size / Label Sheet
          </label>
          <select
            value={selectedPaperSizeId}
            onChange={(e) => setSelectedPaperSizeId(e.target.value)}
            disabled={isLoading}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          >
            {paperSizes.map((size) => (
              <option key={size.id} value={size.id}>
                {size.name} ({size.cols}x{size.rows} = {size.cols * size.rows} labels per page)
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Paper: {paperConfig.width}mm × {paperConfig.height}mm • Label: {paperConfig.labelWidth}mm × {paperConfig.labelHeight}mm
          </p>
        </div>

        <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          <p className="font-semibold">Print Summary:</p>
          <p>Total Labels: {quantity}</p>
          <p>Labels per Page: {labelsPerPage}</p>
          <p>Total Pages: {totalPages}</p>
          <p>Paper Size: {paperConfig.width}mm × {paperConfig.height}mm</p>
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Close
          </button>
        )}
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          Print {quantity} Label{quantity !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}

