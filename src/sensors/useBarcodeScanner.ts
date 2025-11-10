import { useEffect } from 'react'

type BarcodeCallback = (barcode: string) => void

const SCAN_TIMEOUT = 100

export const useBarcodeScanner = (onScan: BarcodeCallback) => {
  useEffect(() => {
    let buffer = ''
    let timeout: ReturnType<typeof setTimeout> | null = null

    const flushBuffer = () => {
      if (!buffer) return
      onScan(buffer)
      buffer = ''
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        flushBuffer()
        return
      }

      if (event.key.length === 1) {
        buffer += event.key
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          flushBuffer()
        }, SCAN_TIMEOUT)
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (timeout) clearTimeout(timeout)
    }
  }, [onScan])
}

